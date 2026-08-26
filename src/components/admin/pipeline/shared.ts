/**
 * Tipe & label bersama modul pipeline (O).
 *
 * Modul ini bebas dependensi server sehingga dapat diimpor baik oleh Server
 * Component, Server Action, maupun komponen klien tanpa menarik Prisma ke
 * bundel browser.
 */

import type { BadgeVariant } from '@/components/ui';
import type {
  ActivityKind,
  AddOnKind,
  CustomRequestStatus,
  FeatureType,
  ItemOrigin,
  LeadStage,
  LostReason,
  OverrideStatus,
  RequestPriority,
  RevisionAction,
  UserRole,
} from '@/lib/domain/enums';

/**
 * Hasil seragam seluruh Server Action pipeline.
 *
 * Penolakan aturan bisnis (alasan kalah kosong, kuota override terlampaui)
 * dikembalikan sebagai data biasa, bukan exception, agar isian form pengguna
 * tidak ikut hilang saat aksi ditolak.
 */
export interface PipelineActionResult {
  ok: boolean;
  message: string;
  /** Khusus override harga: tersimpan, tetapi belum berlaku sebelum disetujui. */
  needsApproval?: boolean;
}

// ---------------------------------------------------------------------------
// Papan kanban (O1)
// ---------------------------------------------------------------------------

/** Satu kartu lead di papan. */
export interface LeadCardData {
  id: string;
  quoteNumber: string;
  contactName: string;
  company: string | null;
  categoryName: string;
  stage: LeadStage;
  ownerName: string | null;
  totalMin: number;
  totalMax: number;
  /** Proyeksi gross margin — nilai internal, hanya tampil di area admin (6.4). */
  grossMarginPct: number;
  belowMinMargin: boolean;
  needsDeepDiscovery: boolean;
  overrideStatus: OverrideStatus;
  lostReason: LostReason | null;
  /** Pengingat follow-up yang sudah lewat jatuh tempo (O4). */
  overdueReminders: number;
  /** Detik yang dihabiskan klien di konfigurator — sinyal kualifikasi (O2). */
  timeSpentSeconds: number;
  validUntil: string;
}

/** Ringkasan satu baris alasan kalah pada papan (O5). */
export interface LostReasonSummaryRow {
  reason: LostReason | null;
  count: number;
  valueMax: number;
}

export interface PipelineStats {
  activeCount: number;
  activeValueMin: number;
  activeValueMax: number;
  wonCount: number;
  lostCount: number;
  /** null bila belum ada satu pun lead yang selesai (menang atau kalah). */
  winRate: number | null;
  overdueReminders: number;
  pendingOverrides: number;
}

// ---------------------------------------------------------------------------
// Detail lead (O2–O6)
// ---------------------------------------------------------------------------

export interface LeadActivityItem {
  id: string;
  kind: ActivityKind;
  body: string;
  userName: string | null;
  createdAt: string;
  dueAt: string | null;
  doneAt: string | null;
  isOverdue: boolean;
}

export interface RevisionItem {
  id: string;
  version: number;
  action: RevisionAction;
  summary: string;
  actorLabel: string;
  totalMin: number;
  totalMax: number;
  createdAt: string;
}

export interface FeatureLineItem {
  id: string;
  name: string;
  type: FeatureType;
  origin: ItemOrigin;
  reason: string | null;
  manDayMin: number;
  manDayMax: number;
  priceMin: number;
  priceMax: number;
}

export interface FeatureGroupBlock {
  groupName: string;
  items: FeatureLineItem[];
}

export interface AddOnItem {
  id: string;
  name: string;
  kind: AddOnKind;
  priceMin: number;
  priceMax: number;
  isRecurring: boolean;
}

export interface CustomItem {
  id: string;
  name: string;
  status: CustomRequestStatus;
  priority: RequestPriority;
  manDayMin: number | null;
  manDayMax: number | null;
  unitPriceMin: number | null;
  unitPriceMax: number | null;
}

/** Keadaan override harga yang sedang berlaku pada satu lead (O6). */
export interface OverrideState {
  status: OverrideStatus;
  value: number | null;
  pct: number | null;
  reason: string | null;
  approvedByName: string | null;
  approvedAt: string | null;
}

export interface OwnerOption {
  id: string;
  name: string;
  role: UserRole;
}

// ---------------------------------------------------------------------------
// Label bahasa Indonesia yang belum ada di enums.ts
// ---------------------------------------------------------------------------

export const REVISION_ACTION_LABEL: Record<RevisionAction, string> = {
  CREATED: 'Konfigurasi dibuat',
  FEATURE_ADDED: 'Fitur ditambahkan',
  FEATURE_REMOVED: 'Fitur dihapus',
  PRESET_APPLIED: 'Preset diterapkan',
  OPTIONS_CHANGED: 'Konfigurasi proyek diubah',
  CUSTOM_ADDED: 'Fitur custom diajukan',
  CUSTOM_REMOVED: 'Fitur custom dibatalkan',
  ADDON_CHANGED: 'Add-on diubah',
  SUBMITTED: 'Penawaran diterbitkan',
  PRICE_OVERRIDE: 'Harga di-override',
  ESTIMATE_UPDATED: 'Estimasi custom diperbarui',
  PRICE_LOCKED: 'Harga dikunci',
};

export const ITEM_ORIGIN_LABEL: Record<ItemOrigin, string> = {
  PRESET: 'Dari preset',
  USER: 'Dipilih klien',
  DEPENDENCY: 'Ditambahkan mesin dependensi',
  WIZARD: 'Dari jawaban wizard',
  CORE_AUTO: 'Core otomatis',
  CHANGE_REQUEST: 'Dari permintaan perubahan',
};

export const ACTIVITY_TONE: Record<ActivityKind, BadgeVariant> = {
  NOTE: 'neutral',
  STAGE_CHANGE: 'brand',
  CALL: 'info',
  EMAIL: 'info',
  REMINDER: 'warning',
  OVERRIDE: 'danger',
  SYSTEM: 'outline',
};

/** Jenis aktivitas yang boleh dicatat manual oleh tim (O4). */
export const MANUAL_ACTIVITY_KINDS: ActivityKind[] = ['NOTE', 'CALL', 'EMAIL', 'REMINDER'];

export const OVERRIDE_STATUS_TONE: Record<OverrideStatus, BadgeVariant> = {
  NONE: 'neutral',
  PENDING_APPROVAL: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
};

/**
 * Tahap yang membolehkan penguncian harga.
 *
 * BR-11: harga hanya boleh dikunci setelah discovery call berlangsung dan
 * disetujui consultant — sebelum itu ruang lingkup belum cukup pasti untuk
 * ditagih sebagai angka tetap.
 */
const LOCKABLE_STAGES: LeadStage[] = [
  'DISCOVERY_SCHEDULED',
  'FINAL_PROPOSAL',
  'NEGOTIATION',
  'WON',
];

export function canLockPriceAt(stage: LeadStage): boolean {
  return LOCKABLE_STAGES.includes(stage);
}

/** Tahap yang masih dihitung sebagai pipeline berjalan. */
export function isOpenStage(stage: LeadStage): boolean {
  return stage !== 'WON' && stage !== 'LOST';
}
