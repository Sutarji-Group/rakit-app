'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  BottomSheet,
  Button,
} from '@/components/ui';
import { cn } from '@/lib/utils';
import { formatRupiah, formatRupiahShort } from '@/lib/format';
import { track } from '@/lib/analytics/track';
import {
  ADDON_KIND_LABEL,
  PROJECT_DEPLOYMENTS,
  PROJECT_DEPLOYMENT_DESCRIPTION,
  PROJECT_DEPLOYMENT_LABEL,
  PROJECT_PLATFORMS,
  PROJECT_PLATFORM_DESCRIPTION,
  PROJECT_PLATFORM_LABEL,
  USER_TIERS,
  USER_TIER_LABEL,
  type ProjectDeployment,
  type ProjectPlatform,
  type UserTier,
} from '@/lib/domain/enums';
import { computePrice, type PriceBreakdown } from '@/lib/pricing';
import { initConfigurator, useConfigurator } from '@/lib/configurator/store';
import type { AddOnDTO, ConfiguratorPayload } from '@/lib/services/configuration';
import { ConfiguratorHeader } from './configurator-header';
import { PricePanel } from './price-panel';
import { PriceDetailDialog } from './price-detail-dialog';
import { CustomFeatureDialog } from './custom-feature-dialog';

/**
 * Konfigurasi Proyek (PRD E).
 *
 * Dikumpulkan di langkah TERPISAH setelah belanja fitur (E1), bukan disisipkan
 * di dalamnya: variabel-variabel ini berdampak besar pada harga tetapi bukan
 * fitur, dan mencampurnya dengan katalog membuat klien kehilangan konteks.
 *
 * Setiap opsi menampilkan dampaknya terhadap harga secara langsung (E2) —
 * dihitung sebagai selisih nyata memakai mesin harga, bukan label perkiraan.
 */
