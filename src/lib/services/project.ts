import 'server-only';

import { prisma } from '@/lib/db/prisma';
import { stringifyJson } from '@/lib/db/json';
import { buildDocumentNumber } from '@/lib/format';
import {
  COUNTED_CUSTOM_STATUSES,
  CUSTOM_REQUEST_STATUSES,
  DOCUMENT_KINDS,
  TASK_STATUSES,
  TASK_STATUS_LABEL,
  TASK_STATUS_WEIGHT,
  coerceEnum,
  type DocumentKind,
  type InvoiceKind,
  type MilestoneStatus,
  type TaskStatus,
} from '@/lib/domain/enums';

/**
 * Logika sisi server modul Proyek & Milestone (PRD modul P).
 *
 * Satu gagasan menjadi dasar seluruh berkas ini: konfigurasi ADALAH Scope of
 * Work (Prinsip Produk #5). Tidak ada penulisan ulang scope secara manual —
 * setiap fitur pada rakitan yang dimenangkan berubah menjadi satu item
 * pekerjaan, dan estimasi man-day-nya diambil dari snapshot konfigurasi
 * sehingga papan pekerjaan, penawaran, dan portal klien membaca daftar yang
 * sama persis.
 */

const DAY_MS = 86_400_000;
/** PPN mengikuti kebiasaan invoice proyek (H4), sama dengan modul portal. */
const TAX_PCT = 11;
const INVOICE_DUE_DAYS = 14;
/** Dipakai bila konfigurasi belum menyimpan proyeksi durasi. */
const DEFAULT_DURATION_WEEKS = 8;

/**
 * Fase pekerjaan.
 *
 * Urutannya bukan selera: fitur Core adalah fondasi yang harus berdiri lebih
 * dulu (BR-01), modul operasional menumpang di atasnya, dan fitur custom
 * dikerjakan terakhir karena paling berisiko dan paling bergantung pada modul
 * lain. Termin 30/40/30 di bawah mengikuti pembagian yang sama.
 */
const PHASE_FOUNDATION = 'Fase 1 — Fondasi';
const PHASE_OPERATION = 'Fase 2 — Modul Operasional';
const PHASE_HANDOVER = 'Fase 3 — Custom & Serah Terima';

const PROJECT_PHASES = [PHASE_FOUNDATION, PHASE_OPERATION, PHASE_HANDOVER] as const;

function phaseForType(typeSnapshot: string): string {
  if (typeSnapshot === 'CORE') return PHASE_FOUNDATION;
  if (typeSnapshot === 'CUSTOM') return PHASE_HANDOVER;
  return PHASE_OPERATION;
}

function phaseRank(phase: string): number {
  const index = PROJECT_PHASES.indexOf(phase as (typeof PROJECT_PHASES)[number]);
  return index === -1 ? PROJECT_PHASES.length : index;
}

/** Termin bawaan 30/40/30 beserta invoice draft-nya (P1, H4). */
interface TermTemplate {
  name: string;
  description: string;
  percentage: number;
  kind: InvoiceKind;
  /** Posisi jatuh tempo sebagai porsi durasi proyek: 0 = kickoff, 1 = akhir. */
  schedule: number;
}

const DEFAULT_TERMS: TermTemplate[] = [
  {
    name: 'Kickoff & Uang Muka',
    description:
      'Penyelarasan proses, penetapan kriteria penerimaan, dan pembayaran uang muka sebelum pengerjaan dimulai.',
    percentage: 30,
    kind: 'DOWN_PAYMENT',
    schedule: 0,
  },
  {
    name: 'Serah Terima Fase 1',
    description:
      'Modul fondasi dan modul operasional utama sudah dapat diuji klien di lingkungan staging.',
    percentage: 40,
    kind: 'MILESTONE',
    schedule: 0.5,
  },
  {
    name: 'Go-Live & Serah Terima Akhir',
    description:
      'Seluruh item pekerjaan disetujui, aplikasi berjalan di lingkungan produksi, dan tim klien sudah dilatih.',
    percentage: 30,
    kind: 'MILESTONE',
    schedule: 1,
  },
];

/**
 * Hasil seragam seluruh fungsi mutasi modul ini.
 *
 * Penolakan aturan bisnis dikembalikan sebagai data biasa, bukan exception,
 * agar pemanggil di lapisan Server Action dapat menampilkannya sebagai pesan
 * tanpa kehilangan isian form pengguna.
 */
