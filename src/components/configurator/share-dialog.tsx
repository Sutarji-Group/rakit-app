'use client';

import { useState } from 'react';
import { Alert, Button, Dialog, Input } from '@/components/ui';
import { track } from '@/lib/analytics/track';

/**
 * Simpan & lanjutkan nanti dan bagikan lewat tautan unik (C5.3, C5.4).
 *
 * Tanpa perlu mendaftar akun: persona Sarah (IT/Operations Manager) perlu
 * mendiskusikan rakitan ini secara internal sebelum memutuskan, dan memaksanya
 * membuat akun lebih dulu hanya menambah friksi di titik paling rapuh.
 */
export function ShareDialog({
  open,
  onClose,
  token,
}: {
  open: boolean;
  onClose: () => void;
  token: string;
}) {
  const [copied, setCopied] = useState(false);
  const url =
    typeof window !== 'undefined' ? `${window.location.origin}/rakit/${token}` : `/rakit/${token}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      track('configuration_shared', { channel: 'salin-tautan' }, token);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  const whatsappText = encodeURIComponent(
    `Ini rakitan aplikasi yang saya susun, lengkap dengan estimasi harganya: ${url}`,
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="md"
      title="Simpan atau bagikan rakitan ini"
      description="Tautan berikut membuka rakitan Anda persis seperti sekarang. Tidak perlu mendaftar."
    >
      <div className="flex flex-col gap-4">
        <div className="flex gap-2">
          <Input value={url} readOnly onFocus={(e) => e.currentTarget.select()} />
          <Button onClick={copy} variant={copied ? 'secondary' : 'primary'} className="shrink-0">
            {copied ? 'Tersalin' : 'Salin'}
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary" size="sm">
            <a
              href={`https://wa.me/?text=${whatsappText}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track('configuration_shared', { channel: 'whatsapp' }, token)}
            >
              Kirim lewat WhatsApp
            </a>
          </Button>
          <Button asChild variant="secondary" size="sm">
            <a
              href={`mailto:?subject=${encodeURIComponent('Rakitan aplikasi')}&body=${whatsappText}`}
              onClick={() => track('configuration_shared', { channel: 'email' }, token)}
            >
              Kirim lewat email
            </a>
          </Button>
        </div>

        <Alert tone="neutral" title="Rakitan Anda tersimpan otomatis">
          Setiap perubahan langsung tersimpan. Menutup tab tidak akan menghilangkan progres —
          buka tautan di atas kapan saja untuk melanjutkan.
        </Alert>
      </div>
    </Dialog>
  );
}
