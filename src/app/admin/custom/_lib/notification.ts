import 'server-only';

import type { CurrentUser } from '@/lib/auth/session';
import { stringifyJson } from '@/lib/db/json';
import { prisma } from '@/lib/db/prisma';
import { USER_ROLE_LABEL, type CustomRequestStatus } from '@/lib/domain/enums';
import { formatManDay, formatRupiahRange } from '@/lib/format';
import { site } from '@/lib/site';

/**
 * Notifikasi hasil review fitur custom ke klien (N6).
 *
 * Platform ini belum punya layanan email atau WhatsApp gateway, dan berpura-pura
 * "email terkirim" adalah kebohongan yang paling mahal di antrean review: tim
 * mengira klien sudah tahu, klien menunggu kabar yang tidak pernah datang, lalu
 * SLA 1×24 jam (BR-04) tampak terpenuhi di papan padahal tidak. Karena itu modul
 * ini hanya melakukan dua hal jujur: MENCATAT niat pengiriman ke AuditLog agar
 * jejaknya dapat ditelusuri, dan menyiapkan pesan + tautan lengkap yang disalin
 * lalu dikirim manual oleh reviewer.
 *
 * Modul ini tinggal di dalam direktori modul antrean custom, bukan di
 * src/lib/services, karena ia adalah bagian dari alur kerja papan admin ini
 * saja — belum ada pemakai lain yang membenarkan promosinya menjadi service
 * lintas modul.
 */

export type ClientNotificationKind =
  | 'ESTIMATE_READY'
  | 'CONSULT_REQUIRED'
  | 'CLARIFICATION'
  | 'REJECTED';

export interface ClientNotification {
  kind: ClientNotificationKind;
  /** Judul singkat untuk kartu "salin tautan" di UI. */
  title: string;
  /** Penjelasan apa yang perlu dilakukan reviewer setelah menyalin. */
  hint: string;
  /** Tautan konfigurasi klien yang sudah lengkap dan siap dibuka siapa pun. */
  link: string;
  /** Pesan siap salin — sudah berisi tautan di baris terakhir. */
  message: string;
}

export interface NotificationSubject {
  requestName: string;
  status: CustomRequestStatus;
  configurationName: string;
  configurationToken: string;
  contactName: string | null;
  manDayMin: number | null;
  manDayMax: number | null;
  unitPriceMin: number | null;
  unitPriceMax: number | null;
  clarificationQuestion: string | null;
  rejectReason: string | null;
}

/**
 * Tautan ringkasan rakitan klien.
 *
 * Sengaja mengarah ke halaman ringkasan, bukan ke konfigurator: yang perlu
 * dilihat klien setelah estimasi selesai adalah angka totalnya yang sudah
 * bergerak, bukan daftar fitur yang bisa ia ubah lagi.
 */
export function buildConfigurationLink(token: string): string {
  return `${site.url}/rakit/${token}/ringkasan`;
}

const KIND_BY_STATUS: Partial<Record<CustomRequestStatus, ClientNotificationKind>> = {
  ESTIMATED: 'ESTIMATE_READY',
  CONSULT_REQUIRED: 'CONSULT_REQUIRED',
  NEEDS_CLARIFICATION: 'CLARIFICATION',
  REJECTED: 'REJECTED',
};

/**
 * Menyusun pesan yang siap disalin. Fungsi murni supaya halaman detail dapat
 * menampilkan kartu salinan tanpa menulis apa pun ke basis data.
 */
