import 'server-only';

import { prisma } from '@/lib/db/prisma';
import { calibrationReport } from '@/lib/analytics/report';
import {
  COUNTED_CUSTOM_STATUSES,
  CUSTOM_REQUEST_STATUSES,
  DOCUMENT_KINDS,
  FEATURE_TYPES,
  INVOICE_KIND_LABEL,
  INVOICE_KINDS,
  INVOICE_STATUSES,
  MILESTONE_STATUSES,
  PROJECT_STATUSES,
  TASK_STATUSES,
  TASK_STATUS_WEIGHT,
  USER_ROLES,
  coerceEnum,
  type FeatureType,
  type TaskStatus,
} from '@/lib/domain/enums';
import {
  DEVIATION_THRESHOLD,
  isActiveProject,
  type AssigneeOption,
  type ConvertibleLeadRow,
  type DocumentRow,
  type EffortSummary,
  type InvoiceRow,
  type MilestoneRow,
  type PhaseBlock,
  type ProjectBoardStats,
  type ProjectDetailData,
  type ProjectRow,
  type ProjectVarianceRow,
  type TaskRow,
  type VarianceReport,
  type VarianceRow,
} from '@/components/admin/project/shared';

/**
 * Pembacaan data modul Proyek & Milestone (P).
 *
 * Seluruh aturan bisnis tetap tinggal di '@/lib/services/project'; berkas ini
 * hanya menyusun bentuk data yang siap dirender supaya halaman tetap tipis dan
 * tidak ada kueri yang berulang di beberapa tempat.
 */

/** Status invoice yang berarti tagihan sudah berjalan tetapi belum lunas. */
const OPEN_INVOICE_STATUSES = ['SENT', 'PARTIALLY_PAID', 'OVERDUE'] as const;

