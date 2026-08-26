/**
 * Helper murni bersama modul antrean fitur custom (PRD bagian D, modul N).
 *
 * Berkas ini sengaja tidak memakai 'server-only' maupun 'use client': halaman
 * (Server Component) dan form estimasinya (Client Component) harus memakai
 * aritmetika serta label yang persis sama, supaya angka yang dilihat reviewer
 * saat mengetik identik dengan yang divalidasi ulang server sebelum disimpan.
 */

import type { BadgeVariant } from '@/components/ui';
import type {
  ConsultationStatus,
  ConsultationTopic,
  CustomRequestStatus,
  RiskLevel,
} from '@/lib/domain/enums';
// Impor tipe saja — modul servicenya 'server-only', tetapi tipe dihapus saat
// kompilasi sehingga berkas ini tetap aman dipakai di browser.
import type { SlaHealth } from '@/lib/services/custom-request';
import { priceMultiplierFor, type PricingRuleSnapshot } from '@/lib/pricing';

// ---------------------------------------------------------------------------
// Hasil aksi
// ---------------------------------------------------------------------------

/**
 * Bentuk balasan seragam untuk seluruh Server Action modul ini.
 *
 * Penolakan aturan bisnis (mis. lebar rentang tipe Custom pada BR-05)
 * dikembalikan sebagai data biasa, bukan exception, agar form dapat
 * menempelkan pesannya tanpa menghapus isian yang sudah diketik reviewer.
 */
export interface CustomActionResult {
  ok: boolean;
  message: string;
  /** Pesan error per nama kolom form. */
  fieldErrors?: Record<string, string>;
  /** true bila effort melampaui ambang dan sistem menawarkan konsultasi (D7). */
  consultRequired?: boolean;
  /** Tautan siap salin untuk dikirim manual ke klien (N6). */
  notifyLink?: string;
  /** Id entitas baru, mis. fitur katalog hasil promosi. */
  createdId?: string;
}

export function actionOk(
  message: string,
  extra: Omit<CustomActionResult, 'ok' | 'message'> = {},
): CustomActionResult {
  return { ok: true, message, ...extra };
}

export function actionFail(
  message: string,
  fieldErrors?: Record<string, string>,
): CustomActionResult {
  return { ok: false, message, fieldErrors };
}

// ---------------------------------------------------------------------------
// Penghitung SLA (N1)
// ---------------------------------------------------------------------------

export const SLA_HEALTH_LABEL: Record<SlaHealth, string> = {
  HIJAU: 'Aman',
  KUNING: 'Mendekati tenggat',
  MERAH: 'Lewat tenggat',
};

export const SLA_HEALTH_VARIANT: Record<SlaHealth, BadgeVariant> = {
  HIJAU: 'success',
  KUNING: 'warning',
  MERAH: 'danger',
};

/** Urutan kegentingan untuk menaikkan yang paling mendesak ke atas antrean. */
export const SLA_HEALTH_RANK: Record<SlaHealth, number> = {
  MERAH: 0,
  KUNING: 1,
  HIJAU: 2,
};

// ---------------------------------------------------------------------------
// Status permintaan
// ---------------------------------------------------------------------------

export const CUSTOM_STATUS_VARIANT: Record<CustomRequestStatus, BadgeVariant> = {
  PENDING: 'warning',
  IN_REVIEW: 'info',
  NEEDS_CLARIFICATION: 'accent',
  ESTIMATED: 'success',
  REJECTED: 'danger',
  CONSULT_REQUIRED: 'brand',
  PROMOTED: 'success',
};

/**
 * Status yang masih membebani antrean dan karena itu ikut dihitung SLA.
 * Permintaan yang sudah diestimasi/ditolak tidak lagi punya tenggat berjalan.
 */
export const OPEN_CUSTOM_STATUSES: CustomRequestStatus[] = [
  'PENDING',
  'IN_REVIEW',
  'NEEDS_CLARIFICATION',
];

export function isOpenCustomStatus(status: CustomRequestStatus): boolean {
  return OPEN_CUSTOM_STATUSES.includes(status);
}

export const RISK_LEVEL_VARIANT: Record<RiskLevel, BadgeVariant> = {
  LOW: 'success',
  MEDIUM: 'warning',
  HIGH: 'danger',
};

/**
 * Penjelasan risiko dalam bahasa dampak, bukan bahasa developer.
 * Reviewer memilih tingkat risiko sambil membaca konsekuensinya.
 */
