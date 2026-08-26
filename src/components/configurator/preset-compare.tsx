'use client';

import { useState } from 'react';
import { Badge, Button, Dialog } from '@/components/ui';
import type { PresetDTO } from '@/lib/services/catalog';

/**
 * Pembanding rakitan terhadap preset asal (C5.2).
 *
 * "Anda menambah 6 fitur dan menghapus 2 dari paket Starter" membantu klien
 * memahami bahwa dia sedang menyesuaikan sesuatu, bukan menyusun dari nol —
 * dan itu menurunkan kecemasan bahwa rakitannya salah.
 */
export function PresetCompare({
  presets,
  activePresetId,
  selected,
  featureNames,
  onApplyPreset,
  disabled,
}: {
  presets: PresetDTO[];
  activePresetId: string | null;
  selected: Set<string>;
  featureNames: Map<string, string>;
  onApplyPreset: (presetId: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const active = presets.find((p) => p.id === activePresetId) ?? presets.find((p) => p.isDefault);

  if (!active) return null;

  const presetSet = new Set(active.featureIds);
  const added = [...selected].filter((id) => !presetSet.has(id));
  const removed = active.featureIds.filter((id) => !selected.has(id));
  const unchanged = active.featureIds.filter((id) => selected.has(id)).length;

  // Kalimatnya disusun utuh di sini, bukan lewat kelas `capitalize`, karena
  // kelas itu mengapitalkan SETIAP kata dan menghasilkan "Anda Sama Persis
  // Dengan Paket WMS Growth".
  const summary =
    added.length === 0 && removed.length === 0
      ? `Rakitan Anda sama persis dengan paket ${active.name}.`
      : `Anda ${[
          added.length > 0 ? `menambah ${added.length} fitur` : null,
          removed.length > 0 ? `menghapus ${removed.length} fitur` : null,
        ]
          .filter(Boolean)
          .join(' dan ')} dari paket ${active.name}.`;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-start gap-2 rounded-lg border border-border bg-surface-sunken/50 px-3 py-2.5 text-left transition-colors hover:border-border-strong"
      >
        <svg viewBox="0 0 14 14" className="mt-0.5 size-3.5 shrink-0 text-fg-subtle" fill="none" aria-hidden="true">
          <path d="M2 4.5h10M2 9.5h10M5 2 3 4.5 5 7M9 7l2 2.5L9 12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-medium text-fg">
            Dibanding paket {active.name}
          </span>
          <span className="mt-0.5 block text-xs leading-relaxed text-fg-muted">
            {summary}
          </span>
        </span>
      </button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        size="lg"
        title={`Rakitan Anda dibanding paket ${active.name}`}
        description={active.tagline}
      >
        <div className="flex flex-col gap-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <StatBox label="Tetap dari preset" value={unchanged} tone="neutral" />
            <StatBox label="Anda tambahkan" value={added.length} tone="success" />
            <StatBox label="Anda hapus" value={removed.length} tone="warning" />
          </div>

          {added.length > 0 && (
            <ListBlock
              title="Fitur yang Anda tambahkan"
              ids={added}
              featureNames={featureNames}
              tone="success"
            />
          )}
          {removed.length > 0 && (
            <ListBlock
              title="Fitur preset yang Anda hapus"
              ids={removed}
              featureNames={featureNames}
              tone="warning"
            />
          )}

          <div className="rounded-lg border border-border bg-surface-sunken/50 p-4">
            <p className="mb-2.5 text-sm font-semibold text-fg">Mulai ulang dari preset lain</p>
            <div className="flex flex-col gap-2">
              {presets.map((preset) => (
                <div
                  key={preset.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-medium text-fg">
                      {preset.name}
                      {preset.id === active.id && <Badge variant="brand">Sedang dipakai</Badge>}
                    </p>
                    <p className="mt-0.5 text-xs text-fg-muted">
                      {preset.featureIds.length} fitur · {preset.tagline}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={disabled}
                    onClick={() => {
                      onApplyPreset(preset.id);
                      setOpen(false);
                    }}
                  >
                    Terapkan
                  </Button>
                </div>
              ))}
            </div>
            <p className="mt-2.5 text-xs leading-relaxed text-fg-subtle">
              Menerapkan preset lain akan mengganti seluruh pilihan fitur Anda saat ini.
            </p>
          </div>
        </div>
      </Dialog>
    </>
  );
}

function StatBox({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'neutral' | 'success' | 'warning';
}) {
  const toneClass = {
    neutral: 'text-fg',
    success: 'text-success',
    warning: 'text-warning',
  }[tone];
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <p className="text-xs text-fg-subtle">{label}</p>
      <p className={`tabular mt-1 text-xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

function ListBlock({
  title,
  ids,
  featureNames,
  tone,
}: {
  title: string;
  ids: string[];
  featureNames: Map<string, string>;
  tone: 'success' | 'warning';
}) {
  const dotClass = tone === 'success' ? 'bg-success' : 'bg-warning';
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-fg-subtle">{title}</p>
      <ul className="flex flex-col gap-1">
        {ids.map((id) => (
          <li key={id} className="flex items-center gap-2 text-sm text-fg">
            <span className={`size-1.5 shrink-0 rounded-full ${dotClass}`} aria-hidden="true" />
            {featureNames.get(id) ?? id}
          </li>
        ))}
      </ul>
    </div>
  );
}