function isoDate(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

/** yyyy-mm-dd — bentuk yang langsung dipakai <input type="date">. */
function dateInputValue(value: Date | null | undefined): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

function midpoint(min: number, max: number): number {
  return (min + max) / 2;
}

function deviation(actual: number, estimate: number): number | null {
  if (estimate <= 0) return null;
  return Math.round(((actual - estimate) / estimate) * 1000) / 1000;
}

function progressFromStatuses(statuses: TaskStatus[]): number {
  if (statuses.length === 0) return 0;
  const sum = statuses.reduce((total, status) => total + TASK_STATUS_WEIGHT[status], 0);
  return Math.round((sum / statuses.length) * 1000) / 10;
}

// ---------------------------------------------------------------------------
// Daftar proyek + lead menang yang belum dikonversi (P1)
// ---------------------------------------------------------------------------

export interface ProjectBoardData {
  projects: ProjectRow[];
  convertible: ConvertibleLeadRow[];
  stats: ProjectBoardStats;
}

export async function loadProjectBoard(): Promise<ProjectBoardData> {
  const now = new Date();

  const [projectRows, wonLeads] = await Promise.all([
    prisma.project.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        client: { select: { name: true, company: true } },
        manager: { select: { name: true } },
        lead: { select: { contactName: true, company: true } },
        tasks: { select: { status: true, actualManDay: true } },
        milestones: { select: { status: true } },
        invoices: { select: { status: true, total: true, paidAmount: true, dueAt: true } },
      },
    }),
    // Lead menang yang belum punya proyek — inilah antrean konversi satu klik.
    prisma.lead.findMany({
      where: { stage: 'WON', project: { is: null } },
      orderBy: { updatedAt: 'desc' },
      include: {
        owner: { select: { name: true } },
        configuration: {
          select: {
            totalMax: true,
            lockedPrice: true,
            durationWeeksMax: true,
            category: { select: { shortName: true } },
            customRequests: { select: { status: true } },
            _count: { select: { items: true } },
          },
        },
      },
    }),
  ]);

  const projects: ProjectRow[] = projectRows.map((row) => {
    const status = coerceEnum(row.status, PROJECT_STATUSES, 'PLANNING');
    const statuses = row.tasks.map((task) => coerceEnum(task.status, TASK_STATUSES, 'QUEUED'));
    const taskDone = statuses.filter((value) => value === 'DONE').length;

    const outstandingInvoice = row.invoices
      .filter((invoice) =>
        (OPEN_INVOICE_STATUSES as readonly string[]).includes(invoice.status),
      )
      .reduce((sum, invoice) => sum + Math.max(0, invoice.total - invoice.paidAmount), 0);

    return {
      id: row.id,
      code: row.code,
      name: row.name,
      clientLabel:
        row.client?.company ??
        row.client?.name ??
        row.lead?.company ??
        row.lead?.contactName ??
        'Klien belum tertaut',
      managerName: row.manager?.name ?? null,
      status,
      progressPct: row.progressPct,
      contractValue: row.contractValue,
      taskTotal: statuses.length,
      taskDone,
      startDate: isoDate(row.startDate),
      targetEndDate: isoDate(row.targetEndDate),
      isLate:
        isActiveProject(status) &&
        row.targetEndDate !== null &&
        row.targetEndDate < now &&
        row.progressPct < 100,
      awaitingApproval: row.milestones.filter(
        (milestone) => milestone.status === 'AWAITING_APPROVAL',
      ).length,
      outstandingInvoice,
      // Pekerjaan yang sudah selesai tetapi man-day aktualnya kosong adalah
      // data kalibrasi yang hilang (P4) — ditandai agar segera dilengkapi.
      missingActual: row.tasks.filter(
        (task) =>
          task.actualManDay === null && (task.status === 'DONE' || task.status === 'APPROVED'),
      ).length,
    };
  });

  const convertible: ConvertibleLeadRow[] = wonLeads.map((lead) => {
    const customStatuses = lead.configuration.customRequests.map((request) =>
      coerceEnum(request.status, CUSTOM_REQUEST_STATUSES, 'PENDING'),
    );

    // Urutan yang sama dengan convertConfigurationToProject(): override yang
    // disetujui (BR-16), lalu harga terkunci (BR-11), baru batas atas penawaran.
    const useOverride = lead.overrideStatus === 'APPROVED' && Boolean(lead.overridePriceValue);
    const contractValue = useOverride
      ? (lead.overridePriceValue as number)
      : (lead.configuration.lockedPrice ?? lead.configuration.totalMax);

    return {
      id: lead.id,
      quoteNumber: lead.quoteNumber,
      contactName: lead.contactName,
      company: lead.company,
      categoryName: lead.configuration.category.shortName,
      ownerName: lead.owner?.name ?? null,
      featureCount: lead.configuration._count.items,
      estimatedCustomCount: customStatuses.filter((status) =>
        COUNTED_CUSTOM_STATUSES.includes(status),
      ).length,
      pendingCustomCount: customStatuses.filter(
        (status) => !COUNTED_CUSTOM_STATUSES.includes(status) && status !== 'REJECTED',
      ).length,
      contractValue,
      valueSource: useOverride ? 'OVERRIDE' : lead.configuration.lockedPrice ? 'LOCKED' : 'QUOTE',
      durationWeeksMax: lead.configuration.durationWeeksMax,
      wonAt: lead.updatedAt.toISOString(),
    };
  });

  const active = projects.filter((project) => isActiveProject(project.status));

  const stats: ProjectBoardStats = {
    activeProjects: active.length,
    contractValueActive: active.reduce((sum, project) => sum + project.contractValue, 0),
    averageProgress:
      active.length === 0
        ? 0
        : Math.round(
            (active.reduce((sum, project) => sum + project.progressPct, 0) / active.length) * 10,
          ) / 10,
    awaitingApproval: projects.reduce((sum, project) => sum + project.awaitingApproval, 0),
    overdueInvoices: projectRows.reduce(
      (sum, row) =>
        sum +
        row.invoices.filter(
          (invoice) =>
            (OPEN_INVOICE_STATUSES as readonly string[]).includes(invoice.status) &&
            invoice.dueAt < now,
        ).length,
      0,
    ),
    unconvertedWon: convertible.length,
  };

  return { projects, convertible, stats };
}

// ---------------------------------------------------------------------------
// Detail proyek (P2–P4)
// ---------------------------------------------------------------------------

