'use client';

import Link from 'next/link';
import { ArrowRight, CirclePlus } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { createChangeRequestAction } from '@/app/portal/actions';
import { usePortalAction } from './use-portal-action';

/**
 * Pintu masuk change request dari halaman proyek (K1).
 *
 * Tombol membuat rakitan addendum lalu langsung membuka konfigurator; fitur
 * yang sudah terpasang di proyek ikut terbawa dan ditandai, jadi klien tidak
 * perlu merakit ulang dari nol hanya untuk menambah satu modul.
 */
export function ChangeRequestLauncher({
  projectId,
  openCount,
  totalCount,
}: {
  projectId: string;
  openCount: number;
  totalCount: number;
}) {
  const { pending, run } = usePortalAction();

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-fg">Perlu menambah fitur?</h2>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-fg-muted">
            {totalCount === 0
              ? 'Tambahan fitur di luar lingkup awal dicatat sebagai addendum, lengkap dengan nilai dan dampaknya terhadap tanggal selesai.'
              : `${totalCount} permintaan perubahan tercatat pada proyek ini${
                  openCount > 0 ? `, ${openCount} di antaranya masih terbuka.` : '.'
                }`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => run(() => createChangeRequestAction(projectId))}
            isLoading={pending}
            leadingIcon={<CirclePlus className="size-4" aria-hidden="true" />}
          >
            Tambah fitur ke proyek ini
          </Button>
          {totalCount > 0 && (
            <Button asChild variant="secondary">
              <Link href={`/portal/${projectId}/perubahan`}>
                Lihat daftar
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
