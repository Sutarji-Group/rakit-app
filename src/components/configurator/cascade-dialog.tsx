'use client';

import { Button, Dialog } from '@/components/ui';
import type { PendingCascade } from '@/lib/configurator/store';

/**
 * Konfirmasi penghapusan berantai (C3.4).
 *
 * Menghapus fitur yang menjadi prasyarat fitur lain akan menyeret fitur-fitur
 * itu ikut keluar. Tanpa konfirmasi, klien kehilangan bagian rakitannya tanpa
 * tahu penyebabnya — dan menyalahkan sistem, bukan dependensinya.
 */
export function CascadeDialog({
  pending,
  onConfirm,
  onCancel,
}: {
  pending: PendingCascade | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!pending) return null;

  const count = pending.cascade.length;

  return (
    <Dialog
      open
      onClose={onCancel}
      size="md"
      title={`Hapus “${pending.featureName}” beserta ${count} fitur lainnya?`}
      description={
        `${count === 1 ? 'Satu fitur' : `${count} fitur`} di rakitan Anda membutuhkan fitur ini ` +
        'untuk bisa berjalan, jadi mereka ikut terhapus.'
      }
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            Batal, pertahankan
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            Hapus {count + 1} fitur
          </Button>
        </>
      }
    >
      <ul className="flex flex-col gap-2">
        {pending.cascade.map((impact) => (
          <li
            key={impact.featureId}
            className="flex items-start gap-2.5 rounded-lg border border-border bg-surface-sunken/50 px-3 py-2.5"
          >
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-danger" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium text-fg">{impact.featureName}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-fg-muted">
                Bergantung pada “{impact.becauseOfName}”.
              </p>
            </div>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}
