'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState, useTransition } from 'react';
import { useToast } from '@/components/ui';
import type { ProjectActionResult } from './shared';

/**
 * Pemanggil Server Action modul proyek yang seragam.
 *
 * router.refresh() hanya menyegarkan pohon Server Component, sehingga status
 * satu item pekerjaan dapat diubah berkali-kali tanpa memuat ulang halaman dan
 * tanpa kehilangan posisi gulir papan yang biasanya panjang.
 */
export function useProjectAction() {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    (
      task: () => Promise<ProjectActionResult>,
      options?: { onSuccess?: (result: ProjectActionResult) => void },
    ) => {
      startTransition(async () => {
        const result = await task();
        setError(result.ok ? null : result.message);
        toast({
          title: result.ok ? 'Berhasil' : 'Tidak dapat dilakukan',
          description: result.message,
          tone: result.ok ? 'success' : 'danger',
          durationMs: result.ok ? 4000 : 6000,
        });
        if (result.ok) {
          router.refresh();
          options?.onSuccess?.(result);
        }
      });
    },
    [router, toast],
  );

  const reset = useCallback(() => setError(null), []);

  return { pending, error, run, reset };
}