export interface ProjectServiceResult {
  ok: boolean;
  message: string;
  projectId?: string;
  code?: string;
}

function fail(message: string): ProjectServiceResult {
  return { ok: false, message };
}

function done(message: string, extra?: Omit<ProjectServiceResult, 'ok' | 'message'>): ProjectServiceResult {
  return { ok: true, message, ...extra };
}

// ---------------------------------------------------------------------------
// Penomoran dokumen
// ---------------------------------------------------------------------------

/**
 * Memesan nomor berurutan yang benar-benar bebas.
 *
 * Sengaja tidak memakai "ambil nomor terbesar lalu tambah satu": data contoh
 * dan data lama bisa memakai lebar digit berbeda (PRJ-2026-001 vs
 * PRJ-2026-0001) sehingga urutan string menipu. Kandidat karena itu dinaikkan
 * sampai menemukan nomor yang belum terpakai.
 */
function nextFreeNumber(prefixCode: string, year: number, taken: Set<string>, startAt: number): string {
  let sequence = Math.max(1, startAt);
  for (let guard = 0; guard < 10_000; guard += 1) {
    const candidate = buildDocumentNumber(prefixCode, year, sequence);
    if (!taken.has(candidate)) {
      taken.add(candidate);
      return candidate;
    }
    sequence += 1;
  }
  throw new Error(`Nomor ${prefixCode} tidak dapat dipesan.`);
}

