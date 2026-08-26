'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState, useTransition } from 'react';
import { useToast } from '@/components/ui';
import type { PipelineActionResult } from './shared';

/**
 * Pemanggil Server Action pipeline yang seragam.
 *
 * router.refresh() menyegarkan pohon Server Component saja — papan kanban
 * berpindah kolom tanpa memuat ulang halaman penuh (syarat O1) dan tanpa
 * kehilangan posisi gulir kolom.
 */
export function usePipelineAction() {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    (task: () => Promise<PipelineActionResult>, options?: { onSuccess?: () => void }) => {
      startTransition(async () => {
        const result = await task();
        setError(result.ok ? null : result.message);
        toast({
          title: result.ok ? 'Berhasil' : 'Tidak dapat dilakukan',
          description: result.message,
          // Override yang tertahan approval perlu waktu baca lebih panjang.
          tone: result.ok ? (result.needsApproval ? 'warning' : 'success') : 'danger',
          durationMs: result.needsApproval ? 9000 : 4500,
        });
        if (result.ok) {
          router.refresh();
          options?.onSuccess?.();
        }
      });
    },
    [router, toast],
  );

  const reset = useCallback(() => setError(null), []);

  return { pending, error, run, reset };
}
