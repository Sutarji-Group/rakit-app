'use client';

import { useState } from 'react';

import { Alert, Button, useToast } from '@/components/ui';

/**
 * Kartu "Salin tautan untuk dikirim ke klien" (N6).
 *
 * Platform ini tidak punya layanan email maupun WhatsApp gateway. Menampilkan
 * "notifikasi terkirim" padahal tidak ada yang dikirim akan membuat tim mengira
 * klien sudah tahu — kesalahan yang justru paling merusak kepercayaan pada
 * SLA 1×24 jam. Jadi yang disediakan adalah bahan kirim yang jujur: pesan siap
 * salin dan tautan konfigurasi yang sudah lengkap.
 */
export function NotifyLink({
  title,
  hint,
  link,
  message,
}: {
  title: string;
  hint: string;
  link: string;
  message: string;
}) {
  const { toast } = useToast();
  const [copied, setCopied] = useState<'link' | 'message' | null>(null);

  async function copy(value: string, which: 'link' | 'message') {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(which);
      toast({
        title: which === 'link' ? 'Tautan tersalin.' : 'Pesan tersalin.',
        tone: 'success',
      });
    } catch {
      // Beberapa browser menolak akses papan klip tanpa HTTPS; teks tetap
      // terlihat penuh di bawah agar dapat disalin manual.
      toast({
        title: 'Browser menolak akses papan klip. Salin manual dari kotak di bawah.',
        tone: 'warning',
      });
    }
  }

  return (
    <Alert tone="brand" title={title}>
      <p className="mb-3">{hint}</p>

      <pre className="mb-3 max-h-56 overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-surface p-3 text-xs leading-relaxed text-fg scrollbar-slim">
        {message}
      </pre>

      <p className="mb-3 break-all rounded-lg border border-border bg-surface px-3 py-2 text-xs text-fg-muted">
        {link}
      </p>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => copy(link, 'link')}>
          {copied === 'link' ? 'Tautan tersalin' : 'Salin tautan untuk dikirim ke klien'}
        </Button>
        <Button size="sm" variant="secondary" onClick={() => copy(message, 'message')}>
          {copied === 'message' ? 'Pesan tersalin' : 'Salin pesan lengkap'}
        </Button>
      </div>
    </Alert>
  );
}
