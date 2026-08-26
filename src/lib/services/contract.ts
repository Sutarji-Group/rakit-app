import 'server-only';

import { prisma } from '@/lib/db/prisma';
import { parseJson, stringifyJson } from '@/lib/db/json';
import { buildDocumentNumber, formatDate, formatRupiah } from '@/lib/format';
import { site, DEFAULT_ASSUMPTIONS, DEFAULT_EXCLUSIONS } from '@/lib/site';
import {
  PROJECT_DEPLOYMENT_LABEL,
  PROJECT_PLATFORM_LABEL,
  USER_TIER_LABEL,
  type ContractStatus,
  type FeatureType,
  type ProjectDeployment,
  type ProjectPlatform,
  type UserTier,
} from '@/lib/domain/enums';

/**
 * Kontrak digital (PRD modul I).
 *
 * Prinsip Produk #5 diterapkan sampai ke sini: lampiran Scope of Work bukan
 * dokumen yang ditulis ulang tangan, melainkan diturunkan langsung dari
 * konfigurasi yang dimenangkan. Satu objek data mengalir dari konfigurator →
 * penawaran → kontrak, sehingga tidak mungkin ada fitur yang ada di penawaran
 * tetapi hilang di SOW.
 *
 * Catatan lingkup yang jujur: tanda tangan elektronik (I3) mensyaratkan
 * penyedia lokal seperti Privy atau Digisign yang membutuhkan akun dan
 * perjanjian tersendiri. Yang dibangun di sini adalah pencatatan penandatangan
 * beserta jejak waktunya; signatureMeta disiapkan untuk menampung bukti dari
 * penyedia saat integrasinya dilakukan.
 */

export interface ContractSection {
  heading: string;
  /** Paragraf biasa. */
  paragraphs?: string[];
  /** Daftar berpoin. */
  bullets?: string[];
  /** Tabel dua kolom untuk rincian. */
  rows?: Array<{ label: string; value: string }>;
}

export interface ContractBody {
  sections: ContractSection[];
  /** Lampiran SOW: satu baris per fitur beserta kriteria penerimaannya (I2). */
  scopeOfWork: Array<{
    group: string;
    items: Array<{ name: string; type: FeatureType; acceptance: string }>;
  }>;
}

export interface ContractResult {
  ok: boolean;
  message: string;
  contractId?: string;
}

/**
 * Kriteria penerimaan bawaan per tipe fitur.
 *
 * Ditulis sebagai kalimat yang dapat diperiksa bersama klien saat serah terima,
 * bukan sebagai janji kabur seperti "fitur berfungsi dengan baik" — kalimat
 * seperti itulah yang membuat serah terima berlarut-larut.
 */
function acceptanceCriteria(name: string, type: FeatureType): string {
  switch (type) {
    case 'CORE':
      return `Modul "${name}" dapat diakses sesuai hak akses peran, dan data yang dimasukkan tersimpan serta tampil kembali dengan benar setelah aplikasi ditutup dan dibuka ulang.`;
    case 'STANDARD':
      return `Alur baku "${name}" dapat diselesaikan dari awal sampai akhir oleh pengguna dengan peran yang sesuai, menggunakan data contoh milik klien.`;
    case 'CONFIGURABLE':
      return `Alur "${name}" berjalan sesuai penyesuaian yang disepakati pada sesi discovery, dan penyesuaian tersebut tercatat di berita acara sebelum pengembangan dimulai.`;
    case 'CUSTOM':
      return `"${name}" berjalan sesuai alur langkah demi langkah yang klien tuliskan pada formulir pengajuan dan telah disetujui kedua pihak.`;
  }
}

async function reserveContractNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `KTR-${year}-`;
  const last = await prisma.contract.findFirst({
    where: { number: { startsWith: prefix } },
    orderBy: { number: 'desc' },
    select: { number: true },
  });
  const sequence = last ? Number(last.number.slice(prefix.length)) + 1 : 1;
  return buildDocumentNumber('KTR', year, sequence);
}

/**
 * Menyusun kontrak dari satu lead yang dimenangkan (I1).
 *
 * Harga yang dipakai adalah harga terkunci bila sudah ada, atau override yang
 * telah disetujui, atau batas atas rentang — mengikuti PRD 6.8 butir 5:
 * kuotasi di angka maksimum, rencanakan di angka minimum.
 */
