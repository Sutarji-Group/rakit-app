'use client';

import { Button } from '@/components/ui';
import { setConsultationStatus } from '@/app/admin/konsultasi/actions';
import { CONSULTATION_NEXT_LABEL, CONSULTATION_NEXT_STATUS } from './shared';
import { useCustomAction } from './use-custom-action';
import type { ConsultationStatus } from '@/lib/domain/enums';

/**
 * Tombol pemindah tahap permintaan konsultasi (NEW → CONTACTED → SCHEDULED → CLOSED).
 *
 * Hanya satu langkah maju yang ditawarkan sekali waktu supaya papan tidak
 * berubah menjadi daftar pilihan status yang harus dipikirkan — yang dibutuhkan
 * penerima telepon cuma satu: "sudah saya hubungi".
 */
export function ConsultationActions({
  id,
  status,
}: {
  id: string;
  status: ConsultationStatus;
}) {
  const { pending, run } = useCustomAction();
  const next = CONSULTATION_NEXT_STATUS[status];

  if (!next) {
    return (
      <Button
        size="sm"
        variant="ghost"
        isLoading={pending}
        onClick={() => run(() => setConsultationStatus(id, 'NEW'))}
      >
        Buka lagi
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Button
        size="sm"
        variant="secondary"
        isLoading={pending}
        onClick={() => run(() => setConsultationStatus(id, next))}
      >
        {CONSULTATION_NEXT_LABEL[status]}
      </Button>
      {next !== 'CLOSED' && (
        <Button
          size="sm"
          variant="ghost"
          isLoading={pending}
          onClick={() => run(() => setConsultationStatus(id, 'CLOSED'))}
        >
          Tutup
        </Button>
      )}
    </div>
  );
}
