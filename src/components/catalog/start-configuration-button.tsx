'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, type ButtonSize, type ButtonVariant } from '@/components/ui';
import { track } from '@/lib/analytics/track';
import { cn } from '@/lib/utils';

export interface StartConfigurationButtonProps {
  categorySlug: string;
  /** Preset yang dipakai sebagai titik awal. Kosong = preset bawaan kategori. */
  presetSlug?: string | null;
  /** Jawaban wizard, dikirim apa adanya agar tersimpan di konfigurasi (B4). */
  wizardAnswers?: Record<string, string[]>;
  /** Dari pintu masuk mana rakitan ini dimulai — untuk corong konversi 4.2. */
  source: 'wizard' | 'direct' | 'preset';
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
  /** Ringkasan hasil wizard untuk event `wizard_completed`. */
  wizardSummary?: { answeredCount: number; mappedFeatures: number };
  /** Dipanggil tepat sebelum permintaan dikirim (mis. event `wizard_skipped`). */
  onBeforeStart?: () => void;
}

/**
 * Tombol pembuka konfigurator.
 *
 * Prinsip Produk #3 — "preset dulu, kustomisasi kemudian". Server yang memilih
 * preset bawaan bila `presetSlug` kosong, sehingga konfigurator tidak pernah
 * terbuka dalam keadaan kosong, dari pintu masuk mana pun.
 */
export function StartConfigurationButton({
  categorySlug,
  presetSlug,
  wizardAnswers,
  source,
  label,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
  wizardSummary,
  onBeforeStart,
}: StartConfigurationButtonProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    if (busy) return;
    setBusy(true);
    setError(null);
    onBeforeStart?.();

    try {
      const response = await fetch('/api/configurations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categorySlug,
          presetSlug: presetSlug ?? undefined,
          wizardAnswers,
        }),
      });

      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          payload && typeof payload === 'object' && 'error' in payload
            ? String((payload as { error: unknown }).error)
            : 'Rakitan belum bisa dibuka. Coba sesaat lagi.';
        setError(message);
        setBusy(false);
        return;
      }

      const token =
        payload && typeof payload === 'object' && 'token' in payload
          ? String((payload as { token: unknown }).token)
          : null;

      if (!token) {
        setError('Rakitan belum bisa dibuka. Coba sesaat lagi.');
        setBusy(false);
        return;
      }

      if (source === 'preset' && presetSlug) {
        track('preset_applied', { preset: presetSlug, category: categorySlug });
      }
      if (source === 'wizard') {
        track('wizard_completed', {
          category: categorySlug,
          answeredCount: wizardSummary?.answeredCount ?? 0,
          mappedFeatures: wizardSummary?.mappedFeatures ?? 0,
        });
      }
      track('configurator_opened', { category: categorySlug, source }, token);

      router.push(`/rakit/${token}`);
    } catch {
      // Jaringan putus di tengah jalan — pengguna diberi jalan mencoba lagi,
      // bukan halaman kosong tanpa penjelasan.
      setError('Koneksi terputus. Periksa jaringan Anda lalu coba lagi.');
      setBusy(false);
    }
  }

  return (
    <div className={cn('flex flex-col gap-2', fullWidth && 'w-full', className)}>
      <Button
        type="button"
        variant={variant}
        size={size}
        isLoading={busy}
        onClick={start}
        className={cn(fullWidth && 'w-full')}
      >
        {busy ? 'Menyiapkan rakitan…' : label}
      </Button>
      {error && (
        <p className="text-xs leading-snug text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
