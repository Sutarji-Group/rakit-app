'use client';

import { useMemo, useState } from 'react';
import { Alert, Button, Card, CardContent, Textarea } from '@/components/ui';
import { cn } from '@/lib/utils';
import { track } from '@/lib/analytics/track';

/**
 * Penjadwalan discovery call setelah pengiriman penawaran (PRD F6).
 *
 * Slot dibatasi hari kerja pukul 09.00–16.00 karena inilah jam tim konsultan
 * tersedia; menawarkan slot yang tidak bisa dipenuhi hanya memindahkan
 * kekecewaan ke kemudian hari.
 */
export function ScheduleCall({
  leadId,
  quoteNumber,
  alreadyScheduledAt,
}: {
  leadId: string;
  quoteNumber: string;
  alreadyScheduledAt: string | null;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [scheduled, setScheduled] = useState<string | null>(alreadyScheduledAt);
  const [error, setError] = useState<string | null>(null);

  const slots = useMemo(() => buildSlots(), []);

  if (scheduled) {
    return (
      <Alert tone="success" title="Sesi konsultasi Anda sudah terjadwal">
        Kami menunggu Anda pada{' '}
        <strong className="font-semibold">
          {new Date(scheduled).toLocaleString('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </strong>
        . Undangan kalender dan tautan pertemuan dikirim ke email Anda.
      </Alert>
    );
  }

  async function submit() {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/leads/${leadId}/jadwal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ at: selected, note: note || undefined }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? 'Penjadwalan gagal. Coba pilih waktu lain.');
        return;
      }
      track('call_scheduled', { quote_number: quoteNumber });
      setScheduled(selected);
    } catch {
      setError('Koneksi terputus. Coba lagi sebentar lagi.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-5">
        <h2 className="text-base font-semibold text-fg">
          Kunci harga tetap lewat sesi 30 menit
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-fg-muted">
          Di sesi ini kami menyelaraskan rakitan Anda dengan proses kerja sebenarnya, lalu
          mengunci satu harga tetap yang berlaku 30 hari — menggantikan rentang di penawaran.
        </p>

        <div className="mt-4 flex flex-col gap-4">
          {slots.map((day) => (
            <div key={day.label}>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-fg-subtle">
                {day.label}
              </p>
              <div className="flex flex-wrap gap-2">
                {day.times.map((slot) => (
                  <button
                    key={slot.iso}
                    type="button"
                    onClick={() => setSelected(slot.iso)}
                    className={cn(
                      'tabular rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                      selected === slot.iso
                        ? 'border-brand bg-brand text-brand-fg'
                        : 'border-border bg-surface text-fg-muted hover:border-border-strong hover:text-fg',
                    )}
                  >
                    {slot.label}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Ada hal khusus yang ingin dibahas di sesi ini? (opsional)"
            aria-label="Catatan untuk sesi konsultasi"
          />

          {error && (
            <Alert tone="danger" title="Penjadwalan belum tersimpan">
              {error}
            </Alert>
          )}

          <Button onClick={submit} disabled={!selected} isLoading={saving} size="lg">
            {selected ? 'Konfirmasi jadwal ini' : 'Pilih waktu dulu'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** Menyusun slot hari kerja tiga hari ke depan, pukul 09.00–16.00. */
function buildSlots(): Array<{ label: string; times: Array<{ iso: string; label: string }> }> {
  const days: Array<{ label: string; times: Array<{ iso: string; label: string }> }> = [];
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  while (days.length < 3) {
    cursor.setDate(cursor.getDate() + 1);
    const weekday = cursor.getDay();
    if (weekday === 0 || weekday === 6) continue;

    const times = [9, 11, 13, 15].map((hour) => {
      const slot = new Date(cursor);
      slot.setHours(hour, 0, 0, 0);
      return {
        iso: slot.toISOString(),
        label: `${String(hour).padStart(2, '0')}.00`,
      };
    });

    days.push({
      label: cursor.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }),
      times,
    });
  }

  return days;
}
