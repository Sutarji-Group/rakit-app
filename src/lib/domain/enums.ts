/**
 * Union type domain untuk kolom bertipe String di Prisma.
 *
 * SQLite tidak mendukung enum native, sehingga seluruh "enum" disimpan sebagai
 * String. Modul ini menjadi satu-satunya sumber kebenaran nilai yang sah plus
 * label bahasa Indonesia untuk ditampilkan di UI.
 */

// ---------------------------------------------------------------------------
// Pengguna
// ---------------------------------------------------------------------------

export const USER_ROLES = [
  'SUPER_ADMIN',
  'CATALOG_ADMIN',
  'CONSULTANT',
  'SALES',
  'PM',
  'CLIENT',
] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_ROLE_LABEL: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  CATALOG_ADMIN: 'Admin Katalog',
  CONSULTANT: 'Solution Consultant',
  SALES: 'Sales',
  PM: 'Project Manager',
  CLIENT: 'Klien',
};

/** Peran yang boleh masuk ke area /admin. */
export const INTERNAL_ROLES: UserRole[] = [
  'SUPER_ADMIN',
  'CATALOG_ADMIN',
  'CONSULTANT',
  'SALES',
  'PM',
];

// ---------------------------------------------------------------------------
// Katalog
// ---------------------------------------------------------------------------

export const PUBLISH_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;
export type PublishStatus = (typeof PUBLISH_STATUSES)[number];

export const PUBLISH_STATUS_LABEL: Record<PublishStatus, string> = {
  DRAFT: 'Draft',
  PUBLISHED: 'Terbit',
  ARCHIVED: 'Diarsipkan',
};

/**
 * Taksonomi fitur (PRD 6.1). CUSTOM tidak pernah tersimpan sebagai Feature —
 * ia hidup sebagai CustomFeatureRequest — tetapi tetap ikut di union karena
 * mesin harga memperlakukannya sebagai tipe keempat.
 */
export const FEATURE_TYPES = ['CORE', 'STANDARD', 'CONFIGURABLE', 'CUSTOM'] as const;
export type FeatureType = (typeof FEATURE_TYPES)[number];

/** Tipe yang boleh dipilih saat membuat entri katalog. */
export const CATALOG_FEATURE_TYPES: FeatureType[] = ['CORE', 'STANDARD', 'CONFIGURABLE'];

export const FEATURE_TYPE_LABEL: Record<FeatureType, string> = {
  CORE: 'Termasuk',
  STANDARD: 'Standar',
  CONFIGURABLE: 'Perlu Penyesuaian',
  CUSTOM: 'Custom',
};

/** Label internal (dipakai di admin, bukan di hadapan klien). */
export const FEATURE_TYPE_INTERNAL_LABEL: Record<FeatureType, string> = {
  CORE: 'Core',
  STANDARD: 'Standard',
  CONFIGURABLE: 'Configurable',
  CUSTOM: 'Custom',
};

export const FEATURE_TYPE_DESCRIPTION: Record<FeatureType, string> = {
  CORE: 'Modul fondasi. Otomatis termasuk dan tidak dapat dihapus.',
  STANDARD: 'Modul sudah tersedia di library kami, tinggal dipasang.',
  CONFIGURABLE: 'Modul tersedia, namun alur atau field-nya perlu disesuaikan dengan proses Anda.',
  CUSTOM: 'Belum ada di library. Perlu diestimasi oleh tim kami terlebih dahulu.',
};

export const DEPENDENCY_KINDS = ['REQUIRES', 'CONFLICTS_WITH', 'RECOMMENDS'] as const;
export type DependencyKind = (typeof DEPENDENCY_KINDS)[number];

export const DEPENDENCY_KIND_LABEL: Record<DependencyKind, string> = {
  REQUIRES: 'Membutuhkan',
  CONFLICTS_WITH: 'Konflik dengan',
  RECOMMENDS: 'Merekomendasikan',
};

export const MEDIA_KINDS = ['IMAGE', 'GIF', 'VIDEO', 'DIAGRAM'] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

export const WIZARD_INPUT_TYPES = ['SINGLE', 'MULTI'] as const;
export type WizardInputType = (typeof WIZARD_INPUT_TYPES)[number];

// ---------------------------------------------------------------------------
// Konfigurasi proyek (PRD 6.5)
// ---------------------------------------------------------------------------

export const PROJECT_PLATFORMS = ['WEB', 'WEB_PWA', 'WEB_NATIVE'] as const;
export type ProjectPlatform = (typeof PROJECT_PLATFORMS)[number];

