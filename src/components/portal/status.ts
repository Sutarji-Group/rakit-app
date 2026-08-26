import type { BadgeVariant } from '@/components/ui';
import type {
  ChangeRequestStatus,
  ConfigurationStatus,
  InvoiceStatus,
  MilestoneStatus,
  PaymentStatus,
  ProjectStatus,
  RevisionAction,
  TaskStatus,
} from '@/lib/domain/enums';

/**
 * Pemetaan status ke warna lencana.
 *
 * Dikumpulkan di satu berkas supaya arti warna konsisten di seluruh area akun
 * dan portal: merah selalu berarti butuh perhatian, kuning berarti menunggu
 * seseorang, hijau berarti tuntas.
 */

export const CONFIGURATION_STATUS_TONE: Record<ConfigurationStatus, BadgeVariant> = {
  DRAFT: 'neutral',
  SUBMITTED: 'info',
  AWAITING_CUSTOM_ESTIMATE: 'warning',
  QUOTED: 'brand',
  LOCKED: 'accent',
  CONVERTED: 'success',
  ARCHIVED: 'outline',
};

export const PROJECT_STATUS_TONE: Record<ProjectStatus, BadgeVariant> = {
  PLANNING: 'neutral',
  IN_PROGRESS: 'info',
  UAT: 'warning',
  DELIVERED: 'success',
  ON_HOLD: 'warning',
  CANCELLED: 'danger',
};

export const TASK_STATUS_TONE: Record<TaskStatus, BadgeVariant> = {
  QUEUED: 'neutral',
  IN_PROGRESS: 'info',
  READY_FOR_REVIEW: 'warning',
  APPROVED: 'brand',
  DONE: 'success',
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

export const PAYMENT_STATUS_TONE: Record<PaymentStatus, BadgeVariant> = {
  PENDING: 'neutral',
  AWAITING_VERIFICATION: 'warning',
  SETTLED: 'success',
  FAILED: 'danger',
  REFUNDED: 'outline',
};

export const CHANGE_REQUEST_STATUS_TONE: Record<ChangeRequestStatus, BadgeVariant> = {
  DRAFT: 'neutral',
  SUBMITTED: 'info',
  ESTIMATED: 'brand',
  APPROVED: 'success',
  REJECTED: 'danger',
  CANCELLED: 'outline',
};

/**
 * Label riwayat versi rakitan (G3) dalam bahasa klien.
 *
 * enums.ts hanya menyimpan daftar aksinya; kalimat yang dibaca pemilik usaha
 * ditulis di sini supaya istilah internal seperti "override" tidak bocor ke
 * halaman akun.
 */
export const REVISION_ACTION_LABEL: Record<RevisionAction, string> = {
  CREATED: 'Rakitan dibuat',
  FEATURE_ADDED: 'Fitur ditambahkan',
  FEATURE_REMOVED: 'Fitur dihapus',
  PRESET_APPLIED: 'Paket siap pakai diterapkan',
  OPTIONS_CHANGED: 'Konfigurasi proyek diubah',
  CUSTOM_ADDED: 'Permintaan fitur custom diajukan',
  CUSTOM_REMOVED: 'Permintaan fitur custom dibatalkan',
  ADDON_CHANGED: 'Layanan tambahan diubah',
  SUBMITTED: 'Rakitan dikirim ke tim kami',
  PRICE_OVERRIDE: 'Penyesuaian harga oleh tim kami',
  ESTIMATE_UPDATED: 'Estimasi fitur custom masuk',
  PRICE_LOCKED: 'Harga dikunci',
};

export const REVISION_ACTION_TONE: Record<RevisionAction, BadgeVariant> = {
  CREATED: 'neutral',
  FEATURE_ADDED: 'success',
  FEATURE_REMOVED: 'danger',
  PRESET_APPLIED: 'brand',
  OPTIONS_CHANGED: 'info',
  CUSTOM_ADDED: 'accent',
  CUSTOM_REMOVED: 'outline',
  ADDON_CHANGED: 'info',
  SUBMITTED: 'brand',
  PRICE_OVERRIDE: 'warning',
  ESTIMATE_UPDATED: 'accent',
  PRICE_LOCKED: 'success',
};
