/**
 * Helper murni bersama papan analitik (PRD bagian 4, modul Q).
 *
 * Berkas ini sengaja tidak memakai 'server-only': halaman analitik dan seluruh
 * grafiknya adalah Server Component, tetapi aritmetika serta label di sini juga
 * dipakai kartu ringkasan di /admin. Satu sumber kebenaran agar angka pada dua
 * papan yang berbeda tidak pernah bercerita berbeda.
 */

/** Nada batang grafik — hanya token semantik agar mode gelap ikut benar. */
export type ChartTone =
  | 'brand'
  | 'accent'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger'
  | 'neutral';

export const CHART_BAR_CLASS: Record<ChartTone, string> = {
  brand: 'bg-brand',
  accent: 'bg-accent',
  info: 'bg-info',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  neutral: 'bg-border-strong',
};

/**
 * Lebar batang dalam persen terhadap nilai terbesar.
 *
 * Nilai bukan nol selalu mendapat minimal 1,5% supaya kategori kecil tetap
 * terbaca sebagai batang, bukan lenyap menjadi garis rambut.
 */
export function barWidth(value: number, max: number): string {
  if (max <= 0 || value <= 0) return '0%';
  return `${Math.max(1.5, (value / max) * 100)}%`;
}

/** Status pencapaian target: memenuhi, belum, atau memang belum ada datanya. */
export type TargetStatus = 'MEMENUHI' | 'BELUM' | 'TANPA_DATA';

export const TARGET_STATUS_LABEL: Record<TargetStatus, string> = {
  MEMENUHI: 'Memenuhi target',
  BELUM: 'Belum memenuhi',
  TANPA_DATA: 'Belum ada data',
};

export const TARGET_STATUS_VARIANT: Record<TargetStatus, 'success' | 'danger' | 'neutral'> = {
  MEMENUHI: 'success',
  BELUM: 'danger',
  TANPA_DATA: 'neutral',
};

export function targetStatus(meets: boolean | null | undefined): TargetStatus {
  if (meets === null || meets === undefined) return 'TANPA_DATA';
  return meets ? 'MEMENUHI' : 'BELUM';
}

/**
 * Label langkah konfigurator pada event configuration_abandoned.
 *
 * Payload event menyimpan slug agar tetap stabil walau tampilan berubah; peta
 * ini hanya untuk mata manusia. Slug yang belum dikenal tetap ditampilkan apa
 * adanya setelah dirapikan, supaya langkah baru tidak diam-diam hilang dari
 * laporan hanya karena petanya belum diperbarui.
 */
export const ABANDON_STEP_LABEL: Record<string, string> = {
  konfigurator: 'Memilih fitur di konfigurator',
  'konfigurasi-proyek': 'Mengisi opsi proyek (platform, deployment, pengguna)',
  ringkasan: 'Membaca ringkasan harga',
  'formulir-kontak': 'Mengisi formulir kontak',
  wizard: 'Wizard rekomendasi',
  'tidak diketahui': 'Langkah tidak terekam',
};

export function abandonStepLabel(step: string): string {
  const known = ABANDON_STEP_LABEL[step];
  if (known) return known;
  const readable = step.replace(/[-_]+/g, ' ').trim();
  return readable.charAt(0).toUpperCase() + readable.slice(1);
}

/**
 * Nada untuk deviasi estimasi man-day (Q5).
 *
 * Dua arah meleset punya akibat berbeda: aktual lebih lama dari referensi
 * memakan margin (bahaya), aktual jauh lebih cepat berarti kami menjual terlalu
 * mahal dan kalah bersaing (perlu dikoreksi, tetapi tidak menggerus margin).
 */
export function deviationTone(deviationPct: number, tolerance = 0.15): ChartTone {
  if (Math.abs(deviationPct) <= tolerance) return 'success';
  return deviationPct > 0 ? 'danger' : 'warning';
}

export function deviationReading(deviationPct: number, tolerance = 0.15): string {
  if (Math.abs(deviationPct) <= tolerance) return 'Dalam toleransi';
  return deviationPct > 0
    ? 'Aktual lebih lama dari referensi — margin tergerus'
    : 'Aktual jauh lebih cepat — harga kemungkinan kemahalan';
}

/** Periode laporan yang tersedia di penyaring halaman analitik. */
export const ANALYTICS_PERIODS = [
  { value: '7', days: 7, label: '7 hari' },
  { value: '30', days: 30, label: '30 hari' },
  { value: '90', days: 90, label: '90 hari' },
] as const;

export const DEFAULT_ANALYTICS_PERIOD = '30';

export function resolvePeriodDays(value: string | undefined): number {
  return ANALYTICS_PERIODS.find((period) => period.value === value)?.days ?? 30;
}
