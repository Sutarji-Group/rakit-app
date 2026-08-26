/**
 * Tipe & label bersama modul Proyek & Milestone (P).
 *
 * Berkas ini bebas dependensi server sehingga aman diimpor oleh Server
 * Component, Server Action, maupun komponen klien tanpa menarik Prisma atau
 * modul 'server-only' ke bundel peramban.
 */

import type { BadgeVariant } from '@/components/ui';
import { formatManDay, formatNumber } from '@/lib/format';
import type {
  DocumentKind,
  FeatureType,
  InvoiceStatus,
  MilestoneStatus,
  ProjectStatus,
  TaskStatus,
  UserRole,
} from '@/lib/domain/enums';

/** Hasil seragam seluruh Server Action modul proyek. */
export interface ProjectActionResult {
  ok: boolean;
  message: string;
  projectId?: string;
}

// ---------------------------------------------------------------------------
// Daftar proyek (P1)
// ---------------------------------------------------------------------------

export interface ProjectRow {
  id: string;
  code: string;
  name: string;
  clientLabel: string;
  managerName: string | null;
  status: ProjectStatus;
  progressPct: number;
  contractValue: number;
  taskTotal: number;
  taskDone: number;
  startDate: string | null;
  targetEndDate: string | null;
  /** Target selesai sudah lewat sementara pekerjaan belum tuntas. */
  isLate: boolean;
  /** Milestone yang menunggu persetujuan klien. */
  awaitingApproval: number;
  /** Nilai invoice terbit yang belum lunas. */
  outstandingInvoice: number;
  /** Item pekerjaan yang man-day aktualnya belum dicatat (P4). */
  missingActual: number;
}

/**
 * Lead yang sudah dimenangkan tetapi belum menjadi proyek.
 *
 * Baris inilah yang membuat konversi satu klik mungkin: konfigurasi ADALAH
 * Scope of Work (Prinsip Produk #5), jadi tidak ada yang perlu diketik ulang.
 */
export interface ConvertibleLeadRow {
  id: string;
  quoteNumber: string;
  contactName: string;
  company: string | null;
  categoryName: string;
  ownerName: string | null;
  featureCount: number;
  /** Fitur custom yang sudah diestimasi dan ikut menjadi item pekerjaan. */
  estimatedCustomCount: number;
  /** Fitur custom yang masih menunggu estimasi manusia (BR-02). */
  pendingCustomCount: number;
  contractValue: number;
  /** Nilai kontrak berasal dari override yang disetujui atau harga terkunci. */
  valueSource: 'OVERRIDE' | 'LOCKED' | 'QUOTE';
  durationWeeksMax: number;
  wonAt: string;
}

export interface ProjectBoardStats {
  activeProjects: number;
  contractValueActive: number;
  averageProgress: number;
  awaitingApproval: number;
  overdueInvoices: number;
  unconvertedWon: number;
}

// ---------------------------------------------------------------------------
// Detail proyek (P2–P4)
// ---------------------------------------------------------------------------

export interface TaskRow {
  id: string;
  title: string;
  status: TaskStatus;
  phase: string;
  assigneeId: string | null;
  assigneeName: string | null;
  estimateManDayMin: number;
  estimateManDayMax: number;
  actualManDay: number | null;
  /** Format yyyy-mm-dd agar langsung cocok dengan <input type="date">. */
  targetDate: string | null;
  isLate: boolean;
  featureId: string | null;
  featureType: FeatureType;
  /** Selisih aktual terhadap titik tengah estimasi; null bila belum dicatat. */
  deviationPct: number | null;
  discussionCount: number;
}

export interface PhaseBlock {
  phase: string;
  tasks: TaskRow[];
  progressPct: number;
}

export interface MilestoneRow {
  id: string;
  name: string;
  description: string | null;
  percentage: number;
  amount: number;
  status: MilestoneStatus;
  dueDate: string | null;
  approvedAt: string | null;
  clientNote: string | null;
  /** Invoice yang menempel pada termin ini, bila sudah dibuat. */
  invoiceNumber: string | null;
  invoiceStatus: InvoiceStatus | null;
  hasDraftInvoice: boolean;
}

export interface InvoiceRow {
  id: string;
  number: string;
  kindLabel: string;
  status: InvoiceStatus;
  milestoneName: string | null;
  subtotal: number;
  taxAmount: number;
  total: number;
  paidAmount: number;
  issuedAt: string;
  dueAt: string;
  isOverdue: boolean;
}

export interface DocumentRow {
  id: string;
  name: string;
  kind: DocumentKind;
  url: string;
  sizeLabel: string | null;
  createdAt: string;
}

export interface AssigneeOption {
  id: string;
  name: string;
  role: UserRole;
}

