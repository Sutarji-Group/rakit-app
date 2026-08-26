/** Pemformatan angka, mata uang, dan tanggal dalam konvensi Indonesia. */

const rupiahFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat('id-ID', {
  maximumFractionDigits: 0,
});

/** "Rp 56.800.000" */
export function formatRupiah(value: number): string {
  return rupiahFormatter.format(Math.round(value)).replace(/\s/g, ' ');
}

/**
 * Bentuk ringkas untuk panel harga dan kartu kategori: "Rp 56 jt", "Rp 1,2 M".
 * Dipakai ketika ruang layar terbatas, terutama di mobile (≤ 390px).
 */
export function formatRupiahShort(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) {
    const billions = value / 1_000_000_000;
    const text = billions % 1 === 0 ? billions.toFixed(0) : billions.toFixed(1);
    return `Rp ${text.replace('.', ',')} M`;
  }
  if (abs >= 1_000_000) {
    return `Rp ${numberFormatter.format(Math.round(value / 1_000_000))} jt`;
  }
  if (abs >= 1_000) {
    return `Rp ${numberFormatter.format(Math.round(value / 1_000))} rb`;
  }
  return `Rp ${numberFormatter.format(value)}`;
}

/** Rentang harga untuk klien: "Rp 56 jt – Rp 72 jt". */
export function formatRupiahRange(min: number, max: number, short = true): string {
  const fmt = short ? formatRupiahShort : formatRupiah;
  if (min === max) return fmt(min);
  return `${fmt(min)} – ${fmt(max)}`;
}

export function formatNumber(value: number, fractionDigits = 0): string {
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatPercent(value: number, fractionDigits = 0): string {
  return `${formatNumber(value * 100, fractionDigits)}%`;
}

/** "3 – 5 minggu" */
export function formatWeekRange(min: number, max: number): string {
  if (min === max) return `${min} minggu`;
  return `${min} – ${max} minggu`;
}

export function formatManDay(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return `${formatNumber(rounded, rounded % 1 === 0 ? 0 : 1)} hari`;
}

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return '—';
  return dateFormatter.format(typeof value === 'string' ? new Date(value) : value);
}

export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return '—';
  return dateTimeFormatter.format(typeof value === 'string' ? new Date(value) : value);
}

/** "3 hari lagi", "terlambat 2 jam" — untuk penghitung SLA (N1). */
export function formatRelativeDeadline(due: Date | string): string {
  const target = typeof due === 'string' ? new Date(due) : due;
  const diffMs = target.getTime() - Date.now();
  const absMs = Math.abs(diffMs);
  const hours = Math.floor(absMs / 3_600_000);
  const minutes = Math.floor((absMs % 3_600_000) / 60_000);

  const parts: string[] = [];
  if (hours >= 24) {
    parts.push(`${Math.floor(hours / 24)} hari`);
    if (hours % 24 > 0) parts.push(`${hours % 24} jam`);
  } else if (hours > 0) {
    parts.push(`${hours} jam`);
    if (minutes > 0) parts.push(`${minutes} menit`);
  } else {
    parts.push(`${Math.max(minutes, 1)} menit`);
  }

  const text = parts.join(' ');
  return diffMs >= 0 ? `${text} lagi` : `terlambat ${text}`;
}

/** "12 menit" untuk metrik waktu di konfigurator. */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)} detik`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} menit`;
  const hours = Math.floor(minutes / 60);
  return `${hours} jam ${minutes % 60} menit`;
}

/** Nomor penawaran/invoice berurutan: RKT-2026-0001. */
export function buildDocumentNumber(prefix: string, year: number, sequence: number): string {
  return `${prefix}-${year}-${String(sequence).padStart(4, '0')}`;
}