export const PROJECT_PLATFORM_LABEL: Record<ProjectPlatform, string> = {
  WEB: 'Web saja',
  WEB_PWA: 'Web + Mobile (PWA)',
  WEB_NATIVE: 'Web + Mobile Native',
};

export const PROJECT_PLATFORM_DESCRIPTION: Record<ProjectPlatform, string> = {
  WEB: 'Diakses lewat browser di desktop maupun ponsel. Paling cepat dan paling hemat.',
  WEB_PWA: 'Dapat dipasang di layar utama ponsel, mendukung kamera dan mode offline terbatas.',
  WEB_NATIVE: 'Aplikasi terpisah di Play Store / App Store. Paling nyaman untuk operator lapangan.',
};

export const PROJECT_DEPLOYMENTS = ['OUR_CLOUD', 'CLIENT_SERVER', 'ON_PREMISE'] as const;
export type ProjectDeployment = (typeof PROJECT_DEPLOYMENTS)[number];

export const PROJECT_DEPLOYMENT_LABEL: Record<ProjectDeployment, string> = {
  OUR_CLOUD: 'Cloud kami',
  CLIENT_SERVER: 'Server milik Anda',
  ON_PREMISE: 'On-premise terisolasi',
};

export const PROJECT_DEPLOYMENT_DESCRIPTION: Record<ProjectDeployment, string> = {
  OUR_CLOUD: 'Kami yang mengurus server, backup, dan pembaruan keamanan.',
  CLIENT_SERVER: 'Aplikasi dipasang di server atau akun cloud milik Anda.',
  ON_PREMISE: 'Terpasang di jaringan internal tanpa akses internet keluar. Perlu prosedur rilis khusus.',
};

export const USER_TIERS = ['T10', 'T50', 'T200', 'T200_PLUS'] as const;
export type UserTier = (typeof USER_TIERS)[number];

export const USER_TIER_LABEL: Record<UserTier, string> = {
  T10: '≤ 10 pengguna',
  T50: '11 – 50 pengguna',
  T200: '51 – 200 pengguna',
  T200_PLUS: 'Lebih dari 200 pengguna',
};

export const ADDON_KINDS = [
  'INTEGRATION',
  'MIGRATION',
  'TRAINING',
  'MAINTENANCE',
  'HOSTING',
  'OTHER',
] as const;
export type AddOnKind = (typeof ADDON_KINDS)[number];

export const ADDON_KIND_LABEL: Record<AddOnKind, string> = {
  INTEGRATION: 'Integrasi pihak ketiga',
  MIGRATION: 'Migrasi data',
  TRAINING: 'Pelatihan & pendampingan',
  MAINTENANCE: 'Maintenance & SLA',
  HOSTING: 'Hosting & lisensi',
  OTHER: 'Lainnya',
};

// ---------------------------------------------------------------------------
// Konfigurasi
// ---------------------------------------------------------------------------

export const CONFIGURATION_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'AWAITING_CUSTOM_ESTIMATE',
  'QUOTED',
  'LOCKED',
  'CONVERTED',
  'ARCHIVED',
] as const;
export type ConfigurationStatus = (typeof CONFIGURATION_STATUSES)[number];

export const CONFIGURATION_STATUS_LABEL: Record<ConfigurationStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Terkirim',
  AWAITING_CUSTOM_ESTIMATE: 'Menunggu estimasi custom',
  QUOTED: 'Penawaran terbit',
  LOCKED: 'Harga terkunci',
  CONVERTED: 'Menjadi proyek',
  ARCHIVED: 'Diarsipkan',
};

/** Status yang membuat konfigurasi menjadi immutable snapshot (PRD bagian 10). */
export const FROZEN_CONFIGURATION_STATUSES: ConfigurationStatus[] = [
  'SUBMITTED',
  'AWAITING_CUSTOM_ESTIMATE',
  'QUOTED',
  'LOCKED',
  'CONVERTED',
  'ARCHIVED',
];

export const CONFIGURATION_SOURCES = [
  'DIRECT',
  'WIZARD',
  'PRESET',
  'DUPLICATE',
  'CHANGE_REQUEST',
] as const;
export type ConfigurationSource = (typeof CONFIGURATION_SOURCES)[number];

export const ITEM_ORIGINS = [
  'PRESET',
  'USER',
  'DEPENDENCY',
  'WIZARD',
  'CORE_AUTO',
  'CHANGE_REQUEST',
] as const;
export type ItemOrigin = (typeof ITEM_ORIGINS)[number];

