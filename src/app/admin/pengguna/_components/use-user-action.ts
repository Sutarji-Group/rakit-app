'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState, useTransition } from 'react';

import { useToast } from '@/components/ui';
import type { UserActionResult } from '../_lib/shared';

/**
 * Pemanggil Server Action manajemen pengguna yang seragam.
 *
 * Menyatukan tiga hal yang selalu berulang: status pending, toast hasil, dan
 * penyegaran data server setelah mutasi. Hasil terakhir disimpan agar form
 * dapat menempelkan pesan error pada kolom yang tepat.
 */
export function useUserAction() {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<UserActionResult | null>(null);

  const run = useCallback(
    (task: () => Promise<UserActionResult>, onSuccess?: () => void) => {
      startTransition(async () => {
        const outcome = await task();
        setResult(outcome);
        toast({ title: outcome.message, tone: outcome.ok ? 'success' : 'danger' });
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

/** Pesan error satu kolom form dari hasil aksi terakhir. */
export function fieldError(result: UserActionResult | null, field: string): string | null {
  if (!result || result.ok) return null;
  return result.fieldErrors?.[field] ?? null;
}