async function reserveProjectCode(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PRJ-${year}-`;
  const rows = await prisma.project.findMany({
    where: { code: { startsWith: prefix } },
    select: { code: true },
  });
  return nextFreeNumber('PRJ', year, new Set(rows.map((row) => row.code)), rows.length + 1);
}

async function reserveInvoiceNumbers(count: number): Promise<string[]> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const rows = await prisma.invoice.findMany({
    where: { number: { startsWith: prefix } },
    select: { number: true },
  });
  const taken = new Set(rows.map((row) => row.number));
  const numbers: string[] = [];
  for (let index = 0; index < count; index += 1) {
    numbers.push(nextFreeNumber('INV', year, taken, rows.length + 1 + index));
  }
  return numbers;
}

function invoiceAmounts(subtotal: number): { subtotal: number; taxAmount: number; total: number } {
  const taxAmount = Math.round((subtotal * TAX_PCT) / 100);
  return { subtotal, taxAmount, total: subtotal + taxAmount };
}

// ---------------------------------------------------------------------------
// P1 — Konversi konfigurasi yang dimenangkan menjadi proyek
// ---------------------------------------------------------------------------

export interface ConvertToProjectInput {
  leadId: string;
  actorId: string;
  /** Nama proyek; bila kosong disusun dari nama klien dan kategori aplikasi. */
  name?: string;
  /** Project Manager penanggung jawab; bawaannya pengguna yang mengonversi. */
  managerId?: string | null;
  startDate?: Date;
}

/**
 * Mengubah lead bertahap MENANG menjadi proyek dengan satu klik (P1).
 *
 * Setiap fitur pada konfigurasi menjadi satu ProjectTask lengkap dengan
 * estimasi man-day dari snapshot — bukan angka baru yang diketik ulang PM.
 * Fitur custom ikut menjadi item pekerjaan hanya bila sudah diestimasi
 * manusia (BR-02); yang masih menunggu estimasi belum termasuk ruang lingkup
 * yang dijual, jadi tidak boleh muncul sebagai pekerjaan yang dijanjikan.
 */
export async function convertConfigurationToProject(
  input: ConvertToProjectInput,
): Promise<ProjectServiceResult> {
  const lead = await prisma.lead.findUnique({
    where: { id: input.leadId },
    include: {
      project: { select: { code: true } },
      configuration: {
        include: {
          category: { select: { name: true, shortName: true } },
          items: { orderBy: { sortOrder: 'asc' } },
          customRequests: true,
        },
      },
    },
  });

  if (!lead) return fail('Lead tidak ditemukan.');
  if (lead.stage !== 'WON') {
    return fail('Hanya lead yang sudah bertahap Menang yang dapat dijadikan proyek.');
  }
  if (lead.project) {
    return fail(`Lead ini sudah dikonversi menjadi proyek ${lead.project.code}.`);
  }

  const configuration = lead.configuration;
  const existing = await prisma.project.findUnique({
    where: { configurationId: configuration.id },
    select: { code: true },
  });
  if (existing) return fail(`Konfigurasi ini sudah menjadi proyek ${existing.code}.`);

  // Fitur custom yang belum diestimasi tidak pernah masuk total (BR-02),
  // karena itu juga tidak boleh menjadi item pekerjaan.
  const estimatedCustom = configuration.customRequests.filter((request) =>
    COUNTED_CUSTOM_STATUSES.includes(
      coerceEnum(request.status, CUSTOM_REQUEST_STATUSES, 'PENDING'),
    ),
  );

  if (configuration.items.length === 0 && estimatedCustom.length === 0) {
    return fail('Konfigurasi ini tidak memuat satu pun fitur, jadi belum ada yang bisa dikerjakan.');
  }

  // Nilai kontrak mengikuti angka yang benar-benar disepakati: override yang
  // sudah disetujui (BR-16) lebih dulu, lalu harga terkunci (BR-11), baru
  // batas atas penawaran.
  const contractValue =
    lead.overrideStatus === 'APPROVED' && lead.overridePriceValue
      ? lead.overridePriceValue
      : (configuration.lockedPrice ?? configuration.totalMax);

  // Klien portal: pemilik konfigurasi bila ada, kalau tidak pengguna dengan
  // email yang sama dengan kontak lead. Tanpa ini portal klien (J) tidak
  // menemukan proyeknya.
  const clientId =
    configuration.ownerId ??
    (
      await prisma.user.findUnique({ where: { email: lead.email }, select: { id: true } })
    )?.id ??
    null;

  const startDate = input.startDate ?? new Date();
  const durationWeeks =
    configuration.durationWeeksMax > 0 ? configuration.durationWeeksMax : DEFAULT_DURATION_WEEKS;
  const targetEndDate = new Date(startDate.getTime() + durationWeeks * 7 * DAY_MS);

  const projectName =
    input.name?.trim() ||
    `${configuration.category.shortName} ${lead.company?.trim() || lead.contactName}`;

  const featureTasks = configuration.items.map((item) => ({
    featureId: item.featureId,
    customRequestId: null as string | null,
    title: item.nameSnapshot,
    phase: phaseForType(item.typeSnapshot),
    estimateManDayMin: item.manDayMin,
    estimateManDayMax: item.manDayMax,
    sortOrder: item.sortOrder,
  }));

  const customTasks = estimatedCustom.map((request, index) => ({
    featureId: null as string | null,
    customRequestId: request.id,
    title: request.name,
    phase: PHASE_HANDOVER,
    estimateManDayMin: request.manDayMin ?? 0,
    estimateManDayMax: request.manDayMax ?? request.manDayMin ?? 0,
    sortOrder: configuration.items.length + index,
  }));

  const tasks = [...featureTasks, ...customTasks]
    .sort((a, b) => phaseRank(a.phase) - phaseRank(b.phase) || a.sortOrder - b.sortOrder)
    .map((task, index) => ({ ...task, sortOrder: index }));

  const invoiceNumbers = await reserveInvoiceNumbers(DEFAULT_TERMS.length);
  const code = await reserveProjectCode();

  try {
    const project = await prisma.$transaction(async (tx) => {
      const created = await tx.project.create({
        data: {
          code,
          name: projectName,
          configurationId: configuration.id,
          leadId: lead.id,
          clientId,
          managerId: input.managerId ?? input.actorId,
          status: 'PLANNING',
          startDate,
          targetEndDate,
          contractValue,
        },
      });

      await tx.projectTask.createMany({
        data: tasks.map((task) => ({ ...task, projectId: created.id })),
      });

      // Pembulatan termin dikumpulkan di termin terakhir agar jumlah seluruh
      // invoice persis sama dengan nilai kontrak.
      let allocated = 0;
      for (const [index, term] of DEFAULT_TERMS.entries()) {
        const isLast = index === DEFAULT_TERMS.length - 1;
        const amount = isLast
          ? contractValue - allocated
          : Math.round((contractValue * term.percentage) / 100);
        allocated += amount;

        const dueDate = new Date(startDate.getTime() + term.schedule * durationWeeks * 7 * DAY_MS);
        const milestone = await tx.milestone.create({
          data: {
            projectId: created.id,
            name: term.name,
            description: term.description,
            sortOrder: index,
            percentage: term.percentage,
            amount,
            dueDate,
            status: index === 0 ? 'IN_PROGRESS' : 'PENDING',
          },
        });

        const amounts = invoiceAmounts(amount);
        await tx.invoice.create({
          data: {
            number: invoiceNumbers[index],
            projectId: created.id,
            milestoneId: milestone.id,
            kind: term.kind,
            // Invoice lahir sebagai draft: penerbitan tetap keputusan manusia
            // setelah milestone-nya benar-benar disetujui klien.
            status: 'DRAFT',
            subtotal: amounts.subtotal,
            taxPct: TAX_PCT,
            taxAmount: amounts.taxAmount,
            total: amounts.total,
            issuedAt: dueDate,
            dueAt: new Date(dueDate.getTime() + INVOICE_DUE_DAYS * DAY_MS),
          },
        });
      }

      await tx.configuration.update({
        where: { id: configuration.id },
        data: { status: 'CONVERTED' },
      });

      await tx.leadActivity.create({
        data: {
          leadId: lead.id,
          userId: input.actorId,
          kind: 'SYSTEM',
          body:
            `Lead dikonversi menjadi proyek ${code} — ${tasks.length} item pekerjaan ` +
            `dibuat dari konfigurasi, termin 30/40/30 beserta invoice draft-nya menyusul.`,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: input.actorId,
          entity: 'Project',
          entityId: created.id,
          action: 'CONVERT_CONFIGURATION',
          summary: `Konfigurasi ${lead.quoteNumber} menjadi proyek ${code}`,
          before: stringifyJson({ leadId: lead.id, configurationId: configuration.id }),
          after: stringifyJson({ code, contractValue, taskCount: tasks.length }),
        },
      });

      return created;
    });

    return done(
      `Proyek ${code} dibuat dengan ${tasks.length} item pekerjaan dan termin 30/40/30.`,
      { projectId: project.id, code },
    );
  } catch {
    // Nomor proyek/invoice bisa direbut konversi lain yang berjalan bersamaan.
    return fail('Proyek gagal dibuat. Coba ulangi — nomor dokumen mungkin baru saja terpakai.');
  }
}

// ---------------------------------------------------------------------------
// P3 — Status item pekerjaan & progres proyek
// ---------------------------------------------------------------------------

/**
 * Menghitung ulang progres proyek dari bobot status (P3, J2).
 *
 * Progres tidak pernah diketik manual: ia selalu turunan dari status item
 * pekerjaan, memakai TASK_STATUS_WEIGHT yang sama dengan portal klien supaya
 * angka di papan internal dan angka yang dilihat klien tidak pernah berbeda.
 */
export async function recomputeProgress(projectId: string): Promise<number> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { status: true, tasks: { select: { status: true } } },
  });
  if (!project) return 0;

  const statuses = project.tasks.map((task) => coerceEnum(task.status, TASK_STATUSES, 'QUEUED'));
  const progressPct =
    statuses.length === 0
      ? 0
      : Math.round(
          (statuses.reduce((sum, status) => sum + TASK_STATUS_WEIGHT[status], 0) /
            statuses.length) *
            1000,
        ) / 10;

  // Status proyek ikut bergerak sendiri pada dua titik yang tidak ambigu:
  // pekerjaan pertama dimulai, dan seluruh pekerjaan sudah disetujui klien.
  // Sisanya (UAT → serah terima, ditahan, dibatalkan) tetap keputusan PM.
  let status = project.status;
  if (progressPct > 0 && status === 'PLANNING') status = 'IN_PROGRESS';
  if (progressPct >= 100 && status === 'IN_PROGRESS') status = 'UAT';

  await prisma.project.update({
    where: { id: projectId },
    data: { progressPct, status },
  });

  return progressPct;
}

/**
 * Mengubah status satu item pekerjaan (P3).
 *
 * Cap waktu diisi dan dibersihkan mengikuti arah perpindahan supaya riwayat
 * tidak berbohong ketika pekerjaan dikembalikan ke tahap sebelumnya. Portal
 * klien membaca baris yang sama, jadi perubahan di sini langsung terlihat oleh
 * klien tanpa sinkronisasi tambahan.
 */
export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus,
  actorId: string,
): Promise<ProjectServiceResult> {
  const task = await prisma.projectTask.findUnique({
    where: { id: taskId },
    select: { id: true, projectId: true, status: true, title: true, startedAt: true },
  });
  if (!task) return fail('Item pekerjaan tidak ditemukan.');
  if (task.status === status) {
    return done(`"${task.title}" memang sudah berstatus ${TASK_STATUS_LABEL[status]}.`);
  }

  const now = new Date();
  const reached = (target: TaskStatus): boolean =>
    TASK_STATUS_WEIGHT[status] >= TASK_STATUS_WEIGHT[target];

  await prisma.projectTask.update({
    where: { id: taskId },
    data: {
      status,
      startedAt: reached('IN_PROGRESS') ? (task.startedAt ?? now) : null,
      completedAt: reached('DONE') ? now : null,
      approvedAt: reached('APPROVED') ? now : null,
      // Catatan revisi klien tidak lagi relevan begitu pekerjaan dilanjutkan.
      clientNote: status === 'IN_PROGRESS' ? null : undefined,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: actorId,
      entity: 'ProjectTask',
      entityId: taskId,
      action: 'TASK_STATUS',
      summary: `${task.title}: ${task.status} → ${status}`,
      before: stringifyJson({ status: task.status }),
      after: stringifyJson({ status }),
    },
  });

  const progressPct = await recomputeProgress(task.projectId);
  return done(
    `"${task.title}" menjadi ${TASK_STATUS_LABEL[status]}. Progres proyek ${progressPct}%.`,
    { projectId: task.projectId },
  );
}

// ---------------------------------------------------------------------------
// P2 — Penugasan developer & target tanggal
// ---------------------------------------------------------------------------

export interface AssignTaskInput {
  taskId: string;
  actorId: string;
  assigneeId?: string | null;
  targetDate?: Date | null;
}

/** Menetapkan penanggung jawab dan target tanggal satu item pekerjaan (P2). */
export async function assignTask(input: AssignTaskInput): Promise<ProjectServiceResult> {
  const task = await prisma.projectTask.findUnique({
    where: { id: input.taskId },
    select: { id: true, projectId: true, title: true },
  });
  if (!task) return fail('Item pekerjaan tidak ditemukan.');

  if (input.assigneeId) {
    const assignee = await prisma.user.findUnique({
      where: { id: input.assigneeId },
      select: { isActive: true },
    });
    if (!assignee?.isActive) return fail('Pengguna tidak ditemukan atau sudah nonaktif.');
  }

  await prisma.projectTask.update({
    where: { id: input.taskId },
    data: {
      assigneeId: input.assigneeId ?? null,
      targetDate: input.targetDate ?? null,
    },
  });

  return done(`Penugasan "${task.title}" disimpan.`, { projectId: task.projectId });
}

// ---------------------------------------------------------------------------
// P4 — Pencatatan man-day aktual
// ---------------------------------------------------------------------------

/**
 * Mencatat man-day aktual satu item pekerjaan (P4).
 *
 * Angka ini yang membuat kalibrasi mungkin: laporan varians (P5) dan laporan
 * kalibrasi katalog (M9) sepenuhnya bergantung padanya. Karena itu isiannya
 * diletakkan langsung di papan, dan nilai kosong tetap diperbolehkan supaya
 * salah ketik dapat dibatalkan.
 */
export async function recordActualManDay(
  taskId: string,
  actualManDay: number | null,
  actorId: string,
): Promise<ProjectServiceResult> {
  if (actualManDay !== null && (!Number.isFinite(actualManDay) || actualManDay < 0)) {
    return fail('Man-day aktual tidak boleh negatif.');
  }
  if (actualManDay !== null && actualManDay > 1000) {
    return fail('Man-day aktual di atas 1.000 hari hampir pasti salah ketik.');
  }

  const task = await prisma.projectTask.findUnique({
    where: { id: taskId },
    select: { id: true, projectId: true, title: true, actualManDay: true },
  });
  if (!task) return fail('Item pekerjaan tidak ditemukan.');

  const rounded = actualManDay === null ? null : Math.round(actualManDay * 100) / 100;

  await prisma.projectTask.update({
    where: { id: taskId },
    data: { actualManDay: rounded },
  });

  await prisma.auditLog.create({
    data: {
      userId: actorId,
      entity: 'ProjectTask',
      entityId: taskId,
      action: 'ACTUAL_MAN_DAY',
      summary: `${task.title}: man-day aktual ${rounded ?? 'dikosongkan'}`,
      before: stringifyJson({ actualManDay: task.actualManDay }),
      after: stringifyJson({ actualManDay: rounded }),
    },
  });

  return done(
    rounded === null
      ? `Man-day aktual "${task.title}" dikosongkan.`
      : `Man-day aktual "${task.title}" dicatat.`,
    { projectId: task.projectId },
  );
}

// ---------------------------------------------------------------------------
// Milestone (H4)
// ---------------------------------------------------------------------------

export interface CreateMilestoneInput {
  projectId: string;
  actorId: string;
  name: string;
  description?: string | null;
  /** Porsi termin pembayaran; 0 untuk milestone tanpa tagihan. */
  percentage: number;
  dueDate?: Date | null;
}

/**
 * Menambah milestone di luar termin bawaan (H4).
 *
 * Total porsi termin dijaga tidak melebihi 100% agar jumlah seluruh invoice
 * tidak pernah melampaui nilai kontrak — kesalahan yang baru ketahuan saat
 * penagihan adalah kesalahan yang mahal.
 */
export async function createMilestone(input: CreateMilestoneInput): Promise<ProjectServiceResult> {
  const name = input.name.trim();
  if (name.length < 3) return fail('Nama milestone minimal 3 karakter.');
  if (!Number.isFinite(input.percentage) || input.percentage < 0 || input.percentage > 100) {
    return fail('Porsi termin harus berada di antara 0 dan 100 persen.');
  }

  const project = await prisma.project.findUnique({
    where: { id: input.projectId },
    select: { id: true, contractValue: true, milestones: { select: { percentage: true, sortOrder: true } } },
  });
  if (!project) return fail('Proyek tidak ditemukan.');

  const usedPct = project.milestones.reduce((sum, milestone) => sum + milestone.percentage, 0);
  if (usedPct + input.percentage > 100.01) {
    return fail(
      `Porsi termin melebihi 100%. Tersisa ${Math.max(0, Math.round((100 - usedPct) * 10) / 10)}% untuk dibagikan.`,
    );
  }

  const amount = Math.round((project.contractValue * input.percentage) / 100);
  const sortOrder = project.milestones.reduce((max, m) => Math.max(max, m.sortOrder + 1), 0);
  const dueDate = input.dueDate ?? null;
  // Nomor invoice dipesan sebelum transaksi dibuka: SQLite mengunci basis data
  // selama transaksi tulis, jadi pembacaan di dalamnya bisa saling menunggu.
  const invoiceNumber = amount > 0 ? (await reserveInvoiceNumbers(1))[0] : null;

  await prisma.$transaction(async (tx) => {
    const milestone = await tx.milestone.create({
      data: {
        projectId: project.id,
        name,
        description: input.description?.trim() || null,
        sortOrder,
        percentage: input.percentage,
        amount,
        dueDate,
        status: 'PENDING',
      },
    });

    // Milestone bertermin selalu lahir bersama invoice draft-nya supaya tidak
    // ada termin yang disepakati tetapi lupa ditagih.
    if (invoiceNumber) {
      const amounts = invoiceAmounts(amount);
      await tx.invoice.create({
        data: {
          number: invoiceNumber,
          projectId: project.id,
          milestoneId: milestone.id,
          kind: 'MILESTONE',
          status: 'DRAFT',
          subtotal: amounts.subtotal,
          taxPct: TAX_PCT,
          taxAmount: amounts.taxAmount,
          total: amounts.total,
          issuedAt: dueDate ?? new Date(),
          dueAt: new Date((dueDate ?? new Date()).getTime() + INVOICE_DUE_DAYS * DAY_MS),
        },
      });
    }

    await tx.auditLog.create({
      data: {
        userId: input.actorId,
        entity: 'Milestone',
        entityId: milestone.id,
        action: 'MILESTONE_CREATED',
        summary: `Milestone "${name}" (${input.percentage}%) ditambahkan`,
        after: stringifyJson({ percentage: input.percentage, amount }),
      },
    });
  });

  return done(
    amount > 0
      ? `Milestone "${name}" dibuat beserta invoice draft-nya.`
      : `Milestone "${name}" dibuat.`,
    { projectId: project.id },
  );
}

/**
 * Mencatat persetujuan klien atas satu milestone (H4, J4).
 *
 * Fungsi ini adalah jalur internal: klien yang menyetujui lewat portal memakai
 * jalur portal, sedangkan persetujuan yang datang lewat rapat, email, atau
 * berita acara dicatat di sini oleh PM. Keduanya berakhir pada baris yang sama
 * agar tidak ada dua versi kebenaran.
 */
export async function approveMilestone(
  milestoneId: string,
  actorId: string,
): Promise<ProjectServiceResult> {
  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    select: { id: true, projectId: true, name: true, status: true, amount: true },
  });
  if (!milestone) return fail('Milestone tidak ditemukan.');
  if (milestone.status === 'APPROVED') return fail('Milestone ini sudah disetujui.');

  await prisma.$transaction([
    prisma.milestone.update({
      where: { id: milestoneId },
      data: { status: 'APPROVED', approvedAt: new Date(), clientNote: null },
    }),
    prisma.auditLog.create({
      data: {
        userId: actorId,
        entity: 'Milestone',
        entityId: milestoneId,
        action: 'MILESTONE_APPROVED',
        summary: `Milestone "${milestone.name}" disetujui`,
        before: stringifyJson({ status: milestone.status }),
        after: stringifyJson({ status: 'APPROVED' }),
      },
    }),
  ]);

  return done(
    milestone.amount > 0
      ? `Milestone "${milestone.name}" disetujui. Invoice terminnya siap diterbitkan.`
      : `Milestone "${milestone.name}" disetujui.`,
    { projectId: milestone.projectId },
  );
}

/** Perpindahan status milestone selain persetujuan (H4). */
export async function updateMilestoneStatus(
  milestoneId: string,
  status: MilestoneStatus,
  actorId: string,
): Promise<ProjectServiceResult> {
  if (status === 'APPROVED') return approveMilestone(milestoneId, actorId);

  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    select: { id: true, projectId: true, name: true, status: true },
  });
  if (!milestone) return fail('Milestone tidak ditemukan.');

  await prisma.$transaction([
    prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        status,
        // Persetujuan yang dicabut harus ikut menghapus cap waktunya, kalau
        // tidak riwayat proyek menyimpan persetujuan yang tidak pernah berlaku.
        approvedAt: null,
      },
    }),
    prisma.auditLog.create({
      data: {
        userId: actorId,
        entity: 'Milestone',
        entityId: milestoneId,
        action: 'MILESTONE_STATUS',
        summary: `Milestone "${milestone.name}": ${milestone.status} → ${status}`,
        before: stringifyJson({ status: milestone.status }),
        after: stringifyJson({ status }),
      },
    }),
  ]);

  return done(`Status milestone "${milestone.name}" diperbarui.`, { projectId: milestone.projectId });
}

// ---------------------------------------------------------------------------
// Invoice (H4)
// ---------------------------------------------------------------------------

export interface IssueInvoiceInput {
  /** Invoice draft yang akan diterbitkan; boleh diganti dengan milestoneId. */
  invoiceId?: string;
  milestoneId?: string;
  actorId: string;
  dueDays?: number;
}

/**
 * Menerbitkan invoice termin (H4).
 *
 * Menerbitkan berarti mengubah draft menjadi tagihan yang berlaku: nomor,
 * tanggal terbit, dan tempo baru ditetapkan pada momen ini. Milestone yang
 * belum disetujui sengaja ditolak — menagih termin yang belum diterima klien
 * adalah cara tercepat merusak kepercayaan yang dibangun portal.
 */
export async function issueInvoice(input: IssueInvoiceInput): Promise<ProjectServiceResult> {
  const dueDays = input.dueDays && input.dueDays > 0 ? Math.min(input.dueDays, 120) : INVOICE_DUE_DAYS;

  const invoice = input.invoiceId
    ? await prisma.invoice.findUnique({
        where: { id: input.invoiceId },
        include: { milestone: { select: { id: true, name: true, status: true, amount: true } } },
      })
    : await prisma.invoice.findFirst({
        where: { milestoneId: input.milestoneId, status: 'DRAFT' },
        include: { milestone: { select: { id: true, name: true, status: true, amount: true } } },
      });

  if (invoice) {
    if (invoice.status !== 'DRAFT') {
      return fail('Invoice ini sudah diterbitkan sebelumnya.');
    }
    if (invoice.milestone && invoice.milestone.status !== 'APPROVED') {
      return fail('Milestone-nya belum disetujui, jadi terminnya belum boleh ditagih.');
    }

    const issuedAt = new Date();
    await prisma.$transaction([
      prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          status: 'SENT',
          issuedAt,
          dueAt: new Date(issuedAt.getTime() + dueDays * DAY_MS),
        },
      }),
      prisma.auditLog.create({
        data: {
          userId: input.actorId,
          entity: 'Invoice',
          entityId: invoice.id,
          action: 'INVOICE_ISSUED',
          summary: `Invoice ${invoice.number} diterbitkan`,
          before: stringifyJson({ status: invoice.status }),
          after: stringifyJson({ status: 'SENT', dueDays }),
        },
      }),
    ]);

    return done(`Invoice ${invoice.number} diterbitkan, tempo ${dueDays} hari.`, {
      projectId: invoice.projectId,
    });
  }

  // Tidak ada draft yang tersisa: milestone mungkin ditambahkan tanpa termin
  // atau invoicenya sudah pernah diterbitkan.
  if (!input.milestoneId) return fail('Invoice tidak ditemukan.');

  const milestone = await prisma.milestone.findUnique({
    where: { id: input.milestoneId },
    select: {
      id: true,
      projectId: true,
      name: true,
      status: true,
      amount: true,
      invoices: {
        where: { status: { not: 'CANCELLED' } },
        select: { number: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  if (!milestone) return fail('Milestone tidak ditemukan.');
  // Satu termin hanya boleh ditagih sekali; tanpa penjagaan ini satu milestone
  // bisa melahirkan invoice ganda dan klien ditagih dua kali untuk hal sama.
  if (milestone.invoices.length > 0) {
    return fail(`Termin ini sudah ditagih lewat invoice ${milestone.invoices[0].number}.`);
  }
  if (milestone.status !== 'APPROVED') {
    return fail('Milestone-nya belum disetujui, jadi terminnya belum boleh ditagih.');
  }
  if (milestone.amount <= 0) {
    return fail('Milestone ini tidak memuat termin pembayaran, jadi tidak ada yang ditagih.');
  }

  const [number] = await reserveInvoiceNumbers(1);
  const amounts = invoiceAmounts(milestone.amount);
  const issuedAt = new Date();

  const created = await prisma.invoice.create({
    data: {
      number,
      projectId: milestone.projectId,
      milestoneId: milestone.id,
      kind: 'MILESTONE',
      status: 'SENT',
      subtotal: amounts.subtotal,
      taxPct: TAX_PCT,
      taxAmount: amounts.taxAmount,
      total: amounts.total,
      issuedAt,
      dueAt: new Date(issuedAt.getTime() + dueDays * DAY_MS),
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: input.actorId,
      entity: 'Invoice',
      entityId: created.id,
      action: 'INVOICE_ISSUED',
      summary: `Invoice ${number} diterbitkan untuk milestone "${milestone.name}"`,
      after: stringifyJson({ total: amounts.total, dueDays }),
    },
  });

  return done(`Invoice ${number} diterbitkan, tempo ${dueDays} hari.`, {
    projectId: milestone.projectId,
  });
}

// ---------------------------------------------------------------------------
// Repositori dokumen (J7)
// ---------------------------------------------------------------------------

export interface AddDocumentInput {
  projectId: string;
  actorId: string;
  name: string;
  kind: DocumentKind;
  url: string;
  sizeLabel?: string | null;
}

/**
 * Menautkan satu dokumen ke proyek (J7).
 *
 * Dokumen disimpan sebagai tautan, bukan unggahan biner: kontrak dan berita
 * acara umumnya sudah hidup di penyimpanan berkas klien, dan portal hanya
 * perlu menjadi satu pintu untuk menemukannya.
 */
export async function addProjectDocument(input: AddDocumentInput): Promise<ProjectServiceResult> {
  const name = input.name.trim();
  const url = input.url.trim();
  if (name.length < 3) return fail('Nama dokumen minimal 3 karakter.');
  if (!/^https?:\/\//i.test(url)) return fail('Tautan dokumen harus diawali http:// atau https://.');

  const project = await prisma.project.findUnique({
    where: { id: input.projectId },
    select: { id: true },
  });
  if (!project) return fail('Proyek tidak ditemukan.');

  await prisma.projectDocument.create({
    data: {
      projectId: project.id,
      name,
      kind: coerceEnum(input.kind, DOCUMENT_KINDS, 'OTHER'),
      url,
      sizeLabel: input.sizeLabel?.trim() || null,
      uploadedBy: input.actorId,
    },
  });

  return done(`Dokumen "${name}" ditambahkan ke repositori proyek.`, { projectId: project.id });
}