export const REVISION_ACTIONS = [
  'CREATED',
  'FEATURE_ADDED',
  'FEATURE_REMOVED',
  'PRESET_APPLIED',
  'OPTIONS_CHANGED',
  'CUSTOM_ADDED',
  'CUSTOM_REMOVED',
  'ADDON_CHANGED',
  'SUBMITTED',
  'PRICE_OVERRIDE',
  'ESTIMATE_UPDATED',
  'PRICE_LOCKED',
] as const;
export type RevisionAction = (typeof REVISION_ACTIONS)[number];

export const SNAPSHOT_REASONS = [
  'AUTOSAVE',
  'SUBMIT',
  'REVIEW_UPDATE',
  'LOCK',
  'OVERRIDE',
  'ADDENDUM',
] as const;
export type SnapshotReason = (typeof SNAPSHOT_REASONS)[number];

// ---------------------------------------------------------------------------
// Fitur custom
// ---------------------------------------------------------------------------

export const CUSTOM_REQUEST_STATUSES = [
  'PENDING',
  'IN_REVIEW',
  'NEEDS_CLARIFICATION',
  'ESTIMATED',
  'REJECTED',
  'CONSULT_REQUIRED',
  'PROMOTED',
] as const;
export type CustomRequestStatus = (typeof CUSTOM_REQUEST_STATUSES)[number];

export const CUSTOM_REQUEST_STATUS_LABEL: Record<CustomRequestStatus, string> = {
  PENDING: 'Menunggu review',
  IN_REVIEW: 'Sedang direview',
  NEEDS_CLARIFICATION: 'Perlu klarifikasi',
  ESTIMATED: 'Sudah diestimasi',
  REJECTED: 'Tidak dapat dikerjakan',
  CONSULT_REQUIRED: 'Perlu sesi konsultasi',
  PROMOTED: 'Dipromosikan ke katalog',
};

/** Status yang membuat nilai custom ikut dihitung ke total (BR-02). */
export const COUNTED_CUSTOM_STATUSES: CustomRequestStatus[] = ['ESTIMATED', 'PROMOTED'];

export const REQUEST_PRIORITIES = ['MUST_HAVE', 'NICE_TO_HAVE'] as const;
export type RequestPriority = (typeof REQUEST_PRIORITIES)[number];

export const REQUEST_PRIORITY_LABEL: Record<RequestPriority, string> = {
  MUST_HAVE: 'Wajib ada',
  NICE_TO_HAVE: 'Bagus kalau ada',
};

export const RISK_LEVELS = ['LOW', 'MEDIUM', 'HIGH'] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export const RISK_LEVEL_LABEL: Record<RiskLevel, string> = {
  LOW: 'Rendah',
  MEDIUM: 'Sedang',
  HIGH: 'Tinggi',
};

// ---------------------------------------------------------------------------
// Pipeline lead
// ---------------------------------------------------------------------------

export const LEAD_STAGES = [
  'NEW',
  'IN_REVIEW',
  'DISCOVERY_SCHEDULED',
  'FINAL_PROPOSAL',
  'NEGOTIATION',
  'WON',
  'LOST',
] as const;
export type LeadStage = (typeof LEAD_STAGES)[number];

export const LEAD_STAGE_LABEL: Record<LeadStage, string> = {
  NEW: 'Baru',
  IN_REVIEW: 'Sedang Direview',
  DISCOVERY_SCHEDULED: 'Discovery Terjadwal',
  FINAL_PROPOSAL: 'Proposal Final',
  NEGOTIATION: 'Negosiasi',
  WON: 'Menang',
  LOST: 'Kalah',
};

/** Urutan kolom papan kanban (O1). */
export const LEAD_PIPELINE_STAGES: LeadStage[] = [
  'NEW',
  'IN_REVIEW',
  'DISCOVERY_SCHEDULED',
  'FINAL_PROPOSAL',
  'NEGOTIATION',
  'WON',
  'LOST',
];

export const LOST_REASONS = [
  'HARGA_TERLALU_TINGGI',
  'PILIH_KOMPETITOR',
  'ANGGARAN_DITUNDA',
  'BANGUN_SENDIRI',
  'FITUR_TIDAK_COCOK',
  'TIDAK_RESPONS',
  'LAINNYA',
] as const;
export type LostReason = (typeof LOST_REASONS)[number];