export interface ProjectSummary {
  id: string;
  code: string;
  name: string;
  status: ProjectStatus;
  progressPct: number;
  contractValue: number;
  clientLabel: string;
  clientEmail: string | null;
  managerName: string | null;
  quoteNumber: string | null;
  leadId: string | null;
  categoryName: string;
  configurationToken: string;
  startDate: string | null;
  targetEndDate: string | null;
  stagingUrl: string | null;
  demoUrl: string | null;
  /** Nilai internal — hanya boleh tampil di area admin (PRD 6.4). */
  grossMarginPct: number;
  cogsProjection: number;
}

export interface ProjectDetailData {
  project: ProjectSummary;
  phases: PhaseBlock[];
  milestones: MilestoneRow[];
  invoices: InvoiceRow[];
  documents: DocumentRow[];
  assignees: AssigneeOption[];
  effort: EffortSummary;
}

/** Ringkasan estimasi vs aktual satu proyek (P4/P5). */
export interface EffortSummary {
  estimateManDay: number;
  actualManDay: number;
  recordedTasks: number;
  totalTasks: number;
  /** Selisih aktual terhadap estimasi pada pekerjaan yang sudah tercatat. */
  deviationPct: number | null;
}

// ---------------------------------------------------------------------------
// Laporan varians (P5)
// ---------------------------------------------------------------------------

export interface VarianceRow {
  key: string;
  name: string;
  type: FeatureType;
  categoryName: string;
  /** Estimasi yang dijual — rata-rata titik tengah snapshot konfigurasi. */
  estimateManDay: number;
  actualManDay: number;
  samples: number;
  deviationPct: number;
  /** Meleset >15% dengan minimal dua sampel (metrik 4.3). */
  needsRecalibration: boolean;
  /** Man-day referensi katalog saat ini; null untuk fitur custom. */
  refManDay: number | null;
  /** Tautan ke halaman edit fitur agar perbaikannya satu klik (P5). */
  editHref: string | null;
}

export interface ProjectVarianceRow {
  id: string;
  code: string;
  name: string;
  estimateManDay: number;
  actualManDay: number;
  recordedTasks: number;
  totalTasks: number;
  deviationPct: number;
}

export interface VarianceReport {
  features: VarianceRow[];
  projects: ProjectVarianceRow[];
  /** Rata-rata deviasi mutlak seluruh fitur — target NFR ≤ 15% (metrik 4.3). */
  averageDeviationPct: number;
  totalSamples: number;
}

/** Ambang deviasi man-day aktual vs estimasi (metrik 4.3). */
export const DEVIATION_THRESHOLD = 0.15;

// ---------------------------------------------------------------------------
// Nada warna
// ---------------------------------------------------------------------------

export const TASK_STATUS_TONE: Record<TaskStatus, BadgeVariant> = {
  QUEUED: 'neutral',
  IN_PROGRESS: 'info',
  READY_FOR_REVIEW: 'warning',
  APPROVED: 'brand',
  DONE: 'success',
};

export const PROJECT_STATUS_TONE: Record<ProjectStatus, BadgeVariant> = {
  PLANNING: 'neutral',
  IN_PROGRESS: 'info',
  UAT: 'warning',
  DELIVERED: 'success',
  ON_HOLD: 'warning',
  CANCELLED: 'danger',
};

export const MILESTONE_STATUS_TONE: Record<MilestoneStatus, BadgeVariant> = {
  PENDING: 'neutral',
  IN_PROGRESS: 'info',
  AWAITING_APPROVAL: 'warning',
  APPROVED: 'success',
  REVISION_REQUESTED: 'danger',
};

export const INVOICE_STATUS_TONE: Record<InvoiceStatus, BadgeVariant> = {
  DRAFT: 'neutral',
  SENT: 'info',
  PARTIALLY_PAID: 'warning',
  PAID: 'success',
  OVERDUE: 'danger',
  CANCELLED: 'outline',
};

/** Status proyek yang masih dihitung sebagai pekerjaan berjalan. */
export function isActiveProject(status: ProjectStatus): boolean {
  return status !== 'DELIVERED' && status !== 'CANCELLED';
}

/** Nada progres: merah bila terlambat, hijau bila hampir tuntas. */
export function progressTone(progressPct: number, isLate: boolean): 'brand' | 'success' | 'danger' {
  if (isLate) return 'danger';
  return progressPct >= 100 ? 'success' : 'brand';
}

/** "3 – 5 hari" untuk rentang estimasi man-day. */
export function formatManDayRange(min: number, max: number): string {
  if (min === max) return formatManDay(min);
  return `${formatNumber(min, min % 1 === 0 ? 0 : 1)} – ${formatManDay(max)}`;
}

/**
 * Nada deviasi man-day aktual terhadap estimasi.
 *
 * Meleset ke bawah pun bukan kabar baik: estimasi yang terlalu longgar membuat
 * harga jual terlalu mahal dan penawaran kalah sebelum sempat dibahas.
 */
export function deviationTone(deviationPct: number): BadgeVariant {
  if (deviationPct > DEVIATION_THRESHOLD) return 'danger';
  if (deviationPct < -DEVIATION_THRESHOLD) return 'warning';
  return 'success';
}