export async function generateContract(
  leadId: string,
  actorId: string,
): Promise<ContractResult> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      contract: { select: { id: true, number: true } },
      configuration: {
        include: {
          category: { select: { name: true } },
          items: {
            orderBy: { sortOrder: 'asc' },
            include: { feature: { select: { group: { select: { name: true } } } } },
          },
          customRequests: true,
          addOns: true,
        },
      },
    },
  });

  if (!lead) return { ok: false, message: 'Lead tidak ditemukan.' };
  if (lead.contract) {
    return {
      ok: true,
      contractId: lead.contract.id,
      message: `Kontrak ${lead.contract.number} sudah pernah dibuat untuk lead ini.`,
    };
  }
  if (lead.stage !== 'WON') {
    return {
      ok: false,
      message:
        'Kontrak hanya dapat dibuat dari lead yang sudah berada di tahap Menang. ' +
        'Pindahkan tahapnya lebih dulu setelah kesepakatan tercapai.',
    };
  }

  const config = lead.configuration;

  const contractValue =
    config.lockedPrice ??
    (lead.overrideStatus === 'APPROVED' ? lead.overridePriceValue : null) ??
    config.totalMax;

  // -- Lampiran SOW, diturunkan dari konfigurasi (I2) ------------------------
  const groups = new Map<string, ContractBody['scopeOfWork'][number]['items']>();
  for (const item of config.items) {
    const group = item.feature?.group.name ?? 'Lainnya';
    const type = item.typeSnapshot as FeatureType;
    groups.set(group, [
      ...(groups.get(group) ?? []),
      { name: item.nameSnapshot, type, acceptance: acceptanceCriteria(item.nameSnapshot, type) },
    ]);
  }
  for (const request of config.customRequests) {
    if (request.status !== 'ESTIMATED' && request.status !== 'PROMOTED') continue;
    groups.set('Fitur Khusus', [
      ...(groups.get('Fitur Khusus') ?? []),
      {
        name: request.name,
        type: 'CUSTOM',
        acceptance: acceptanceCriteria(request.name, 'CUSTOM'),
      },
    ]);
  }

  const scopeOfWork = [...groups.entries()].map(([group, items]) => ({ group, items }));
  const featureCount = scopeOfWork.reduce((sum, g) => sum + g.items.length, 0);

  const startDate = new Date();
  const targetEndDate = new Date(
    startDate.getTime() + config.durationWeeksMax * 7 * 86_400_000,
  );

  const body: ContractBody = {
    scopeOfWork,
    sections: [
      {
        heading: 'Para Pihak',
        rows: [
          { label: 'Pihak Pertama (Penyedia)', value: site.legalName },
          { label: 'Alamat', value: site.address },
          { label: 'Pihak Kedua (Klien)', value: lead.company ?? lead.contactName },
          { label: 'Narahubung', value: `${lead.contactName} · ${lead.email} · ${lead.whatsapp}` },
        ],
      },
      {
        heading: 'Objek Perjanjian',
        paragraphs: [
          `Pihak Pertama membuatkan aplikasi ${config.category.name} untuk Pihak Kedua, ` +
            `dengan ruang lingkup ${featureCount} fitur sebagaimana tercantum lengkap pada ` +
            `Lampiran A — Scope of Work yang merupakan bagian tidak terpisahkan dari perjanjian ini.`,
          'Lampiran A diturunkan langsung dari konfigurasi yang disusun Pihak Kedua di ' +
            'konfigurator, sehingga isinya identik dengan penawaran yang telah disetujui. ' +
            `Nomor penawaran yang menjadi dasar perjanjian ini adalah ${lead.quoteNumber}.`,
        ],
        rows: [
          { label: 'Platform', value: PROJECT_PLATFORM_LABEL[config.platform as ProjectPlatform] },
          {
            label: 'Deployment',
            value: PROJECT_DEPLOYMENT_LABEL[config.deployment as ProjectDeployment],
          },
          { label: 'Jumlah pengguna', value: USER_TIER_LABEL[config.userTier as UserTier] },
        ],
      },
      {
        heading: 'Nilai Pekerjaan dan Cara Pembayaran',
        rows: [
          { label: 'Nilai pekerjaan (belum termasuk PPN)', value: formatRupiah(contractValue) },
          { label: 'Termin 1 — Kickoff', value: `30% · ${formatRupiah(Math.round(contractValue * 0.3))}` },
          { label: 'Termin 2 — Serah terima Fase 1', value: `40% · ${formatRupiah(Math.round(contractValue * 0.4))}` },
          { label: 'Termin 3 — Go-live', value: `30% · ${formatRupiah(Math.round(contractValue * 0.3))}` },
          ...(config.recurringMonthlyMax > 0
            ? [
                {
                  label: 'Biaya berulang bulanan (terpisah dari nilai pekerjaan)',
                  value: `${formatRupiah(config.recurringMonthlyMin)} – ${formatRupiah(config.recurringMonthlyMax)} per bulan`,
                },
              ]
            : []),
        ],
        paragraphs: [
          'Setiap termin ditagihkan setelah milestone yang bersangkutan disetujui Pihak Kedua ' +
            'melalui portal klien, dan jatuh tempo 14 hari kalender sejak invoice diterbitkan.',
          'Biaya berulang tidak dijumlahkan ke nilai pekerjaan dan mulai berjalan setelah ' +
            'aplikasi diserahterimakan.',
        ],
      },
      {
        heading: 'Jangka Waktu',
        rows: [
          { label: 'Mulai', value: formatDate(startDate) },
          { label: 'Target serah terima', value: formatDate(targetEndDate) },
          {
            label: 'Estimasi durasi',
            value: `${config.durationWeeksMin} – ${config.durationWeeksMax} minggu`,
          },
        ],
        paragraphs: [
          'Keterlambatan yang disebabkan tertundanya umpan balik, data, atau persetujuan dari ' +
            'Pihak Kedua memperpanjang target serah terima selama durasi keterlambatan tersebut.',
        ],
      },
      {
        // I4 — klausul perubahan scope yang merujuk mekanisme Change Request.
        heading: 'Perubahan Ruang Lingkup',
        paragraphs: [
          'Pekerjaan di luar Lampiran A merupakan perubahan ruang lingkup dan tidak dikerjakan ' +
            'secara diam-diam. Setiap permintaan tambahan diajukan Pihak Kedua melalui menu ' +
            '"Tambah fitur ke proyek ini" pada portal klien.',
          'Permintaan tersebut menghasilkan keranjang addendum berisi estimasi biaya dan dampak ' +
            'terhadap tanggal serah terima. Dampak tanggal ditampilkan secara eksplisit sebelum ' +
            'Pihak Kedua menyetujui, dan pengerjaan baru dimulai setelah addendum disetujui ' +
            'beserta invoice tambahannya.',
          'Perubahan yang tidak melalui mekanisme ini tidak mengikat Pihak Pertama.',
        ],
      },
      {
        heading: 'Serah Terima dan Garansi',
        paragraphs: [
          'Serah terima dilakukan per milestone melalui portal klien. Setiap item pekerjaan pada ' +
            'Lampiran A dinyatakan selesai bila memenuhi kriteria penerimaan yang tercantum di ' +
            'sebelahnya.',
          'Pihak Pertama memberikan garansi perbaikan bug selama 60 hari kalender sejak serah ' +
            'terima akhir. Garansi mencakup perbaikan fungsi yang tidak berjalan sesuai kriteria ' +
            'penerimaan, dan tidak mencakup permintaan fitur baru.',
        ],
      },
      {
        heading: 'Kewajiban Pihak Kedua',
        bullets: [...DEFAULT_ASSUMPTIONS],
      },
      {
        heading: 'Yang Tidak Termasuk',
        bullets: [...DEFAULT_EXCLUSIONS],
      },
      {
        heading: 'Kerahasiaan, Hak Kekayaan Intelektual, dan Data',
        paragraphs: [
          'Seluruh data operasional yang dimasukkan Pihak Kedua ke dalam aplikasi adalah milik ' +
            'Pihak Kedua sepenuhnya, dan dapat diminta dalam format terbuka kapan saja.',
          'Hak atas kode aplikasi hasil pekerjaan ini beralih kepada Pihak Kedua setelah seluruh ' +
            'kewajiban pembayaran diselesaikan. Modul library milik Pihak Pertama yang dipakai di ' +
            'dalamnya tetap menjadi milik Pihak Pertama, dan Pihak Kedua memperoleh lisensi ' +
            'pemakaian yang tidak dapat dicabut untuk aplikasi ini.',
          'Kedua pihak menjaga kerahasiaan informasi yang diperoleh selama kerja sama, dan ' +
            'kewajiban itu tetap berlaku dua tahun setelah perjanjian berakhir.',
        ],
      },
      {
        heading: 'Hukum yang Berlaku',
        paragraphs: [
          'Perjanjian ini tunduk pada hukum Republik Indonesia. Perselisihan diselesaikan secara ' +
            'musyawarah, dan bila tidak tercapai kesepakatan diselesaikan melalui Pengadilan ' +
            'Negeri Jakarta Selatan.',
        ],
      },
    ],
  };

  const number = await reserveContractNumber();

  const contract = await prisma.contract.create({
    data: {
      number,
      leadId,
      status: 'DRAFT',
      body: stringifyJson(body),
      totalValue: contractValue,
    },
  });

  await prisma.$transaction([
    prisma.leadActivity.create({
      data: {
        leadId,
        userId: actorId,
        kind: 'SYSTEM',
        body:
          `Kontrak ${number} dibuat dari penawaran ${lead.quoteNumber}, ` +
          `nilai ${formatRupiah(contractValue)}. Lampiran SOW memuat ${featureCount} fitur.`,
      },
    }),
    prisma.auditLog.create({
      data: {
        userId: actorId,
        entity: 'Contract',
        entityId: contract.id,
        action: 'CONTRACT_GENERATED',
        summary: `Kontrak ${number} dibuat dari lead ${lead.quoteNumber}.`,
        after: stringifyJson({ number, contractValue, featureCount }),
      },
    }),
  ]);

  return { ok: true, contractId: contract.id, message: `Kontrak ${number} dibuat.` };
}