export async function listAssignableUsers(): Promise<AssigneeOption[]> {
  const rows = await prisma.user.findMany({
    where: { isActive: true, role: { in: ['PM', 'CONSULTANT', 'SUPER_ADMIN', 'CATALOG_ADMIN'] } },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, role: true },
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    role: coerceEnum(row.role, USER_ROLES, 'PM'),
  }));
}

export async function getProjectDetailView(projectId: string): Promise<ProjectDetailData | null> {
  const now = new Date();

  const row = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      client: { select: { name: true, email: true, company: true } },
      manager: { select: { name: true } },
      lead: { select: { id: true, quoteNumber: true, contactName: true, company: true } },
      configuration: {
        select: {
          publicToken: true,
          grossMarginPct: true,
          cogsProjection: true,
          category: { select: { name: true } },
        },
      },
      tasks: {
        orderBy: { sortOrder: 'asc' },
        include: {
          assignee: { select: { name: true } },
          feature: { select: { type: true } },
          _count: { select: { discussions: true } },
        },
      },
      milestones: {
        orderBy: { sortOrder: 'asc' },
        include: { invoices: { select: { number: true, status: true }, orderBy: { createdAt: 'asc' } } },
      },
      invoices: {
        orderBy: { issuedAt: 'asc' },
        include: { milestone: { select: { name: true } } },
      },
      documents: { orderBy: { createdAt: 'desc' } },
    },
  });

  if (!row) return null;

  const tasks: TaskRow[] = row.tasks.map((task) => {
    const status = coerceEnum(task.status, TASK_STATUSES, 'QUEUED');
    const estimate = midpoint(task.estimateManDayMin, task.estimateManDayMax);
    return {
      id: task.id,
      title: task.title,
      status,
      phase: task.phase,
      assigneeId: task.assigneeId,
      assigneeName: task.assignee?.name ?? null,
      estimateManDayMin: task.estimateManDayMin,
      estimateManDayMax: task.estimateManDayMax,
      actualManDay: task.actualManDay,
      targetDate: dateInputValue(task.targetDate),
      isLate: task.targetDate !== null && task.targetDate < now && status !== 'DONE',
      featureId: task.featureId,
      // Item pekerjaan tanpa fitur katalog selalu berasal dari request custom.
      featureType: task.feature
        ? coerceEnum<FeatureType>(task.feature.type, FEATURE_TYPES, 'STANDARD')
        : 'CUSTOM',
      deviationPct: task.actualManDay === null ? null : deviation(task.actualManDay, estimate),
      discussionCount: task._count.discussions,
    };
  });

  const phaseOrder: string[] = [];
  const grouped = new Map<string, TaskRow[]>();
  for (const task of tasks) {
    if (!grouped.has(task.phase)) {
      grouped.set(task.phase, []);
      phaseOrder.push(task.phase);
    }
    grouped.get(task.phase)!.push(task);
  }

  const phases: PhaseBlock[] = phaseOrder.map((phase) => {
    const items = grouped.get(phase)!;
    return {
      phase,
      tasks: items,
      progressPct: progressFromStatuses(items.map((task) => task.status)),
    };
  });

  const milestones: MilestoneRow[] = row.milestones.map((milestone) => {
    const invoice = milestone.invoices[0] ?? null;
    return {
      id: milestone.id,
      name: milestone.name,
      description: milestone.description,
      percentage: milestone.percentage,
      amount: milestone.amount,
      status: coerceEnum(milestone.status, MILESTONE_STATUSES, 'PENDING'),
      dueDate: isoDate(milestone.dueDate),
      approvedAt: isoDate(milestone.approvedAt),
      clientNote: milestone.clientNote,
      invoiceNumber: invoice?.number ?? null,
      invoiceStatus: invoice ? coerceEnum(invoice.status, INVOICE_STATUSES, 'DRAFT') : null,
      hasDraftInvoice: milestone.invoices.some((item) => item.status === 'DRAFT'),
    };
  });

  const invoices: InvoiceRow[] = row.invoices.map((invoice) => {
    const status = coerceEnum(invoice.status, INVOICE_STATUSES, 'DRAFT');
    return {
      id: invoice.id,
      number: invoice.number,
      kindLabel: INVOICE_KIND_LABEL[coerceEnum(invoice.kind, INVOICE_KINDS, 'MILESTONE')],
      status,
      milestoneName: invoice.milestone?.name ?? null,
      subtotal: invoice.subtotal,
      taxAmount: invoice.taxAmount,
      total: invoice.total,
      paidAmount: invoice.paidAmount,
      issuedAt: invoice.issuedAt.toISOString(),
      dueAt: invoice.dueAt.toISOString(),
      isOverdue:
        (OPEN_INVOICE_STATUSES as readonly string[]).includes(status) && invoice.dueAt < now,
    };
  });

  const documents: DocumentRow[] = row.documents.map((document) => ({
    id: document.id,
    name: document.name,
    kind: coerceEnum(document.kind, DOCUMENT_KINDS, 'OTHER'),
    url: document.url,
    sizeLabel: document.sizeLabel,
    createdAt: document.createdAt.toISOString(),
  }));

  const recorded = tasks.filter((task) => task.actualManDay !== null);
  const estimateManDay = recorded.reduce(
    (sum, task) => sum + midpoint(task.estimateManDayMin, task.estimateManDayMax),
    0,
  );
  const actualManDay = recorded.reduce((sum, task) => sum + (task.actualManDay ?? 0), 0);

  const effort: EffortSummary = {
    estimateManDay: Math.round(estimateManDay * 10) / 10,
    actualManDay: Math.round(actualManDay * 10) / 10,
    recordedTasks: recorded.length,
    totalTasks: tasks.length,
    deviationPct: recorded.length === 0 ? null : deviation(actualManDay, estimateManDay),
  };

  const assignees = await listAssignableUsers();

  return {
    project: {
      id: row.id,
      code: row.code,
      name: row.name,
      status: coerceEnum(row.status, PROJECT_STATUSES, 'PLANNING'),
      progressPct: row.progressPct,
      contractValue: row.contractValue,
      clientLabel:
        row.client?.company ??
        row.client?.name ??
        row.lead?.company ??
        row.lead?.contactName ??
        'Klien belum tertaut',
      clientEmail: row.client?.email ?? null,
      managerName: row.manager?.name ?? null,
      quoteNumber: row.lead?.quoteNumber ?? null,
      leadId: row.lead?.id ?? null,
      categoryName: row.configuration.category.name,
      configurationToken: row.configuration.publicToken,
      startDate: isoDate(row.startDate),
      targetEndDate: isoDate(row.targetEndDate),
      stagingUrl: row.stagingUrl,
      demoUrl: row.demoUrl,
      grossMarginPct: row.configuration.grossMarginPct,
      cogsProjection: row.configuration.cogsProjection,
    },
    phases,
    milestones,
    invoices,
    documents,
    assignees,
    effort,
  };
}