export function ProjectOptionsForm({ payload }: { payload: ConfiguratorPayload }) {
  const [ready, setReady] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    initConfigurator(payload);
    setReady(true);
  }, [payload]);

  const state = useConfigurator();

  /**
   * Menghitung harga seandainya satu opsi diganti, tanpa mengubah pilihan.
   * Inilah yang membuat "dampak terhadap harga" pada tiap kartu benar-benar
   * angka, bukan klaim.
   */
  const whatIf = useMemo(() => {
    if (!ready || !state.breakdown) return null;

    const baseFeatures = [...state.selected]
      .map((id) => state.featureIndex.get(id))
      .filter((f): f is NonNullable<typeof f> => Boolean(f))
      .map((f) => ({
        id: f.id,
        name: f.name,
        type: f.type,
        manDayMin: f.manDayMin,
        manDayMax: f.manDayMax,
        effortRatioOverride: f.effortRatioOverride,
      }));

    const baseCustoms = state.customRequests.map((request) => ({
      id: request.id,
      name: request.name,
      isEstimated:
        (request.status === 'ESTIMATED' || request.status === 'PROMOTED') &&
        request.manDayMin != null,
      manDayMin: request.manDayMin,
      manDayMax: request.manDayMax,
    }));

    const addOnsFor = (ids: Set<string>) =>
      payload.addOns
        .filter((addOn) => ids.has(addOn.id))
        .map((addOn) => ({
          id: addOn.id,
          name: addOn.name,
          kind: addOn.kind as 'INTEGRATION',
          priceMin: addOn.priceMin,
          priceMax: addOn.priceMax,
          manDayMin: addOn.manDayMin,
          manDayMax: addOn.manDayMax,
          isRecurring: addOn.isRecurring,
        }));

    return (override: {
      platform?: ProjectPlatform;
      deployment?: ProjectDeployment;
      userTier?: UserTier;
      addOnIds?: Set<string>;
    }): PriceBreakdown =>
      computePrice({
        rule: payload.rule,
        features: baseFeatures,
        customRequests: baseCustoms,
        addOns: addOnsFor(override.addOnIds ?? state.selectedAddOns),
        platform: override.platform ?? state.platform,
        deployment: override.deployment ?? state.deployment,
        userTier: override.userTier ?? state.userTier,
      });
  }, [
    ready,
    state.breakdown,
    state.selected,
    state.featureIndex,
    state.customRequests,
    state.selectedAddOns,
    state.platform,
    state.deployment,
    state.userTier,
    payload.addOns,
    payload.rule,
  ]);

  if (!ready || !state.breakdown || !whatIf) {
    return <div className="min-h-dvh animate-pulse bg-surface-sunken/40" />;
  }

  const current = state.breakdown;
  const token = payload.configuration.token;

  const byKind = (kind: string) =>
    payload.addOns.filter((addOn) => addOn.kind === kind);

  const integrations = byKind('INTEGRATION');
  const optionGroups = new Map<string, AddOnDTO[]>();
  for (const addOn of payload.addOns) {
    if (!addOn.optionGroup) continue;
    optionGroups.set(addOn.optionGroup, [
      ...(optionGroups.get(addOn.optionGroup) ?? []),
      addOn,
    ]);
  }

  /** Selisih harga total maksimum dibanding pilihan saat ini. */
  const delta = (next: PriceBreakdown) => next.totalMax - current.totalMax;

  const pricePanel = (compact: boolean) => (
    <PricePanel
      breakdown={current}
      minViable={state.minViable}
      featureCount={state.selected.size}
      token={token}
      saveState={state.saveState}
      saveError={state.saveError}
      isEditable={state.isEditable}
      continueHref={`/rakit/${token}/ringkasan`}
      continueLabel="Lihat ringkasan"
      onOpenDetail={() => {
        setDetailOpen(true);
        setSheetOpen(false);
      }}
      compact={compact}
    />
  );

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <ConfiguratorHeader payload={payload} step="proyek" saveState={state.saveState} />

      <div className="mx-auto flex w-full max-w-[1400px] flex-1 gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <main id="konten-utama" className="min-w-0 flex-1">
          <div className="mb-8 max-w-2xl">
            <h1 className="text-2xl font-semibold tracking-[-0.02em] text-fg">
              Konfigurasi proyek
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-fg-muted">
              Beberapa hal di luar daftar fitur ikut menentukan biaya dan lama pengerjaan.
              Setiap pilihan di bawah menunjukkan dampaknya terhadap harga secara langsung.
            </p>
          </div>

          <div className="flex flex-col gap-10">
            {/* -- Platform -------------------------------------------------- */}
            <Section
              title="Di mana aplikasi ini dipakai?"
              description="Menentukan apakah aplikasi cukup diakses lewat browser, atau perlu versi ponsel tersendiri."
            >
              <div className="grid gap-3 sm:grid-cols-3">
                {PROJECT_PLATFORMS.map((option) => (
                  <OptionCard
                    key={option}
                    title={PROJECT_PLATFORM_LABEL[option]}
                    description={PROJECT_PLATFORM_DESCRIPTION[option]}
                    selected={state.platform === option}
                    disabled={!state.isEditable}
                    impact={delta(whatIf({ platform: option }))}
                    onSelect={() => state.setOption({ platform: option })}
                  />
                ))}
              </div>
            </Section>

            {/* -- Deployment ----------------------------------------------- */}
            <Section
              title="Di mana aplikasi ini dipasang?"
              description="Menentukan siapa yang mengurus server, backup, dan pembaruan keamanan."
            >
              <div className="grid gap-3 sm:grid-cols-3">
                {PROJECT_DEPLOYMENTS.map((option) => (
                  <OptionCard
                    key={option}
                    title={PROJECT_DEPLOYMENT_LABEL[option]}
                    description={PROJECT_DEPLOYMENT_DESCRIPTION[option]}
                    selected={state.deployment === option}
                    disabled={!state.isEditable}
                    impact={delta(whatIf({ deployment: option }))}
                    onSelect={() => state.setOption({ deployment: option })}
                  />
                ))}
              </div>
            </Section>

            {/* -- Jumlah pengguna ------------------------------------------ */}
            <Section
              title="Berapa orang yang akan memakainya?"
              description="Memengaruhi biaya lisensi dan hosting bulanan — bukan biaya pembuatan aplikasinya."
            >
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {USER_TIERS.map((option) => {
                  const tierPrice = payload.rule.userTierPricing.find((t) => t.tier === option);
                  return (
                    <OptionCard
                      key={option}
                      title={USER_TIER_LABEL[option]}
                      description={
                        tierPrice
                          ? `${formatRupiahShort(tierPrice.monthlyMin)} – ${formatRupiahShort(tierPrice.monthlyMax)} per bulan`
                          : undefined
                      }
                      selected={state.userTier === option}
                      disabled={!state.isEditable}
                      recurringOnly
                      onSelect={() => state.setOption({ userTier: option })}
                    />
                  );
                })}
              </div>
            </Section>

            {/* -- Integrasi pihak ketiga (E3) ------------------------------- */}
            {integrations.length > 0 && (
              <Section
                title="Perlu tersambung ke sistem lain?"
                description="Pilih sistem yang datanya perlu mengalir otomatis, supaya tim Anda tidak menginput dua kali."
              >
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {integrations.map((addOn) => (
                    <AddOnCard
                      key={addOn.id}
                      addOn={addOn}
                      selected={state.selectedAddOns.has(addOn.id)}
                      disabled={!state.isEditable}
                      onToggle={() => state.toggleAddOn(addOn.id, addOn.optionGroup)}
                    />
                  ))}
                </div>

                {/* Integrasi lain masuk jalur fitur custom */}
                <button
                  type="button"
                  onClick={() => setCustomOpen(true)}
                  disabled={!state.isEditable}
                  className="mt-3 flex w-full items-center gap-3 rounded-xl border border-dashed border-border px-4 py-3.5 text-left transition-colors hover:border-type-custom/50 hover:bg-type-custom-soft/30 disabled:opacity-50"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-type-custom-soft text-type-custom">
                    <svg viewBox="0 0 16 16" className="size-4" fill="none" aria-hidden="true">
                      <path d="M8 3.5v9M3.5 8h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-fg">
                      Sistem saya tidak ada di daftar ini
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-fg-muted">
                      Ceritakan sistem apa dan data apa yang perlu mengalir. Tim kami menilai
                      kelayakannya lebih dulu sebelum memberi angka.
                    </span>
                  </span>
                </button>
              </Section>
            )}

            {/* -- Kelompok pilihan tunggal: migrasi, pelatihan, maintenance -- */}
            {[...optionGroups.entries()].map(([groupKey, options]) => {
              const kind = options[0]?.kind ?? 'OTHER';
              const isRecurring = options.some((o) => o.isRecurring);
              return (
                <Section
                  key={groupKey}
                  title={SECTION_TITLE[groupKey] ?? ADDON_KIND_LABEL[kind as 'OTHER']}
                  description={SECTION_DESCRIPTION[groupKey]}
                  badge={
                    isRecurring ? (
                      <Badge variant="accent">Biaya bulanan, terpisah dari nilai proyek</Badge>
                    ) : undefined
                  }
                >
                  <div className="grid gap-3 sm:grid-cols-3">
                    {options.map((addOn) => {
                      const selected = state.selectedAddOns.has(addOn.id);
                      const nextIds = new Set(state.selectedAddOns);
                      for (const other of options) nextIds.delete(other.id);
                      nextIds.add(addOn.id);

                      return (
                        <OptionCard
                          key={addOn.id}
                          title={addOn.name}
                          description={addOn.description}
                          selected={selected}
                          disabled={!state.isEditable}
                          impact={
                            addOn.isRecurring ? undefined : delta(whatIf({ addOnIds: nextIds }))
                          }
                          recurringLabel={
                            addOn.isRecurring && addOn.priceMax > 0
                              ? `${formatRupiahShort(addOn.priceMin)} – ${formatRupiahShort(addOn.priceMax)} / bulan`
                              : addOn.isRecurring
                                ? 'Tanpa biaya bulanan'
                                : undefined
                          }
                          onSelect={() => state.toggleAddOn(addOn.id, addOn.optionGroup)}
                        />
                      );
                    })}
                  </div>
                </Section>
              );
            })}

            {/* E4 / BR-12 — biaya berulang selalu ditegaskan terpisah */}
            {current.recurringMonthlyMax > 0 && (
              <Alert tone="brand" title="Biaya bulanan dihitung terpisah">
                Paket maintenance, hosting, dan lisensi sebesar{' '}
                <strong className="tabular font-semibold">
                  {formatRupiah(current.recurringMonthlyMin)} –{' '}
                  {formatRupiah(current.recurringMonthlyMax)} per bulan
                </strong>{' '}
                tidak dijumlahkan ke nilai proyek. Biaya ini mulai berjalan setelah aplikasi
                diserahterimakan.
              </Alert>
            )}
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-border pt-6">
            <Button asChild variant="secondary">
              <Link href={`/rakit/${token}`}>Kembali ke fitur</Link>
            </Button>
            <Button
              asChild
              onClick={() => {
                state.saveOptionsNow();
                track(
                  'project_options_completed',
                  {
                    platform: state.platform,
                    deployment: state.deployment,
                    userTier: state.userTier,
                  },
                  token,
                );
              }}
            >
              <Link href={`/rakit/${token}/ringkasan`}>Lihat ringkasan</Link>
            </Button>
          </div>
        </main>

        <aside className="hidden w-80 shrink-0 xl:block">
          <div className="sticky top-24 rounded-xl border border-border bg-surface p-5 shadow-sm">
            {pricePanel(false)}
          </div>
        </aside>
      </div>

      <div className="sticky bottom-0 z-30 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur-md xl:hidden">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <button type="button" onClick={() => setSheetOpen(true)} className="min-w-0 flex-1 text-left">
            <span className="block text-[11px] font-medium uppercase tracking-wide text-fg-subtle">
              {state.selected.size} fitur
            </span>
            <span className="tabular block truncate text-[15px] font-semibold text-fg">
              {formatRupiahShort(current.displayTotalMin)} –{' '}
              {formatRupiahShort(current.displayTotalMax)}
            </span>
          </button>
          <Button asChild size="md" className="shrink-0">
            <Link href={`/rakit/${token}/ringkasan`}>Lanjut</Link>
          </Button>
        </div>
      </div>

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Rakitan Anda">
        {pricePanel(true)}
      </BottomSheet>

      <PriceDetailDialog
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        breakdown={current}
      />

      <CustomFeatureDialog
        open={customOpen}
        onClose={() => setCustomOpen(false)}
        token={token}
        groupId={null}
        existingCount={state.customRequests.length}
        onCreated={state.registerCustomRequest}
      />
    </div>
  );
}