export const LOST_REASON_LABEL: Record<LostReason, string> = {
  HARGA_TERLALU_TINGGI: 'Harga terlalu tinggi',
  PILIH_KOMPETITOR: 'Memilih kompetitor',
  ANGGARAN_DITUNDA: 'Anggaran ditunda',
  BANGUN_SENDIRI: 'Memutuskan bangun sendiri',
  FITUR_TIDAK_COCOK: 'Fitur tidak sesuai kebutuhan',
  TIDAK_RESPONS: 'Tidak merespons',
  LAINNYA: 'Lainnya',
};

export const BUDGET_BANDS = [
  'UNKNOWN',
  'UNDER_50',
  'B50_100',
  'B100_250',
  'B250_500',
  'ABOVE_500',
] as const;
export type BudgetBand = (typeof BUDGET_BANDS)[number];

export const BUDGET_BAND_LABEL: Record<BudgetBand, string> = {
  UNKNOWN: 'Belum ditentukan',
  UNDER_50: 'Di bawah Rp 50 juta',
  B50_100: 'Rp 50 – 100 juta',
  B100_250: 'Rp 100 – 250 juta',
  B250_500: 'Rp 250 – 500 juta',
  ABOVE_500: 'Di atas Rp 500 juta',
};

export const ACTIVITY_KINDS = [
  'NOTE',
  'STAGE_CHANGE',
  'CALL',
  'EMAIL',
  'REMINDER',
  'OVERRIDE',
  'SYSTEM',
] as const;
export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

export const ACTIVITY_KIND_LABEL: Record<ActivityKind, string> = {
  NOTE: 'Catatan',
  STAGE_CHANGE: 'Perubahan tahap',
  CALL: 'Panggilan',
  EMAIL: 'Email',
  REMINDER: 'Pengingat',
  OVERRIDE: 'Override harga',
  SYSTEM: 'Sistem',
};

export const OVERRIDE_STATUSES = ['NONE', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'] as const;
export type OverrideStatus = (typeof OVERRIDE_STATUSES)[number];

export const OVERRIDE_STATUS_LABEL: Record<OverrideStatus, string> = {
  NONE: 'Tanpa override',
  PENDING_APPROVAL: 'Menunggu persetujuan',
  APPROVED: 'Disetujui',
  REJECTED: 'Ditolak',
};

// ---------------------------------------------------------------------------
// Proyek & portal
// ---------------------------------------------------------------------------

export const PROJECT_STATUSES = [
  'PLANNING',
  'IN_PROGRESS',
  'UAT',
  'DELIVERED',
  'ON_HOLD',
  'CANCELLED',
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  PLANNING: 'Perencanaan',
  IN_PROGRESS: 'Dikerjakan',
  UAT: 'UAT',
  DELIVERED: 'Serah terima',
  ON_HOLD: 'Ditahan',
  CANCELLED: 'Dibatalkan',
};

/** Papan status per fitur di portal klien (J1). */
export const TASK_STATUSES = [
  'QUEUED',
  'IN_PROGRESS',
  'READY_FOR_REVIEW',
  'APPROVED',
  'DONE',
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  QUEUED: 'Antre',
  IN_PROGRESS: 'Dikerjakan',
  READY_FOR_REVIEW: 'Siap Direview',
  APPROVED: 'Disetujui',
  DONE: 'Selesai',
};

/** Bobot progres per status untuk menghitung persentase proyek (J2). */
export const TASK_STATUS_WEIGHT: Record<TaskStatus, number> = {
  QUEUED: 0,
  IN_PROGRESS: 0.4,
  READY_FOR_REVIEW: 0.75,
  APPROVED: 0.95,
  DONE: 1,
};

export const MILESTONE_STATUSES = [
  'PENDING',
  'IN_PROGRESS',
  'AWAITING_APPROVAL',
  'APPROVED',
  'REVISION_REQUESTED',
] as const;
export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];

export const MILESTONE_STATUS_LABEL: Record<MilestoneStatus, string> = {
  PENDING: 'Belum mulai',
  IN_PROGRESS: 'Berjalan',
  AWAITING_APPROVAL: 'Menunggu persetujuan',
  APPROVED: 'Disetujui',
  REVISION_REQUESTED: 'Minta revisi',
};

export const INVOICE_KINDS = ['DOWN_PAYMENT', 'MILESTONE', 'ADDENDUM', 'MAINTENANCE'] as const;
export type InvoiceKind = (typeof INVOICE_KINDS)[number];

export const INVOICE_KIND_LABEL: Record<InvoiceKind, string> = {
  DOWN_PAYMENT: 'Uang muka',
  MILESTONE: 'Termin milestone',
  ADDENDUM: 'Addendum',
  MAINTENANCE: 'Maintenance',
};

