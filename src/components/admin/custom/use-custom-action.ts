'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState, useTransition } from 'react';
import { useToast } from '@/components/ui';
import type { CustomActionResult } from './shared';

interface RunOptions {
  /** Dijalankan hanya bila aksi berhasil. */
  onSuccess?: (result: CustomActionResult) => void;
}

/**
 * Pemanggil Server Action antrean custom yang seragam.
 *
 * Menyatukan tiga hal yang selalu berulang di setiap keputusan reviewer:
 * status pending, toast hasil, dan penyegaran data server setelah mutasi.
 * Hasil terakhir tetap disimpan agar form bisa menampilkan penjelasan panjang
 * (mis. tawaran konsultasi D7) yang tidak muat di toast.
 */
export function useCustomAction() {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<CustomActionResult | null>(null);

  const run = useCallback(
    (task: () => Promise<CustomActionResult>, options?: RunOptions) => {
      startTransition(async () => {
        const outcome = await task();
        setResult(outcome);
        toast({
          title: outcome.message,
          tone: outcome.ok ? (outcome.consultRequired ? 'warning' : 'success') : 'danger',
          // Tawaran konsultasi perlu waktu baca lebih panjang daripada sukses biasa.
          durationMs: outcome.consultRequired ? 9_000 : 4_500,
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
export function fieldError(result: CustomActionResult | null, field: string): string | null {
  if (!result || result.ok) return null;
  return result.fieldErrors?.[field] ?? null;
}