const SECTION_TITLE: Record<string, string> = {
  migrasi: 'Ada data lama yang perlu dipindahkan?',
  pelatihan: 'Perlu pendampingan untuk tim Anda?',
  maintenance: 'Setelah aplikasi jadi, siapa yang merawatnya?',
};

const SECTION_DESCRIPTION: Record<string, string> = {
  migrasi:
    'Data master seperti barang, pelanggan, atau riwayat transaksi dapat kami pindahkan ke sistem baru.',
  pelatihan:
    'Aplikasi sebagus apa pun tidak berguna bila tim Anda ragu memakainya di hari pertama.',
  maintenance:
    'Perbaikan bug, pembaruan keamanan, dan perubahan kecil setelah masa garansi. Ini biaya bulanan yang terpisah dari nilai proyek.',
};

function Section({
  title,
  description,
  badge,
  children,
}: {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold tracking-[-0.01em] text-fg">{title}</h2>
          {badge}
        </div>
        {description && (
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-fg-muted">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

function OptionCard({
  title,
  description,
  selected,
  disabled,
  impact,
  recurringLabel,
  recurringOnly,
  onSelect,
}: {
  title: string;
  description?: string;
  selected: boolean;
  disabled?: boolean;
  impact?: number;
  recurringLabel?: string;
  recurringOnly?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        'flex flex-col rounded-xl border p-4 text-left transition-[border-color,background-color]',
        selected
          ? 'border-brand bg-brand-soft/30'
          : 'border-border bg-surface hover:border-border-strong',
        disabled && 'cursor-not-allowed opacity-60',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-semibold text-fg">{title}</span>
        <span
          className={cn(
            'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-2',
            selected ? 'border-brand bg-brand' : 'border-border-strong',
          )}
          aria-hidden="true"
        >
          {selected && <span className="size-1.5 rounded-full bg-brand-fg" />}
        </span>
      </div>

      {description && (
        <span className="mt-1 text-xs leading-relaxed text-fg-muted">{description}</span>
      )}

      {/* E2 — dampak terhadap harga ditampilkan langsung */}
      <span className="mt-2.5 text-xs font-medium">
        {recurringLabel ? (
          <span className="tabular text-accent-strong">{recurringLabel}</span>
        ) : recurringOnly ? (
          <span className="text-fg-subtle">Tidak menambah biaya proyek</span>
        ) : impact === undefined || selected ? (
          <span className="text-fg-subtle">{selected ? 'Pilihan Anda' : ''}</span>
        ) : impact === 0 ? (
          <span className="text-fg-subtle">Tanpa perubahan biaya</span>
        ) : (
          <span className={cn('tabular', impact > 0 ? 'text-fg-muted' : 'text-success')}>
            {impact > 0 ? '+' : '−'}
            {formatRupiahShort(Math.abs(impact))}
          </span>
        )}
      </span>
    </button>
  );
}

function AddOnCard({
  addOn,
  selected,
  disabled,
  onToggle,
}: {
  addOn: AddOnDTO;
  selected: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        'flex items-start gap-3 rounded-xl border p-3.5 text-left transition-[border-color,background-color]',
        selected
          ? 'border-brand bg-brand-soft/30'
          : 'border-border bg-surface hover:border-border-strong',
        disabled && 'cursor-not-allowed opacity-60',
      )}
    >
      <span
        className={cn(
          'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border-2',
          selected ? 'border-brand bg-brand' : 'border-border-strong',
        )}
        aria-hidden="true"
      >
        {selected && (
          <svg viewBox="0 0 12 12" className="size-2.5 text-brand-fg" fill="none">
            <path d="m2.8 6.2 2 2 4.4-4.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-fg">{addOn.name}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-fg-muted">
          {addOn.description}
        </span>
        <span className="tabular mt-1.5 block text-xs font-medium text-fg-subtle">
          {addOn.priceMin === addOn.priceMax
            ? formatRupiahShort(addOn.priceMin)
            : `${formatRupiahShort(addOn.priceMin)} – ${formatRupiahShort(addOn.priceMax)}`}
        </span>
      </span>
    </button>
  );
}