// ---------------------------------------------------------------------------
// Laporan varians estimasi vs aktual (P5)
// ---------------------------------------------------------------------------

interface VarianceBucket {
  key: string;
  name: string;
  type: FeatureType;
  categoryName: string;
  categorySlug: string | null;
  featureId: string | null;
  estimateTotal: number;
  actualTotal: number;
  samples: number;
}

/**
 * Menyusun laporan varians estimasi vs aktual (P5).
 *
 * Yang dibandingkan di sini adalah estimasi yang DIJUAL — snapshot man-day
 * pada konfigurasi — dengan man-day aktual yang dicatat tim di papan. Kolom
 * man-day referensi katalog diambil dari calibrationReport() agar angka di
 * halaman ini dan di laporan kalibrasi mesin harga (M9) tidak pernah berbeda.
 */
export async function loadVarianceReport(): Promise<VarianceReport> {
  const [taskRows, projectRows, calibration] = await Promise.all([
    prisma.projectTask.findMany({
      where: { actualManDay: { not: null } },
      select: {
        title: true,
        featureId: true,
        actualManDay: true,
        estimateManDayMin: true,
        estimateManDayMax: true,
        project: { select: { id: true, code: true, name: true } },
        feature: {
          select: {
            name: true,
            type: true,
            category: { select: { shortName: true, slug: true } },
          },
        },
        customRequest: { select: { name: true } },
      },
    }),
    prisma.project.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, code: true, name: true, _count: { select: { tasks: true } } },
    }),
    calibrationReport(),
  ]);

  const referenceByFeature = new Map(calibration.map((row) => [row.featureId, row]));

  const buckets = new Map<string, VarianceBucket>();
  const perProject = new Map<
    string,
    { code: string; name: string; estimate: number; actual: number; recorded: number }
  >();

  for (const task of taskRows) {
    const actual = task.actualManDay ?? 0;
    const estimate = midpoint(task.estimateManDayMin, task.estimateManDayMax);

    // Fitur custom belum punya entri katalog, jadi dikelompokkan per judul
    // pekerjaan — justru di sinilah deviasi biasanya paling besar.
    const key = task.featureId ?? `custom:${task.customRequest?.name ?? task.title}`;
    const bucket = buckets.get(key) ?? {
      key,
      name: task.feature?.name ?? task.customRequest?.name ?? task.title,
      type: task.feature
        ? coerceEnum<FeatureType>(task.feature.type, FEATURE_TYPES, 'STANDARD')
        : 'CUSTOM',
      categoryName: task.feature?.category.shortName ?? 'Fitur custom',
      categorySlug: task.feature?.category.slug ?? null,
      featureId: task.featureId,
      estimateTotal: 0,
      actualTotal: 0,
      samples: 0,
    };
    bucket.estimateTotal += estimate;
    bucket.actualTotal += actual;
    bucket.samples += 1;
    buckets.set(key, bucket);

    const project = perProject.get(task.project.id) ?? {
      code: task.project.code,
      name: task.project.name,
      estimate: 0,
      actual: 0,
      recorded: 0,
    };
    project.estimate += estimate;
    project.actual += actual;
    project.recorded += 1;
    perProject.set(task.project.id, project);
  }

  const features: VarianceRow[] = [...buckets.values()]
    .map((bucket) => {
      const estimateAvg = bucket.estimateTotal / bucket.samples;
      const actualAvg = bucket.actualTotal / bucket.samples;
      const deviationPct = deviation(actualAvg, estimateAvg) ?? 0;
      const reference = bucket.featureId ? referenceByFeature.get(bucket.featureId) : undefined;

      return {
        key: bucket.key,
        name: bucket.name,
        type: bucket.type,
        categoryName: bucket.categoryName,
        estimateManDay: Math.round(estimateAvg * 10) / 10,
        actualManDay: Math.round(actualAvg * 10) / 10,
        samples: bucket.samples,
        deviationPct,
        // Aturan penandaan sama persis dengan laporan kalibrasi (metrik 4.3):
        // meleset lebih dari 15% dan minimal dua sampel, bukan sekali meleset.
        needsRecalibration:
          reference?.needsRecalibration ??
          (Math.abs(deviationPct) > DEVIATION_THRESHOLD && bucket.samples >= 2),
        refManDay: reference?.refManDay ?? null,
        editHref:
          bucket.featureId && bucket.categorySlug
            ? `/admin/katalog/${bucket.categorySlug}/fitur/${bucket.featureId}`
            : null,
      };
    })
    .sort((a, b) => Math.abs(b.deviationPct) - Math.abs(a.deviationPct));

  const projects: ProjectVarianceRow[] = projectRows
    .filter((project) => perProject.has(project.id))
    .map((project) => {
      const entry = perProject.get(project.id)!;
      return {
        id: project.id,
        code: project.code,
        name: project.name,
        estimateManDay: Math.round(entry.estimate * 10) / 10,
        actualManDay: Math.round(entry.actual * 10) / 10,
        recordedTasks: entry.recorded,
        totalTasks: project._count.tasks,
        deviationPct: deviation(entry.actual, entry.estimate) ?? 0,
      };
    })
    .sort((a, b) => Math.abs(b.deviationPct) - Math.abs(a.deviationPct));

  const totalSamples = features.reduce((sum, row) => sum + row.samples, 0);
  const averageDeviationPct =
    features.length === 0
      ? 0
      : features.reduce((sum, row) => sum + Math.abs(row.deviationPct), 0) / features.length;

  return { features, projects, averageDeviationPct, totalSamples };
}
