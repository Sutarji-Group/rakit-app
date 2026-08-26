'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState, useTransition } from 'react';
import { useToast } from '@/components/ui';
import type { CatalogActionResult } from './shared';

interface RunOptions {
  /** Dijalankan hanya bila aksi berhasil. */
  onSuccess?: (result: CatalogActionResult) => void;
}

/**
 * Pemanggil Server Action katalog yang seragam.
 *
 * Semua aksi modul ini mengembalikan CatalogActionResult sebagai data biasa,
 * bukan exception, supaya penolakan aturan bisnis (BR-05, dependensi melingkar)
 * dapat ditempelkan ke kolom form tanpa menghapus isian admin. Hook ini
 * menyatukan tiga hal yang selalu berulang: status pending, toast hasil, dan
 * penyegaran data server setelah mutasi.
 */
export function useCatalogAction() {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<CatalogActionResult | null>(null);

  const run = useCallback(
    (task: () => Promise<CatalogActionResult>, options?: RunOptions) => {
      startTransition(async () => {
        const outcome = await task();
        setResult(outcome);
        toast({
          title: outcome.message,
          description: outcome.warnings?.length ? outcome.warnings.join(' ') : undefined,
          tone: outcome.ok ? (outcome.warnings?.length ? 'warning' : 'success') : 'danger',
          // Peringatan perlu waktu baca lebih panjang daripada pesan sukses biasa.
          durationMs: outcome.warnings?.length ? 10_000 : 4_500,
        });
        if (outcome.ok) {
          router.refresh();
          options?.onSuccess?.(outcome);
        }
      });
    },
    [router, toast],
  );

  const reset = useCallback(() => setResult(null), []);

  return { pending, result, run, reset };
}

/** Pesan error satu kolom form dari hasil aksi terakhir. */
export function fieldError(
  result: CatalogActionResult | null,
  field: string,
): string | null {
  if (!result || result.ok) return null;
  return result.fieldErrors?.[field] ?? null;
}
