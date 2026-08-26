import 'server-only';

import { prisma } from '@/lib/db/prisma';
import { stringifyJson } from '@/lib/db/json';
import type { InvoiceStatus, PaymentMethod } from '@/lib/domain/enums';

/**
 * Penagihan dan pencatatan pembayaran (PRD modul H).
 *
 * Catatan lingkup yang jujur: PRD H1 menyebut pembayaran uang muka lewat
 * payment gateway (Midtrans/Xendit), tetapi penyedia mana yang dipakai masih
 * pertanyaan terbuka PRD #6 dan integrasinya membutuhkan akun sungguhan. Yang
 * dibangun di sini adalah jalur yang tidak bergantung pada pihak ketiga:
 * transfer manual dengan konfirmasi unggah bukti (H2), penomoran invoice
 * berurutan dengan PPN (H3), termin mengikuti milestone (H4), dan penandaan
 * invoice jatuh tempo (H5).
 *
 * Titik sambungan gateway nanti cukup memanggil recordPayment() dari webhook
 * penyedia dengan method VA/QRIS/EWALLET — sisa alurnya tidak berubah.
 */

export interface BillingResult {
  ok: boolean;
  message: string;
}

/** Menyegarkan status invoice dari jumlah yang benar-benar diterima. */
async function refreshInvoiceStatus(invoiceId: string): Promise<void> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { payments: { where: { status: 'SETTLED' } } },
  });
  if (!invoice) return;

  const paidAmount = invoice.payments.reduce((sum, payment) => sum + payment.amount, 0);

  let status: InvoiceStatus;
  if (paidAmount >= invoice.total) status = 'PAID';
  else if (paidAmount > 0) status = 'PARTIALLY_PAID';
  else if (invoice.status === 'DRAFT') status = 'DRAFT';
  else status = invoice.dueAt < new Date() ? 'OVERDUE' : 'SENT';

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      paidAmount,
      status,
      paidAt: status === 'PAID' ? (invoice.paidAt ?? new Date()) : null,
    },
  });
}

export interface RecordPaymentInput {
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  proofUrl?: string;
  /** true bila pencatat berwenang langsung memverifikasi (mis. tim finance). */
  verified: boolean;
  actorId: string;
}

/**
 * Mencatat satu pembayaran atas sebuah invoice (H1, H2).
 *
 * Transfer manual masuk berstatus menunggu verifikasi sampai bukti diperiksa;
 * pembayaran yang terverifikasi langsung mengurangi sisa tagihan. Pemisahan itu
 * penting karena bukti transfer yang diunggah klien belum tentu benar, dan
 * invoice yang terlanjur ditandai lunas sulit dikoreksi tanpa jejak.
 */
export async function recordPayment(input: RecordPaymentInput): Promise<BillingResult> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: input.invoiceId },
    include: { payments: { where: { status: 'SETTLED' } } },
  });
  if (!invoice) return { ok: false, message: 'Invoice tidak ditemukan.' };
  if (invoice.status === 'CANCELLED') {
    return { ok: false, message: 'Invoice ini sudah dibatalkan.' };
  }
  if (input.amount <= 0) {
    return { ok: false, message: 'Nominal pembayaran harus lebih besar dari nol.' };
  }

  const alreadyPaid = invoice.payments.reduce((sum, payment) => sum + payment.amount, 0);
  const remaining = invoice.total - alreadyPaid;
  if (input.verified && input.amount > remaining) {
    return {
      ok: false,
      message:
        `Nominal melebihi sisa tagihan ${remaining.toLocaleString('id-ID')}. ` +
        'Periksa kembali angkanya sebelum diverifikasi.',
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        invoiceId: input.invoiceId,
        amount: input.amount,
        method: input.method,
        status: input.verified ? 'SETTLED' : 'AWAITING_VERIFICATION',
        reference: input.reference ?? null,
        proofUrl: input.proofUrl ?? null,
        paidAt: new Date(),
        verifiedAt: input.verified ? new Date() : null,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: input.actorId,
        entity: 'Invoice',
        entityId: input.invoiceId,
        action: input.verified ? 'PAYMENT_VERIFIED' : 'PAYMENT_RECORDED',
        summary:
          `Pembayaran ${input.amount.toLocaleString('id-ID')} dicatat pada invoice ` +
          `${invoice.number} lewat ${input.method}.`,
        after: stringifyJson({
          amount: input.amount,
          method: input.method,
          reference: input.reference,
          verified: input.verified,
        }),
      },
    });
  });

  if (input.verified) await refreshInvoiceStatus(input.invoiceId);

  return {
    ok: true,
    message: input.verified
      ? 'Pembayaran tercatat dan invoice diperbarui.'
      : 'Pembayaran tercatat dan menunggu verifikasi bukti.',
  };
}

