'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  BottomSheet,
  Button,
  EmptyState,
  Input,
} from '@/components/ui';
import { cn } from '@/lib/utils';
import { formatRupiahShort } from '@/lib/format';
import { track } from '@/lib/analytics/track';
import { initConfigurator, useConfigurator } from '@/lib/configurator/store';
import type { ConfiguratorPayload } from '@/lib/services/configuration';
import { FeatureCard } from './feature-card';
import { PricePanel } from './price-panel';
import { NoticeStack } from './notice-stack';
import { CascadeDialog } from './cascade-dialog';
import { PriceDetailDialog } from './price-detail-dialog';
import { CustomFeatureDialog, CustomRequestRow } from './custom-feature-dialog';
import { ShareDialog } from './share-dialog';
import { PresetCompare } from './preset-compare';
import { RecommendationList } from './recommendation-list';
import { ConfiguratorHeader } from './configurator-header';

/**
 * Konfigurator "Belanja Fitur" (PRD C) — inti produk.
 *
 * Tata letak tiga kolom (C1): navigasi kelompok fitur di kiri, kartu fitur di
 * tengah, ringkasan keranjang sticky di kanan. Di layar kecil kolom kanan
 * berubah menjadi bilah bawah yang dapat ditarik menjadi bottom sheet.
 *
 * Seluruh perhitungan harga berjalan di browser memakai mesin harga yang sama
 * dengan server, sehingga angka berubah seketika saat fitur di-toggle. Server
 * tetap menghitung ulang dan menormalkan dependensi pada setiap penyimpanan.
 */
