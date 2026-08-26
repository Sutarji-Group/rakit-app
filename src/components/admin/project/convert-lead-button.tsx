'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import { convertLeadToProject } from '@/app/admin/proyek/actions';
import { useProjectAction } from './use-project-action';

/**
 * Tombol "Jadikan proyek" (P1).
 *
 * Satu klik, tanpa form: seluruh ruang lingkup sudah tertulis di konfigurasi
 * yang dimenangkan (Prinsip Produk #5), jadi tidak ada yang perlu diisi ulang.
 * Setelah proyek terbentuk, pengguna langsung dibawa ke papan pekerjaannya.
 */
export function ConvertLeadButton({
  leadId,
  quoteNumber,
}: {
  leadId: string;
  quoteNumber: string;
}) {
  const router = useRouter();
  const { pending, run } = useProjectAction();

  return (
    <Button
      type="button"
      size="sm"
      isLoading={pending}
      aria-label={`Jadikan penawaran ${quoteNumber} sebagai proyek`}
      onClick={() =>
        run(() => convertLeadToProject({ leadId }), {
          onSuccess: (result) => {
            if (result.projectId) router.push(`/admin/proyek/${result.projectId}`);
          },
        })
      }
    >
      Jadikan proyek
    </Button>
  );
}
