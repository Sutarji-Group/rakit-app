'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link2, Unlink, Info } from 'lucide-react';
import { Alert, Badge, Button, Checkbox, FeatureTypeBadge, Progress } from '@/components/ui';
import {
  buildDependencyGraph,
  resolveAdd,
  resolveRemove,
  type DependencyEdge,
  type DependencyFeature,
} from '@/lib/configurator/dependency';
import { formatRupiahShort } from '@/lib/format';
import { BASELINE_PRICING_RULE, computePrice, type PriceInputFeature } from '@/lib/pricing';
import { cn } from '@/lib/utils';

/**
 * DEMO MINI KONFIGURATOR (PRD A2).
 *
 * Ini penjelas produk paling efektif di landing: satu kalimat pun tidak
 * seampuh melihat angka bergerak sendiri saat sebuah fitur dicentang.
 *
 * Dua keputusan penting:
 *
 *  1. Angkanya dihitung `computePrice()` dengan BASELINE_PRICING_RULE — mesin
 *     harga yang sama persis dengan konfigurator sungguhan. Tidak ada angka
 *     karangan di halaman ini, karena seluruh janji produk ini adalah
 *     transparansi harga; demo yang berbohong akan meruntuhkannya.
 *  2. Mesin dependensi asli (`resolveAdd`/`resolveRemove`) juga dipakai, jadi
 *     contoh “fitur ini menarik prasyaratnya” bukan animasi palsu melainkan
 *     perilaku sistem yang sebenarnya (Prinsip Produk #2).
 */

interface DemoFeature extends PriceInputFeature {
  /** Kalimat manfaat operasional, bukan penjelasan teknis (Prinsip Produk #4). */
  blurb: string;
}

/**
 * Tujuh fitur contoh dari katalog gudang. Rentang man-day mengikuti batas
 * lebar rentang per tipe (BR-05): Core ≤1,15× · Standard ≤1,30× ·
 * Configurable ≤1,80×.
 */
const DEMO_FEATURES: DemoFeature[] = [
  {
    id: 'master-barang',
    name: 'Daftar barang & kode SKU',
    type: 'CORE',
    groupName: 'Data Induk',
    manDayMin: 3.5,
    manDayMax: 4,
    blurb: 'Satu daftar barang yang dipakai semua tim, lengkap dengan satuan dan barcode.',
  },
  {
    id: 'terima-po',
    name: 'Penerimaan barang dari PO',
    type: 'STANDARD',
    groupName: 'Barang Masuk',
    manDayMin: 4,
    manDayMax: 5,
    blurb: 'Barang datang dicocokkan dengan pesanan, selisihnya tercatat saat itu juga.',
  },
  {
    id: 'lokasi-rak',
    name: 'Penyimpanan per rak & lokasi',
    type: 'STANDARD',
    groupName: 'Penyimpanan',
    manDayMin: 3.5,
    manDayMax: 4.5,
    blurb: 'Setiap barang punya alamat rak, jadi tidak ada lagi barang yang ada tapi tidak ketemu.',
  },
  {
    id: 'picking-surat-jalan',
    name: 'Picking list & surat jalan',
    type: 'STANDARD',
    groupName: 'Barang Keluar',
    manDayMin: 4.5,
    manDayMax: 5.5,
    blurb: 'Daftar ambil barang dan surat jalan tercetak dari data yang sama, tanpa ketik ulang.',
  },
  {
    id: 'scan-barcode',
    name: 'Scan barcode lewat ponsel',
    type: 'CONFIGURABLE',
    groupName: 'Operasional',
    manDayMin: 4,
    manDayMax: 6,
    blurb: 'Operator memindai barang memakai ponsel biasa, tanpa membeli alat scanner khusus.',
  },
  {
    id: 'stock-opname',
    name: 'Stock opname per rak',
    type: 'CONFIGURABLE',
    groupName: 'Kontrol Stok',
    manDayMin: 4,
    manDayMax: 6,
    blurb: 'Hitung stok bertahap per rak, gudang tidak perlu tutup seharian penuh.',
  },
  {
    id: 'laporan-stok',
    name: 'Laporan nilai persediaan',
    type: 'STANDARD',
    groupName: 'Laporan',
    manDayMin: 3,
    manDayMax: 3.8,
    blurb: 'Nilai stok dan pergerakan barang bisa Anda lihat sendiri, tanpa minta rekap ke admin.',
  },
];

/**
 * Satu sisi dependensi nyata: surat jalan tidak berarti apa-apa kalau sistem
 * tidak tahu barang diambil dari rak mana.
 */
const DEMO_EDGES: DependencyEdge[] = [
  {
    featureId: 'picking-surat-jalan',
    targetFeatureId: 'lokasi-rak',
    kind: 'REQUIRES',
    note:
      'Kami ikut menambahkan “Penyimpanan per rak & lokasi”, karena picking list perlu tahu ' +
      'barang diambil dari rak yang mana. Tanpa itu surat jalan hanya jadi daftar tanpa alamat.',
  },
];

