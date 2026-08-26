'use client';

import { Button } from '@/components/ui';
import { claimForReview } from '@/app/admin/custom/actions';
import { useCustomAction } from './use-custom-action';

/**
 * Tombol "Ambil untuk direview".
 *
 * Mencegah dua reviewer mengerjakan permintaan yang sama sementara permintaan
 * lain lewat tenggat tanpa disentuh siapa pun (BR-04).
 */
export function ClaimButton({
  requestId,
  size = 'sm',
  label = 'Ambil untuk direview',
}: {
  requestId: string;
  size?: 'sm' | 'md';
  label?: string;
}) {
  const { pending, run } = useCustomAction();

  return (
    <Button
      size={size}
      variant="secondary"
      isLoading={pending}
      onClick={() => run(() => claimForReview(requestId))}
    >
      {label}
    </Button>
  );
}