export const RISK_LEVEL_HINT: Record<RiskLevel, string> = {
  LOW: 'Polanya sudah pernah kami bangun. Rentang man-day kemungkinan besar tepat.',
  MEDIUM: 'Ada bagian yang belum pernah dikerjakan persis seperti ini. Perlu buffer.',
  HIGH: 'Banyak yang belum diketahui — integrasi asing, aturan bisnis berlapis, atau data kotor.',
};

// ---------------------------------------------------------------------------
// Harga jual turunan fitur custom (N3)
// ---------------------------------------------------------------------------

export interface DerivedCustomPrice {
  min: number;
  max: number;
  multiplier: number;
}

/**
 * Harga jual satu fitur custom: man-day × tarif referensi × pengali custom.
 *
 * Rumus mengikuti langkah pertama computePrice() (PRD 6.4) — dan persis sama
 * dengan yang dipakai submitEstimate() di server — sehingga angka yang muncul
 * saat reviewer mengetik tidak pernah berbeda dari yang tersimpan.
 */
export function deriveCustomSellPrice(
  rule: PricingRuleSnapshot,
  manDayMin: number,
  manDayMax: number,
): DerivedCustomPrice {
  const multiplier = priceMultiplierFor(rule, 'CUSTOM');
  return {
    min: Math.round(manDayMin * rule.referenceRatePerManDay * multiplier),
    max: Math.round(manDayMax * rule.referenceRatePerManDay * multiplier),
    multiplier,
  };
}

/** Angka man-day dari isian teks; NaN dianggap nol agar form tidak meledak. */
export function parseManDay(raw: string): number {
  const value = Number.parseFloat(raw.replace(',', '.'));
  return Number.isFinite(value) ? value : 0;
}

// ---------------------------------------------------------------------------
// Bentuk masukan Server Action
// ---------------------------------------------------------------------------
//
// Tipe masukan tinggal di sini, bukan di berkas 'use server', karena berkas
// Server Action hanya boleh mengekspor fungsi async.

export interface EstimateFormInput {
  requestId: string;
  manDayMin: number;
  manDayMax: number;
  riskLevel: RiskLevel;
  internalNote: string;
}

export interface PromoteFormInput {
  requestId: string;
  categoryId: string;
  groupId: string;
  slug: string;
  name: string;
  clientDescription: string;
  internalDescription: string;
  type: 'STANDARD' | 'CONFIGURABLE';
  manDayMin: number;
  manDayMax: number;
  publishNow: boolean;
}

// ---------------------------------------------------------------------------
// Konsultasi
// ---------------------------------------------------------------------------

export const CONSULTATION_STATUS_VARIANT: Record<ConsultationStatus, BadgeVariant> = {
  NEW: 'warning',
  CONTACTED: 'info',
  SCHEDULED: 'brand',
  CLOSED: 'neutral',
};

/** Alur penanganan konsultasi: setiap status hanya punya satu langkah maju. */
export const CONSULTATION_NEXT_STATUS: Record<ConsultationStatus, ConsultationStatus | null> = {
  NEW: 'CONTACTED',
  CONTACTED: 'SCHEDULED',
  SCHEDULED: 'CLOSED',
  CLOSED: null,
};

export const CONSULTATION_NEXT_LABEL: Record<ConsultationStatus, string> = {
  NEW: 'Tandai sudah dihubungi',
  CONTACTED: 'Tandai terjadwal',
  SCHEDULED: 'Tandai selesai',
  CLOSED: 'Sudah selesai',
};

/**
 * Topik yang lahir dari pagar pengaman, bukan dari kebingungan klien (D3, BR-13).
 *
 * Keduanya perlu ditandai khusus: klien sebenarnya sudah tahu apa yang ia mau,
 * sistemlah yang sengaja menahannya di depan pintu — jadi pembukaan
 * percakapannya berbeda dari klien yang memang belum yakin.
 */
export const GUARDRAIL_TOPICS: ConsultationTopic[] = ['BELOW_MIN_VALUE', 'TOO_MANY_CUSTOM'];

export function isGuardrailTopic(topic: ConsultationTopic): boolean {
  return GUARDRAIL_TOPICS.includes(topic);
}

export const GUARDRAIL_TOPIC_REASON: Record<string, string> = {
  BELOW_MIN_VALUE:
    'Rakitannya di bawah nilai proyek minimum (BR-13), sehingga konfigurator mengarahkan ke percakapan alih-alih menerbitkan penawaran.',
  TOO_MANY_CUSTOM:
    'Klien mencapai batas 5 fitur khusus (BR-03). Kebutuhan sebanyak ini memang lebih tepat dibahas langsung.',
};