/** Memverifikasi bukti transfer yang sebelumnya menunggu pemeriksaan (H2). */
export async function verifyPayment(
  paymentId: string,
  actorId: string,
  approve: boolean,
): Promise<BillingResult> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { invoice: { select: { number: true } } },
  });
  if (!payment) return { ok: false, message: 'Pembayaran tidak ditemukan.' };
  if (payment.status !== 'AWAITING_VERIFICATION') {
    return { ok: false, message: 'Pembayaran ini tidak sedang menunggu verifikasi.' };
  }

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: approve ? 'SETTLED' : 'FAILED',
        verifiedAt: new Date(),
      },
    }),
    prisma.auditLog.create({
      data: {
        userId: actorId,
        entity: 'Payment',
        entityId: paymentId,
        action: approve ? 'PAYMENT_VERIFIED' : 'PAYMENT_REJECTED',
        summary:
          `Bukti pembayaran ${payment.amount.toLocaleString('id-ID')} pada invoice ` +
          `${payment.invoice.number} ${approve ? 'diverifikasi' : 'ditolak'}.`,
      },
    }),
  ]);

  await refreshInvoiceStatus(payment.invoiceId);
  return {
    ok: true,
    message: approve ? 'Bukti pembayaran diverifikasi.' : 'Bukti pembayaran ditolak.',
  };
}

/** Menerbitkan invoice draft sehingga menjadi tagihan berjalan. */
export async function sendInvoice(invoiceId: string, actorId: string): Promise<BillingResult> {
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) return { ok: false, message: 'Invoice tidak ditemukan.' };
  if (invoice.status !== 'DRAFT') {
    return { ok: false, message: 'Hanya invoice berstatus draft yang dapat diterbitkan.' };
  }

  await prisma.$transaction([
    prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: 'SENT', issuedAt: new Date() },
    }),
    prisma.auditLog.create({
      data: {
        userId: actorId,
        entity: 'Invoice',
        entityId: invoiceId,
        action: 'INVOICE_SENT',
        summary: `Invoice ${invoice.number} diterbitkan ke klien.`,
      },
    }),
  ]);

  return { ok: true, message: `Invoice ${invoice.number} diterbitkan.` };
}

export interface InvoiceBoardRow {
  id: string;
  number: string;
  status: InvoiceStatus;
  kind: string;
  total: number;
  paidAmount: number;
  remaining: number;
  dueAt: Date;
  /** Negatif berarti sudah lewat jatuh tempo. */
  daysUntilDue: number;
  isOverdue: boolean;
  projectId: string;
  projectName: string;
  clientName: string;
  milestoneName: string | null;
  pendingVerificationCount: number;
}

/**
 * Papan tagihan lintas proyek.
 *
 * Invoice jatuh tempo ditandai di sini (H5). Pengiriman pengingat otomatis
 * membutuhkan layanan email yang belum tersambung, jadi yang disediakan adalah
 * daftar yang dapat ditindaklanjuti manusia — bukan janji pengingat yang
 * sebenarnya tidak pernah terkirim.
 */
export async function listInvoiceBoard(): Promise<InvoiceBoardRow[]> {
  const invoices = await prisma.invoice.findMany({
    orderBy: [{ status: 'asc' }, { dueAt: 'asc' }],
    include: {
      milestone: { select: { name: true } },
      project: {
        select: {
          id: true,
          name: true,
          client: { select: { name: true, company: true } },
        },
      },
      payments: { select: { status: true } },
    },
  });

  const now = Date.now();

  return invoices.map((invoice) => {
    const remaining = Math.max(0, invoice.total - invoice.paidAmount);
    const daysUntilDue = Math.ceil((invoice.dueAt.getTime() - now) / 86_400_000);
    return {
      id: invoice.id,
      number: invoice.number,
      status: invoice.status as InvoiceStatus,
      kind: invoice.kind,
      total: invoice.total,
      paidAmount: invoice.paidAmount,
      remaining,
      dueAt: invoice.dueAt,
      daysUntilDue,
      isOverdue: remaining > 0 && daysUntilDue < 0 && invoice.status !== 'DRAFT',
      projectId: invoice.project.id,
      projectName: invoice.project.name,
      clientName:
        invoice.project.client?.company ?? invoice.project.client?.name ?? 'Klien belum ditautkan',
      milestoneName: invoice.milestone?.name ?? null,
      pendingVerificationCount: invoice.payments.filter(
        (payment) => payment.status === 'AWAITING_VERIFICATION',
      ).length,
    };
  });
}

export async function getInvoiceDetail(invoiceId: string) {
  return prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      milestone: true,
      payments: { orderBy: { createdAt: 'desc' } },
      project: {
        select: {
          id: true,
          code: true,
          name: true,
          contractValue: true,
          client: { select: { name: true, company: true, email: true } },
        },
      },
    },
  });
}