export async function listContracts() {
  return prisma.contract.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      lead: {
        select: {
          quoteNumber: true,
          contactName: true,
          company: true,
          configuration: { select: { category: { select: { shortName: true } } } },
        },
      },
    },
  });
}

export async function getContract(contractId: string) {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: {
      lead: {
        select: {
          id: true,
          quoteNumber: true,
          contactName: true,
          company: true,
          email: true,
          configuration: { select: { publicToken: true, name: true } },
        },
      },
    },
  });
  if (!contract) return null;
  return {
    ...contract,
    parsedBody: parseJson<ContractBody>(contract.body, { sections: [], scopeOfWork: [] }),
  };
}

export async function updateContractStatus(
  contractId: string,
  status: ContractStatus,
  actorId: string,
): Promise<ContractResult> {
  const contract = await prisma.contract.findUnique({ where: { id: contractId } });
  if (!contract) return { ok: false, message: 'Kontrak tidak ditemukan.' };

  await prisma.$transaction([
    prisma.contract.update({ where: { id: contractId }, data: { status } }),
    prisma.auditLog.create({
      data: {
        userId: actorId,
        entity: 'Contract',
        entityId: contractId,
        action: 'CONTRACT_STATUS',
        summary: `Status kontrak ${contract.number} diubah menjadi ${status}.`,
      },
    }),
  ]);

  return { ok: true, message: `Status kontrak ${contract.number} diperbarui.` };
}

