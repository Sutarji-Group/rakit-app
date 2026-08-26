'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { ArrowRight, Copy, GitCompareArrows, History, Radar } from 'lucide-react';
import { Badge, Button, Card, Checkbox, EmptyState, useToast } from '@/components/ui';
import { CONFIGURATION_STATUS_TONE } from './status';
import { CONFIGURATION_STATUS_LABEL } from '@/lib/domain/enums';
import { formatDate, formatRupiahRange, formatWeekRange } from '@/lib/format';
import type { SavedConfiguration } from '@/app/akun/_lib/queries';

/**
 * Daftar rakitan tersimpan (G2).
 *
 * Perbandingan sengaja dibatasi dua rakitan. Pemilik usaha membandingkan
 * "versi hemat" melawan "versi lengkap"; menampilkan tiga kolom di layar 390px
 * membuat keduanya sama-sama tidak terbaca.
 */
export function SavedConfigurationList({ items }: { items: SavedConfiguration[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string[]>([]);

  const compareHref = useMemo(
    () =>
      selected.length === 2
        ? `/akun/bandingkan?a=${encodeURIComponent(selected[0])}&b=${encodeURIComponent(selected[1])}`
        : null,
    [selected],
  );

  function toggle(token: string, checked: boolean) {
    setSelected((prev) => {
      if (checked) {
        // Pilihan ketiga menggeser yang paling lama dipilih, bukan ditolak diam-diam.
        const next = [...prev.filter((item) => item !== token), token];
        return next.slice(-2);
      }
      return prev.filter((item) => item !== token);
    });
  }

  function duplicate(token: string, name: string) {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/configurations/${token}/duplicate`, { method: 'POST' });
        const data = (await response.json()) as { token?: string; error?: string };
        if (!response.ok || !data.token) {
          toast({ title: data.error ?? 'Rakitan gagal diduplikat.', tone: 'danger' });
          return;
        }
        toast({
          title: 'Salinan dibuat',
          description: `"${name}" disalin. Ubah salinannya tanpa menyentuh rakitan asli.`,
          tone: 'success',
        });
        router.refresh();
      } catch {
        toast({ title: 'Jaringan bermasalah. Coba lagi sebentar lagi.', tone: 'danger' });
      }
    });
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="Belum ada rakitan tersimpan"
        description="Pilih jenis aplikasi, rakit fiturnya, dan rakitan Anda otomatis tersimpan di sini."
        action={
          <Button asChild>
            <Link href="/aplikasi">Mulai rakit sekarang</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => {
        const isSelected = selected.includes(item.token);
        return (
          <Card key={item.token} className="p-4 sm:p-5">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold leading-tight text-fg">{item.name}</h3>
                    <Badge variant={CONFIGURATION_STATUS_TONE[item.status]}>
                      {CONFIGURATION_STATUS_LABEL[item.status]}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-fg-muted">
                    {item.categoryName} · {item.featureCount} fitur
                    {item.customCount > 0 && ` · ${item.customCount} fitur custom`}
                  </p>
                </div>

                <Checkbox
                  id={`bandingkan-${item.token}`}
                  checked={isSelected}
                  onChange={(event) => toggle(item.token, event.target.checked)}
                  label="Bandingkan"
                />
              </div>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-y border-border py-3 sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-fg-subtle">Estimasi biaya</dt>
                  <dd className="tabular mt-0.5 text-sm font-semibold text-fg">
                    {formatRupiahRange(item.totalMin, item.totalMax)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-fg-subtle">Waktu pengerjaan</dt>
                  <dd className="tabular mt-0.5 text-sm font-semibold text-fg">
                    {formatWeekRange(item.durationWeeksMin, item.durationWeeksMax)}
                  </dd>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <dt className="text-xs text-fg-subtle">Terakhir diubah</dt>
                  <dd className="mt-0.5 text-sm text-fg">{formatDate(item.updatedAt)}</dd>
                </div>
              </dl>

              <div className="flex flex-wrap items-center gap-2">
                <Button asChild size="sm">
                  <Link href={`/rakit/${item.token}`}>
                    {item.isEditable ? 'Lanjutkan merakit' : 'Lihat rakitan'}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </Button>

                <Button asChild size="sm" variant="secondary">
                  <Link href={`/akun/rakitan/${item.token}/riwayat`}>
                    <History className="size-4" aria-hidden="true" />
                    Riwayat
                  </Link>
                </Button>

                <Button
                  size="sm"
                  variant="secondary"
                  disabled={pending}
                  onClick={() => duplicate(item.token, item.name)}
                  leadingIcon={<Copy className="size-4" aria-hidden="true" />}
                >
                  Duplikat
                </Button>

                {item.projectId && (
                  <Button asChild size="sm" variant="ghost">
                    <Link href={`/portal/${item.projectId}`}>
                      <Radar className="size-4" aria-hidden="true" />
                      Portal proyek {item.projectCode}
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </Card>
        );
      })}

      {selected.length > 0 && (
        <div className="sticky bottom-3 z-30 mt-1">
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface-raised p-3 shadow-md">
            <p className="min-w-0 flex-1 text-sm text-fg-muted">
              {selected.length === 1
                ? 'Pilih satu rakitan lagi untuk dibandingkan.'
                : 'Dua rakitan siap dibandingkan berdampingan.'}
            </p>
            <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
              Batal
            </Button>
            {compareHref && (
              <Button asChild size="sm">
                <Link href={compareHref}>
                  <GitCompareArrows className="size-4" aria-hidden="true" />
                  Bandingkan
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