export const INVOICE_STATUSES = [
  'DRAFT',
  'SENT',
  'PARTIALLY_PAID',
  'PAID',
  'OVERDUE',
  'CANCELLED',
] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  DRAFT: 'Draft',
  SENT: 'Terkirim',
  PARTIALLY_PAID: 'Dibayar sebagian',
  PAID: 'Lunas',
  OVERDUE: 'Jatuh tempo',
  CANCELLED: 'Dibatalkan',
};

export const PAYMENT_METHODS = [
  'VA',
  'CREDIT_CARD',
  'EWALLET',
  'QRIS',
  'MANUAL_TRANSFER',
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  VA: 'Virtual Account',
  CREDIT_CARD: 'Kartu kredit',
  EWALLET: 'E-wallet',
  QRIS: 'QRIS',
  MANUAL_TRANSFER: 'Transfer manual',
};

export const PAYMENT_STATUSES = [
  'PENDING',
  'AWAITING_VERIFICATION',
  'SETTLED',
  'FAILED',
  'REFUNDED',
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  PENDING: 'Menunggu pembayaran',
  AWAITING_VERIFICATION: 'Menunggu verifikasi',
  SETTLED: 'Diterima',
  FAILED: 'Gagal',
  REFUNDED: 'Dikembalikan',
};

export const CONTRACT_STATUSES = ['DRAFT', 'SENT', 'SIGNED', 'CANCELLED'] as const;
export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

export const CONTRACT_STATUS_LABEL: Record<ContractStatus, string> = {
  DRAFT: 'Draft',
  SENT: 'Dikirim ke klien',
  SIGNED: 'Ditandatangani',
  CANCELLED: 'Dibatalkan',
};

export const CHANGE_REQUEST_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'ESTIMATED',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
] as const;
export type ChangeRequestStatus = (typeof CHANGE_REQUEST_STATUSES)[number];

export const CHANGE_REQUEST_STATUS_LABEL: Record<ChangeRequestStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Diajukan',
  ESTIMATED: 'Sudah diestimasi',
  APPROVED: 'Disetujui',
  REJECTED: 'Ditolak',
  CANCELLED: 'Dibatalkan',
};

export const DOCUMENT_KINDS = [
  'CONTRACT',
  'SOW',
  'PROPOSAL',
  'MANUAL',
  'TRAINING',
  'OTHER',
] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

export const DOCUMENT_KIND_LABEL: Record<DocumentKind, string> = {
  CONTRACT: 'Kontrak',
  SOW: 'Scope of Work',
  PROPOSAL: 'Penawaran',
  MANUAL: 'Manual pengguna',
  TRAINING: 'Materi pelatihan',
  OTHER: 'Lainnya',
};

// ---------------------------------------------------------------------------
// Konsultasi
// ---------------------------------------------------------------------------

export const CONSULTATION_TOPICS = [
  'OTHER_APP',
  'UNSURE',
  'STUCK_IN_CONFIGURATOR',
  'MOSTLY_CUSTOM',
  'TOO_MANY_CUSTOM',
  'BELOW_MIN_VALUE',
] as const;
export type ConsultationTopic = (typeof CONSULTATION_TOPICS)[number];

export const CONSULTATION_TOPIC_LABEL: Record<ConsultationTopic, string> = {
  OTHER_APP: 'Aplikasi lain di luar katalog',
  UNSURE: 'Belum yakin butuh aplikasi apa',
  STUCK_IN_CONFIGURATOR: 'Butuh bantuan di konfigurator',
  MOSTLY_CUSTOM: 'Kebutuhan mayoritas custom',
  TOO_MANY_CUSTOM: 'Fitur custom melebihi batas',
  BELOW_MIN_VALUE: 'Konfigurasi di bawah proyek minimum',
};

export const CONSULTATION_STATUSES = ['NEW', 'CONTACTED', 'SCHEDULED', 'CLOSED'] as const;
export type ConsultationStatus = (typeof CONSULTATION_STATUSES)[number];

export const CONSULTATION_STATUS_LABEL: Record<ConsultationStatus, string> = {
  NEW: 'Baru',
  CONTACTED: 'Sudah dihubungi',
  SCHEDULED: 'Terjadwal',
  CLOSED: 'Selesai',
};

// ---------------------------------------------------------------------------
// Utilitas
// ---------------------------------------------------------------------------

/** Mengembalikan nilai bila termasuk daftar sah, jika tidak memakai fallback. */
export function coerceEnum<T extends string>(
  value: string | null | undefined,
  allowed: readonly T[],
  fallback: T,
): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}
