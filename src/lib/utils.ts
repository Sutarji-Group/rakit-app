import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Menggabungkan class Tailwind dengan penyelesaian konflik. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Slug ramah URL dari teks bahasa Indonesia. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/** Membagi array menjadi potongan berukuran tetap. */
export function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

/** Menunda eksekusi fungsi sampai jeda tertentu berlalu tanpa panggilan baru. */
export function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  waitMs: number,
): ((...args: Args) => void) & { cancel: () => void; flush: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Args | null = null;

  const wrapped = (...args: Args) => {
    lastArgs = args;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      if (lastArgs) fn(...lastArgs);
    }, waitMs);
  };

  wrapped.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    lastArgs = null;
  };

  wrapped.flush = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    if (lastArgs) fn(...lastArgs);
    lastArgs = null;
  };

  return wrapped;
}