export function ConfiguratorShell({ payload }: { payload: ConfiguratorPayload }) {
  const [ready, setReady] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    initConfigurator(payload);
    setReady(true);
    track(
      'configurator_opened',
      {
        category: payload.catalog.category.slug,
        source: payload.configuration.source === 'WIZARD' ? 'wizard' : 'preset',
      },
      payload.configuration.token,
    );
  }, [payload]);

  const state = useConfigurator();

  // Merekam waktu yang dihabiskan klien, dipakai untuk kualifikasi lead (O2)
  // dan metrik friksi konfigurator (4.3).
  useEffect(() => {
    if (!ready) return;
    const token = payload.configuration.token;
    const startedAt = Date.now();

    const send = () => {
      const seconds = Math.round((Date.now() - startedAt) / 1000);
      if (seconds < 5) return;
      navigator.sendBeacon?.(
        `/api/configurations/${token}/heartbeat`,
        new Blob([JSON.stringify({ timeSpentSeconds: seconds })], {
          type: 'application/json',
        }),
      );
    };

    const interval = setInterval(send, 60_000);
    window.addEventListener('pagehide', send);
    return () => {
      clearInterval(interval);
      window.removeEventListener('pagehide', send);
      send();
    };
  }, [ready, payload.configuration.token]);

  const featureNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const group of payload.catalog.groups) {
      for (const feature of group.features) map.set(feature.id, feature.name);
    }
    return map;
  }, [payload]);

  const dependentsByFeature = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const dependency of payload.catalog.dependencies) {
      if (dependency.kind !== 'REQUIRES') continue;
      const existing = map.get(dependency.targetFeatureId) ?? [];
      existing.push(featureNames.get(dependency.featureId) ?? dependency.featureId);
      map.set(dependency.targetFeatureId, existing);
    }
    return map;
  }, [payload, featureNames]);

  const lineById = useMemo(() => {
    if (!state.breakdown) return new Map();
    return new Map(state.breakdown.lines.map((line) => [line.id, line] as const));
  }, [state.breakdown]);

  if (!ready || !state.breakdown) {
    return <ConfiguratorSkeleton />;
  }

  const groups = payload.catalog.groups;
  const searchTerm = state.search.trim().toLowerCase();

  // C5.1 — pencarian menelusuri seluruh katalog, bukan hanya kelompok aktif.
  const visibleGroups = searchTerm
    ? groups
        .map((group) => ({
          ...group,
          features: group.features.filter(
            (feature) =>
              feature.name.toLowerCase().includes(searchTerm) ||
              feature.clientDescription.toLowerCase().includes(searchTerm) ||
              feature.keywords.some((keyword) => keyword.toLowerCase().includes(searchTerm)),
          ),
        }))
        .filter((group) => group.features.length > 0)
    : groups.filter((group) => group.id === state.activeGroupId);

  const matchCount = visibleGroups.reduce((sum, group) => sum + group.features.length, 0);
  const activeGroup = groups.find((group) => group.id === state.activeGroupId);

  const pricePanel = (compact: boolean) => (
    <PricePanel
      breakdown={state.breakdown}
      minViable={state.minViable}
      featureCount={state.selected.size}
      token={payload.configuration.token}
      saveState={state.saveState}
      saveError={state.saveError}
      isEditable={state.isEditable}
      continueHref={`/rakit/${payload.configuration.token}/proyek`}
      continueLabel="Lanjut ke konfigurasi proyek"
      onOpenDetail={() => {
        setDetailOpen(true);
        setSheetOpen(false);
      }}
      compact={compact}
    />
  );

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <ConfiguratorHeader
        payload={payload}
        step="fitur"
        onShare={() => setShareOpen(true)}
        saveState={state.saveState}
      />

      <div className="mx-auto flex w-full max-w-[1600px] flex-1 gap-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* -- Kolom kiri: navigasi kelompok fitur (C1.1) ------------------- */}
        <aside className="hidden w-60 shrink-0 lg:block">
          <div className="sticky top-24 flex flex-col gap-1">
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">
              Kelompok fitur
            </p>
            {groups.map((group) => {
              const selectedInGroup = group.features.filter((f) => state.selected.has(f.id)).length;
              const isActive = !searchTerm && group.id === state.activeGroupId;
              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => {
                    state.setSearch('');
                    state.setActiveGroup(group.id);
                  }}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-brand-soft text-brand-soft-fg'
                      : 'text-fg-muted hover:bg-surface-sunken hover:text-fg',
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">{group.name}</span>
                  <span
                    className={cn(
                      'tabular shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold',
                      selectedInGroup > 0
                        ? 'bg-brand text-brand-fg'
                        : 'bg-surface-sunken text-fg-subtle',
                    )}
                  >
                    {selectedInGroup}/{group.features.length}
                  </span>
                </button>
              );
            })}

            <div className="mt-3 border-t border-border pt-3">
              <PresetCompare
                presets={payload.catalog.presets}
                activePresetId={payload.configuration.presetId}
                selected={state.selected}
                featureNames={featureNames}
                onApplyPreset={state.applyPresetLocal}
                disabled={!state.isEditable}
              />
            </div>
          </div>
        </aside>

        {/* -- Kolom tengah: daftar kartu fitur (C1.2) ---------------------- */}
        <main id="konten-utama" className="min-w-0 flex-1">
          <div className="mb-4 flex flex-col gap-3">
            <Input
              value={state.search}
              onChange={(e) => state.setSearch(e.target.value)}
              placeholder="Cari fitur — misalnya “stok opname”, “barcode”, “komisi”"
              leadingIcon={
                <svg viewBox="0 0 16 16" className="size-4" fill="none" aria-hidden="true">
                  <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4" />
                  <path d="m10.5 10.5 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              }
              aria-label="Cari fitur"
            />

            {/* Navigasi kelompok versi mobile */}
            {!searchTerm && (
              <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 scrollbar-slim lg:hidden">
                {groups.map((group) => {
                  const selectedInGroup = group.features.filter((f) =>
                    state.selected.has(f.id),
                  ).length;
                  return (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => state.setActiveGroup(group.id)}
                      className={cn(
                        'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                        group.id === state.activeGroupId
                          ? 'border-brand bg-brand-soft text-brand-soft-fg'
                          : 'border-border bg-surface text-fg-muted',
                      )}
                    >
                      {group.name}
                      {selectedInGroup > 0 && (
                        <span className="tabular ml-1.5 text-[10px] opacity-70">
                          {selectedInGroup}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <NoticeStack
            notices={state.notices}
            onDismiss={state.dismissNotice}
            className="mb-4"
          />

          {searchTerm && (
            <p className="mb-3 text-sm text-fg-muted">
              {matchCount > 0
                ? `${matchCount} fitur cocok dengan “${state.search}”`
                : `Tidak ada fitur yang cocok dengan “${state.search}”`}
            </p>
          )}

          {matchCount === 0 ? (
            <EmptyState
              title="Belum ada yang cocok"
              description="Coba kata lain, atau ajukan fitur khusus bila memang belum tersedia di katalog kami."
              action={
                <Button variant="secondary" onClick={() => setCustomOpen(true)}>
                  Ajukan fitur khusus
                </Button>
              }
            />
          ) : (
            <div className="flex flex-col gap-6">
              {visibleGroups.map((group) => (
                <section key={group.id}>
                  {(searchTerm || visibleGroups.length > 1) && (
                    <h2 className="mb-2 text-sm font-semibold text-fg">{group.name}</h2>
                  )}
                  {!searchTerm && group.description && (
                    <p className="mb-3 text-sm leading-relaxed text-fg-muted">
                      {group.description}
                    </p>
                  )}
                  <div className="flex flex-col gap-2.5">
                    {group.features.map((feature) => {
                      const line = lineById.get(feature.id);
                      const meta = payload.configuration.itemMeta[feature.id];
                      const effortRatio =
                        feature.effortRatioOverride ??
                        {
                          CORE: payload.rule.effortRatioCore,
                          STANDARD: payload.rule.effortRatioStandard,
                          CONFIGURABLE: payload.rule.effortRatioConfigurable,
                          CUSTOM: payload.rule.effortRatioCustom,
                        }[feature.type];

                      return (
                        <FeatureCard
                          key={feature.id}
                          feature={feature}
                          line={line}
                          isSelected={state.selected.has(feature.id)}
                          originReason={
                            state.selected.has(feature.id) ? (meta?.reason ?? null) : null
                          }
                          dependentNames={dependentsByFeature.get(feature.id) ?? []}
                          disabled={!state.isEditable}
                          onToggle={state.toggleFeature}
                          durationDays={
                            Math.round(feature.manDayMax * effortRatio * 10) / 10
                          }
                        />
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}

          {/* D1 — titik masuk fitur custom di setiap kelompok */}
          {!searchTerm && (
            <button
              type="button"
              onClick={() => {
                setCustomOpen(true);
                track('custom_feature_started', {
                  category: payload.catalog.category.slug,
                });
              }}
              disabled={!state.isEditable}
              className="mt-4 flex w-full items-center gap-3 rounded-xl border border-dashed border-border px-4 py-4 text-left transition-colors hover:border-type-custom/50 hover:bg-type-custom-soft/30 disabled:opacity-50"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-type-custom-soft text-type-custom">
                <svg viewBox="0 0 16 16" className="size-4" fill="none" aria-hidden="true">
                  <path d="M8 3.5v9M3.5 8h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-fg">
                  Fitur yang saya butuhkan tidak ada di sini
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-fg-muted">
                  Ceritakan kebutuhannya lewat formulir singkat. Tim kami memberi estimasi dalam
                  1×24 jam kerja, dan angkanya tidak pernah masuk total sebelum diperiksa manusia.
                </span>
              </span>
            </button>
          )}

          {/* Daftar fitur custom yang sudah diajukan */}
          {state.customRequests.length > 0 && (
            <section className="mt-6">
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-fg">
                Fitur khusus yang Anda ajukan
                <Badge variant="neutral">
                  {state.customRequests.length}/5
                </Badge>
              </h2>
              <div className="flex flex-col gap-2">
                {state.customRequests.map((request) => (
                  <CustomRequestRow
                    key={request.id}
                    request={request}
                    disabled={!state.isEditable}
                    onRemove={async (id) => {
                      await fetch(
                        `/api/configurations/${payload.configuration.token}/custom/${id}`,
                        { method: 'DELETE' },
                      );
                      state.removeCustomRequest(id);
                    }}
                  />
                ))}
              </div>
            </section>
          )}

          {/* C3.3 — saran halus, tidak pernah otomatis ditambahkan */}
          {state.recommendations.length > 0 && !searchTerm && (
            <RecommendationList
              recommendations={state.recommendations}
              onAdd={state.toggleFeature}
              disabled={!state.isEditable}
              className="mt-6"
            />
          )}
        </main>

        {/* -- Kolom kanan: ringkasan sticky (C1.3) ------------------------- */}
        <aside className="hidden w-80 shrink-0 xl:block">
          <div className="sticky top-24 rounded-xl border border-border bg-surface p-5 shadow-sm">
            {pricePanel(false)}
          </div>
        </aside>
      </div>

      {/* -- Bilah bawah untuk layar kecil -------------------------------- */}
      <div className="sticky bottom-0 z-30 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur-md xl:hidden">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="min-w-0 flex-1 text-left"
          >
            <span className="block text-[11px] font-medium uppercase tracking-wide text-fg-subtle">
              {state.selected.size} fitur
              {state.breakdown.pendingCustomCount > 0 &&
                ` + ${state.breakdown.pendingCustomCount} custom`}
            </span>
            <span className="tabular block truncate text-[15px] font-semibold text-fg">
              {formatRupiahShort(state.breakdown.displayTotalMin)} –{' '}
              {formatRupiahShort(state.breakdown.displayTotalMax)}
            </span>
          </button>
          <Button asChild size="md" className="shrink-0">
            <Link href={`/rakit/${payload.configuration.token}/proyek`}>Lanjut</Link>
          </Button>
        </div>
      </div>

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Rakitan Anda">
        {pricePanel(true)}
      </BottomSheet>

      <CascadeDialog
        pending={state.pendingCascade}
        onConfirm={state.confirmCascade}
        onCancel={state.cancelCascade}
      />

      <PriceDetailDialog
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        breakdown={state.breakdown}
      />

      <CustomFeatureDialog
        open={customOpen}
        onClose={() => setCustomOpen(false)}
        token={payload.configuration.token}
        groupId={activeGroup?.id ?? null}
        existingCount={state.customRequests.length}
        onCreated={state.registerCustomRequest}
      />

      <ShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        token={payload.configuration.token}
      />
    </div>
  );
}

function ConfiguratorSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-[1600px] gap-6 px-4 py-10 sm:px-6 lg:px-8">
      <div className="hidden w-60 shrink-0 flex-col gap-2 lg:flex">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-9 animate-pulse rounded-lg bg-surface-sunken" />
        ))}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="h-10 animate-pulse rounded-lg bg-surface-sunken" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-surface-sunken" />
        ))}
      </div>
      <div className="hidden w-80 shrink-0 xl:block">
        <div className="h-96 animate-pulse rounded-xl bg-surface-sunken" />
      </div>
    </div>
  );
}