export function buildClientNotification(
  subject: NotificationSubject,
): ClientNotification | null {
  const kind = KIND_BY_STATUS[subject.status];
  if (!kind) return null;

  const link = buildConfigurationLink(subject.configurationToken);
  const greeting = `Halo ${subject.contactName?.trim() || 'Bapak/Ibu'},`;
  const subjectLine = `fitur khusus "${subject.requestName}" pada rakitan "${subject.configurationName}"`;

  if (kind === 'ESTIMATE_READY') {
    const price =
      subject.unitPriceMin !== null && subject.unitPriceMax !== null
        ? formatRupiahRange(subject.unitPriceMin, subject.unitPriceMax, false)
        : null;
    const effort =
      subject.manDayMin !== null && subject.manDayMax !== null
        ? `${formatManDay(subject.manDayMin)} – ${formatManDay(subject.manDayMax)} kerja tim`
        : null;

    return {
      kind,
      title: 'Estimasi selesai — kabari klien',
      hint: 'Salin pesan atau tautannya, lalu kirim lewat WhatsApp/email yang biasa Anda pakai dengan klien ini.',
      link,
      message: [
        greeting,
        `estimasi untuk ${subjectLine} sudah selesai kami tinjau.`,
        price ? `Perkiraan biayanya ${price}${effort ? ` (${effort})` : ''}.` : '',
        'Total rakitan Anda sudah kami perbarui dan bisa dilihat di tautan berikut:',
        link,
      ]
        .filter(Boolean)
        .join('\n'),
    };
  }

  if (kind === 'CONSULT_REQUIRED') {
    return {
      kind,
      title: 'Perlu sesi konsultasi — kabari klien',
      hint: 'Sistem sengaja tidak mengirim angka untuk kebutuhan sebesar ini (D7). Ajak klien bicara 30 menit lebih dulu.',
      link,
      message: [
        greeting,
        `kami sudah meninjau ${subjectLine}.`,
        'Kebutuhannya cukup besar, dan memberi angka tanpa membahasnya lebih dulu justru berisiko meleset jauh untuk kedua pihak.',
        'Kami usulkan sesi 30 menit untuk membedah alurnya, baru setelah itu kami kunci angkanya.',
        'Rincian rakitan Anda saat ini ada di:',
        link,
      ].join('\n'),
    };
  }

  if (kind === 'CLARIFICATION') {
    return {
      kind,
      title: 'Pertanyaan klarifikasi — kirim ke klien',
      hint: 'Tenggat SLA berjalan lagi setelah klien menjawab. Kirim pertanyaannya hari ini juga.',
      link,
      message: [
        greeting,
        `sebelum kami bisa memberi angka untuk ${subjectLine}, ada satu hal yang perlu kami pastikan:`,
        subject.clarificationQuestion?.trim() || '(pertanyaan belum diisi)',
        'Rakitan Anda tetap tersimpan di:',
        link,
      ].join('\n'),
    };
  }

  return {
    kind,
    title: 'Permintaan ditolak — sampaikan alasannya',
    hint: 'Alasan yang jelas menjaga kepercayaan. Sampaikan juga alternatif bila ada.',
    link,
    message: [
      greeting,
      `setelah kami tinjau, ${subjectLine} belum dapat kami kerjakan.`,
      subject.rejectReason?.trim() || '(alasan belum diisi)',
      'Fitur ini sudah kami keluarkan dari perhitungan, sehingga total rakitan Anda berubah:',
      link,
    ].join('\n'),
  };
}

/**
 * Mencatat bahwa klien perlu dikabari, lalu mengembalikan bahan salinannya.
 *
 * Catatan masuk ke AuditLog (persyaratan non-fungsional "Audit") sehingga bila
 * kelak klien mengaku tidak pernah dikabari, jejaknya dapat ditelusuri beserta
 * pelakunya. console.info dipakai agar pada pengembangan lokal isi pesannya
 * tetap terlihat tanpa membuka basis data.
 */
export async function recordClientNotification(
  requestId: string,
  actor: CurrentUser,
): Promise<ClientNotification | null> {
  const request = await prisma.customFeatureRequest.findUnique({
    where: { id: requestId },
    select: {
      name: true,
      status: true,
      manDayMin: true,
      manDayMax: true,
      unitPriceMin: true,
      unitPriceMax: true,
      clarificationQuestion: true,
      rejectReason: true,
      configuration: {
        select: {
          name: true,
          publicToken: true,
          lead: { select: { contactName: true } },
          owner: { select: { name: true } },
        },
      },
    },
  });
  if (!request) return null;

  const notification = buildClientNotification({
    requestName: request.name,
    status: request.status as CustomRequestStatus,
    configurationName: request.configuration.name,
    configurationToken: request.configuration.publicToken,
    contactName: request.configuration.lead?.contactName ?? request.configuration.owner?.name ?? null,
    manDayMin: request.manDayMin,
    manDayMax: request.manDayMax,
    unitPriceMin: request.unitPriceMin,
    unitPriceMax: request.unitPriceMax,
    clarificationQuestion: request.clarificationQuestion,
    rejectReason: request.rejectReason,
  });
  if (!notification) return null;

  await prisma.auditLog.create({
    data: {
      userId: actor.id,
      actorLabel: `${actor.name} · ${USER_ROLE_LABEL[actor.role]}`,
      entity: 'CustomFeatureRequest',
      entityId: requestId,
      action: 'NOTIFY_CLIENT_PENDING',
      summary:
        `Klien perlu dikabari soal "${request.name}" (${notification.title}). ` +
        'Pengiriman dilakukan manual — platform belum memiliki kanal pengiriman otomatis.',
      after: stringifyJson({
        kind: notification.kind,
        link: notification.link,
        message: notification.message,
      }),
    },
  });

  console.info(
    `[notifikasi klien] ${notification.kind} · permintaan ${requestId}\n${notification.message}`,
  );

  return notification;
}

/** Riwayat notifikasi yang sudah disiapkan untuk satu permintaan. */
export async function listNotificationLog(requestId: string, limit = 5) {
  return prisma.auditLog.findMany({
    where: {
      entity: 'CustomFeatureRequest',
      entityId: requestId,
      action: 'NOTIFY_CLIENT_PENDING',
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: { id: true, actorLabel: true, summary: true, createdAt: true },
  });
}