const DEPENDENCY_FEATURES: DependencyFeature[] = DEMO_FEATURES.map((feature) => ({
  id: feature.id,
  name: feature.name,
  type: feature.type,
  groupId: feature.groupName ?? 'demo',
  isEssential: feature.type === 'CORE',
}));

const GRAPH = buildDependencyGraph(DEPENDENCY_FEATURES, DEMO_EDGES);
const FEATURE_BY_ID = new Map(DEMO_FEATURES.map((feature) => [feature.id, feature]));

/** Rakitan awal: fondasi + dua fitur, supaya angka punya ruang naik dan turun. */
const INITIAL_SELECTION = ['master-barang', 'terima-po', 'laporan-stok'];

function priceFor(ids: Iterable<string>) {
  return computePrice({
    rule: BASELINE_PRICING_RULE,
    features: DEMO_FEATURES.filter((feature) => new Set(ids).has(feature.id)),
    platform: 'WEB',
    deployment: 'OUR_CLOUD',
    userTier: 'T50',
    // Biaya berulang selalu terpisah dari nilai proyek (BR-12); di demo ini
    // sengaja tidak ikut dihitung agar satu angka berarti satu hal saja.
    includeUserTierRecurring: false,
  });
}

/** Batas bawah & atas skala demo, dipakai sebagai konteks bar posisi harga. */
const FLOOR_TOTAL = priceFor(['master-barang']).displayTotalMin;
const CEILING_TOTAL = priceFor(DEMO_FEATURES.map((feature) => feature.id)).displayTotalMax;

/**
 * Menganimasikan perubahan angka.
 *
 * Tujuannya bukan hiasan: pergerakan angka membuat hubungan sebab-akibat
 * “saya mencentang ini, karena itu harganya naik segini” terasa, bukan sekadar
 * terbaca. Preferensi gerak minimal tetap dihormati (WCAG 2.3.3).
 */
function useAnimatedNumber(target: number, durationMs = 520): number {
  const [display, setDisplay] = useState(target);
  const displayRef = useRef(target);

  useEffect(() => {
    const from = displayRef.current;
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion || Math.abs(target - from) < 0.5) {
      displayRef.current = target;
      setDisplay(target);
      return;
    }

    let frame = 0;
    const startedAt = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / durationMs);
      const eased = 1 - (1 - progress) ** 3;
      const next = from + (target - from) * eased;
      displayRef.current = next;
      setDisplay(next);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);

  return display;
}

interface Notice {
  tone: 'brand' | 'warning';
  title: string;
  body: string;
}

