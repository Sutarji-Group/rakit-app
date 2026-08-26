'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState, useTransition } from 'react';
import { useToast } from '@/components/ui';
import type { PortalActionResult } from '@/lib/services/portal';

/**
 * Pemanggil Server Action portal yang seragam.
 *
 * Aksi mengembalikan hasil sebagai data biasa, bukan exception, supaya
 * penolakan aturan bisnis (misalnya catatan revisi yang terlalu pendek) bisa
 * ditempelkan ke kolom form tanpa menghapus isian klien.
 */
export function usePortalAction() {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<PortalActionResult | null>(null);

  const run = useCallback(
    (task: () => Promise<PortalActionResult>, onSuccess?: () => void) => {
      startTransition(async () => {
        const outcome = await task();
        setResult(outcome);
        toast({
          title: outcome.message,
          tone: outcome.ok ? 'success' : 'danger',
          durationMs: outcome.ok ? 5_000 : 8_000,
        });
        if (outcome.ok) {
          router.refresh();
          onSuccess?.();
        }
      });
    },
    [router, toast],
  );

  const reset = useCallback(() => setResult(null), []);

  return { pending, result, run, reset };
}

/** Pesan kesalahan satu kolom form dari hasil aksi terakhir. */
export function portalFieldError(
  result: PortalActionResult | null,
  field: string,
): string | null {
  if (!result || result.ok) return null;
  return result.fieldErrors?.[field] ?? null;
}
