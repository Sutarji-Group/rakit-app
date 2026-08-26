'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Dialog, useToast } from '@/components/ui';
import { activatePricingRule, deletePricingRule } from '@/app/admin/harga/actions';

/**
 * Tombol aktifkan & hapus pada satu baris riwayat versi (M8).
 *
 * Penghapusan diminta konfirmasi karena versi aturan adalah arsip harga:
 * begitu sebuah versi pernah dipakai, riwayat penawaran ikut bergantung padanya
 * (BR-07) dan Server Action akan menolak permintaannya.
 */
export function VersionActions({
  ruleId,
  version,
  isActive,
  usageCount,
}: {
  ruleId: string;
  version: number;
  isActive: boolean;
  /** Konfigurasi mana pun yang memakai versi ini, termasuk yang masih draft. */
  usageCount: number;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const deletable = !isActive && usageCount === 0;

  const run = (task: () => Promise<{ ok: boolean; message: string }>) => {
    startTransition(async () => {
      const result = await task();
      toast({
        title: result.ok ? 'Berhasil' : 'Tidak dapat dilakukan',
        description: result.message,
        tone: result.ok ? 'success' : 'danger',
      });
      setConfirmOpen(false);
      if (result.ok) router.refresh();
    });
  };

  return (
    <div className="flex items-center justify-end gap-1">
      {!isActive && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={pending}
          onClick={() => run(() => activatePricingRule(ruleId))}
        >
          Aktifkan
        </Button>
      )}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={pending || !deletable}
        title={
          isActive
            ? 'Versi aktif tidak dapat dihapus. Aktifkan versi lain lebih dulu.'
            : usageCount > 0
              ? `Sudah dipakai ${usageCount} konfigurasi — riwayat harga harus tetap dapat dihitung ulang (BR-07).`
              : undefined
        }
        onClick={() => setConfirmOpen(true)}
      >
        Hapus
      </Button>

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={`Hapus versi draft v${version}?`}
        description="Versi ini belum pernah dipakai konfigurasi mana pun, sehingga aman dihapus. Tindakan ini tidak dapat dibatalkan."
        footer={
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmOpen(false)}
              disabled={pending}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="danger"
              isLoading={pending}
              disabled={pending}
              onClick={() => run(() => deletePricingRule(ruleId))}
            >
              Hapus versi
            </Button>
          </div>
        }
      />
    </div>
  );
}
