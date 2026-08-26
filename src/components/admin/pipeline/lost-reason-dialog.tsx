'use client';

import { useEffect, useState } from 'react';
import { Button, Dialog, Field, Select, Textarea } from '@/components/ui';
import { LOST_REASONS, LOST_REASON_LABEL, type LostReason } from '@/lib/domain/enums';

/**
 * Dialog yang memaksa pengisian alasan kalah (O5).
 *
 * moveLeadStage() sudah menolak perpindahan ke Kalah tanpa alasan; dialog ini
 * membuat penolakan itu tidak pernah sampai terjadi, sekaligus memastikan
 * agregat alasan kalah di papan benar-benar terisi.
 */
export function LostReasonDialog({
  open,
  leadName,
  pending,
  onClose,
  onConfirm,
}: {
  open: boolean;
  leadName: string;
  pending: boolean;
  onClose: () => void;
  onConfirm: (reason: LostReason, note: string) => void;
}) {
  const [reason, setReason] = useState<LostReason | ''>('');
  const [note, setNote] = useState('');

  // Isian direset tiap kali dialog dibuka untuk lead lain.
  useEffect(() => {
    if (open) {
      setReason('');
      setNote('');
    }
  }, [open, leadName]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      dismissible={!pending}
      title="Mengapa lead ini kalah?"
      description={`${leadName} akan dipindahkan ke kolom Kalah. Alasan wajib diisi — inilah data yang dipakai untuk memperbaiki katalog dan harga.`}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
            Batal
          </Button>
          <Button
            type="button"
            variant="danger"
            isLoading={pending}
            disabled={pending || !reason}
            onClick={() => reason && onConfirm(reason, note)}
          >
            Pindahkan ke Kalah
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Alasan kalah" required htmlFor="alasan-kalah">
          <Select
            id="alasan-kalah"
            value={reason}
            invalid={!reason}
            onChange={(event) => setReason(event.target.value as LostReason)}
          >
            <option value="">Pilih alasan…</option>
            {LOST_REASONS.map((value) => (
              <option key={value} value={value}>
                {LOST_REASON_LABEL[value]}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Catatan tambahan"
          htmlFor="catatan-kalah"
          hint="Contoh: nama kompetitor, selisih harga, atau fitur yang tidak tersedia."
        >
          <Textarea
            id="catatan-kalah"
            value={note}
            maxLength={1000}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Opsional, tetapi sangat membantu saat kalibrasi harga."
          />
        </Field>
      </div>
    </Dialog>
  );
}