export interface SignContractInput {
  contractId: string;
  signerName: string;
  signerEmail: string;
  actorId: string;
}

/**
 * Mencatat penandatanganan kontrak (I3).
 *
 * Belum tersambung ke penyedia tanda tangan elektronik lokal. Yang tercatat di
 * sini adalah nama, email, waktu, dan pelaku pencatatannya; kolom signatureMeta
 * disiapkan untuk menampung bukti dari penyedia saat integrasi dilakukan,
 * sehingga alur di sekitarnya tidak perlu berubah.
 */
export async function signContract(input: SignContractInput): Promise<ContractResult> {
  const contract = await prisma.contract.findUnique({ where: { id: input.contractId } });
  if (!contract) return { ok: false, message: 'Kontrak tidak ditemukan.' };
  if (contract.status === 'SIGNED') {
    return { ok: false, message: 'Kontrak ini sudah ditandatangani.' };
  }
  if (contract.status === 'CANCELLED') {
    return { ok: false, message: 'Kontrak ini sudah dibatalkan.' };
  }

  const signedAt = new Date();

  await prisma.$transaction([
    prisma.contract.update({
      where: { id: input.contractId },
      data: {
        status: 'SIGNED',
        signedAt,
        signerName: input.signerName,
        signerEmail: input.signerEmail,
        signatureMeta: stringifyJson({
          method: 'PENCATATAN_MANUAL',
          note:
            'Dicatat oleh tim internal. Belum memakai penyedia tanda tangan elektronik; ' +
            'bukti dari penyedia akan disimpan di kolom ini setelah integrasi tersedia.',
          recordedBy: input.actorId,
          recordedAt: signedAt.toISOString(),
        }),
      },
    }),
    prisma.auditLog.create({
      data: {
        userId: input.actorId,
        entity: 'Contract',
        entityId: input.contractId,
        action: 'CONTRACT_SIGNED',
        summary:
          `Kontrak ${contract.number} ditandatangani oleh ${input.signerName} ` +
          `(${input.signerEmail}).`,
      },
    }),
  ]);

  return { ok: true, message: `Kontrak ${contract.number} ditandai sudah ditandatangani.` };
}