export function MiniConfigurator({ className }: { className?: string }) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(INITIAL_SELECTION));
  const [notice, setNotice] = useState<Notice | null>(null);
  const [delta, setDelta] = useState<number | null>(null);

  const breakdown = useMemo(() => priceFor(selected), [selected]);

  const animatedMin = useAnimatedNumber(breakdown.displayTotalMin);
  const animatedMax = useAnimatedNumber(breakdown.displayTotalMax);
  const animatedWeeksMin = useAnimatedNumber(breakdown.duration.weeksMin, 420);
  const animatedWeeksMax = useAnimatedNumber(breakdown.duration.weeksMax, 420);

  // Selisih harga muncul sebentar setelah setiap perubahan, sebagai penegas
  // sebab-akibat pilihan → harga.
  const previousTotalRef = useRef(breakdown.displayTotalMin);
  useEffect(() => {
    const previous = previousTotalRef.current;
    previousTotalRef.current = breakdown.displayTotalMin;
    if (previous === breakdown.displayTotalMin) return;
    setDelta(breakdown.displayTotalMin - previous);
    const timer = setTimeout(() => setDelta(null), 2200);
    return () => clearTimeout(timer);
  }, [breakdown.displayTotalMin]);

  function toggle(featureId: string) {
    const feature = FEATURE_BY_ID.get(featureId);
    if (!feature) return;

    if (selected.has(featureId)) {
      const result = resolveRemove(GRAPH, selected, featureId);
      if (result.blockedReason) {
        setNotice({
          tone: 'warning',
          title: 'Fitur ini tidak dapat dilepas',
          body: result.blockedReason,
        });
        return;
      }
      setSelected(result.selected);
      setNotice(
        result.cascade.length > 0
          ? {
              tone: 'warning',
              title: 'Satu fitur ikut dilepas',
              body:
                `“${result.cascade[0].featureName}” ikut dilepas karena membutuhkan ` +
                `“${feature.name}”. Di konfigurator penuh, Anda dimintai konfirmasi lebih dulu.`,
            }
          : null,
      );
      return;
    }

    const result = resolveAdd(GRAPH, selected, featureId);
    setSelected(result.selected);
    setNotice(
      result.added.length > 0
        ? { tone: 'brand', title: 'Prasyarat ikut ditambahkan', body: result.added[0].reason }
        : null,
    );
  }

  const selectedCount = selected.size;
  const span = Math.max(1, CEILING_TOTAL - FLOOR_TOTAL);
  const positionPct = ((breakdown.displayTotalMax - FLOOR_TOTAL) / span) * 100;

  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-surface shadow-md',
        className,
      )}
    >
      {/* Panel harga dibuat menempel di atas supaya pada layar 390px angka
          tetap terlihat sementara jari menyalakan fitur di bawahnya. */}
      <div className="sticky top-16 z-10 rounded-t-xl border-b border-border bg-surface/95 p-4 backdrop-blur-sm sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">
            Estimasi nilai proyek
          </p>
          <Badge variant="neutral">{selectedCount} dari {DEMO_FEATURES.length} fitur</Badge>
        </div>

        <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <p className="tabular text-[26px] font-semibold leading-none tracking-[-0.03em] text-fg sm:text-3xl">
            {formatRupiahShort(animatedMin)}
            <span className="mx-1.5 font-normal text-fg-subtle">–</span>
            {formatRupiahShort(animatedMax)}
          </p>
          {delta !== null && (
            <span
              className={cn(
                'tabular animate-fade-in rounded-md px-1.5 py-1 text-[11px] font-semibold leading-none',
                delta > 0 ? 'bg-accent-soft text-accent-soft-fg' : 'bg-success-soft text-success-soft-fg',
              )}
            >
              {delta > 0 ? '+' : '−'}
              {formatRupiahShort(Math.abs(delta))}
            </span>
          )}
        </div>

        <p className="mt-2 text-sm text-fg-muted">
          Perkiraan pengerjaan{' '}
          <span className="tabular font-medium text-fg">
            {Math.round(animatedWeeksMin)} – {Math.round(animatedWeeksMax)} minggu
          </span>
        </p>

        <Progress
          value={positionPct}
          className="mt-3"
          aria-hidden="true"
        />

        {/* Pembacaan layar tidak perlu mengikuti animasi; cukup nilai akhirnya. */}
        <p className="sr-only" aria-live="polite">
          Estimasi nilai proyek {formatRupiahShort(breakdown.displayTotalMin)} sampai{' '}
          {formatRupiahShort(breakdown.displayTotalMax)}, perkiraan pengerjaan{' '}
          {breakdown.duration.weeksMin} sampai {breakdown.duration.weeksMax} minggu, dengan{' '}
          {selectedCount} fitur terpilih.
        </p>
      </div>

      <div className="flex flex-col gap-2 p-4 sm:p-5">
        <p className="text-sm font-medium text-fg">Coba centang dan lepas fiturnya</p>

        <ul className="flex flex-col gap-2">
          {DEMO_FEATURES.map((feature) => {
            const isOn = selected.has(feature.id);
            const isCore = feature.type === 'CORE';
            return (
              <li key={feature.id}>
                <div
                  className={cn(
                    'rounded-lg border p-3 transition-colors duration-200',
                    isOn ? 'border-brand/40 bg-brand-soft' : 'border-border bg-surface',
                  )}
                >
                  <Checkbox
                    id={`demo-${feature.id}`}
                    checked={isOn}
                    disabled={isCore}
                    onChange={() => toggle(feature.id)}
                    label={
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium">
                        {feature.name}
                        <FeatureTypeBadge type={feature.type} />
                      </span>
                    }
                    hint={feature.blurb}
                  />
                </div>
              </li>
            );
          })}
        </ul>

        {notice && (
          <Alert
            tone={notice.tone}
            title={notice.title}
            icon={
              notice.tone === 'brand' ? (
                <Link2 className="size-4" aria-hidden="true" />
              ) : (
                <Unlink className="size-4" aria-hidden="true" />
              )
            }
            className="mt-1"
          >
            {notice.body}
          </Alert>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-border p-4 sm:p-5">
        <div className="flex items-start gap-2 text-xs leading-relaxed text-fg-subtle">
          <Info className="mt-px size-3.5 shrink-0" aria-hidden="true" />
          <p>
            Angka di atas sudah termasuk biaya setup &amp; onboarding Rp 10 juta dan dihitung
            dengan mesin harga yang sama dengan konfigurator penuh. Biaya hosting serta langganan
            bulanan dihitung terpisah — lihat{' '}
            <Link href="/harga" className="font-medium text-brand underline-offset-4 hover:underline">
              struktur harga
            </Link>
            .
          </p>
        </div>
        <Button asChild size="lg" className="w-full">
          <Link href="#pilih-aplikasi">Rakit versi lengkapnya</Link>
        </Button>
      </div>
    </div>
  );
}
