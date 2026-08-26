'use client';

import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { Recommendation } from '@/lib/configurator/dependency';

/**
 * Saran halus dari relasi RECOMMENDS (C3.3).
 *
 * Sengaja TIDAK pernah menambahkan fitur secara otomatis. Relasi ini menyampaikan
 * pengalaman klien lain, bukan aturan teknis — memaksakannya masuk keranjang akan
 * mengaburkan batas antara "wajib" dan "biasanya dipilih", dan itu merusak
 * kepercayaan pada mesin dependensi yang memang mengikat.
 */
export function RecommendationList({
  recommendations,
  onAdd,
  disabled,
  className,
}: {
  recommendations: Recommendation[];
  onAdd: (featureId: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  if (recommendations.length === 0) return null;

  return (
    <section className={cn('rounded-xl border border-border bg-surface-sunken/40 p-4', className)}>
      <h2 className="mb-1 text-sm font-semibold text-fg">Sering dipilih bersamaan</h2>
      <p className="mb-3 text-xs leading-relaxed text-fg-muted">
        Saran berdasarkan rakitan klien lain. Tidak ada yang ditambahkan tanpa Anda setujui.
      </p>

      <ul className="flex flex-col gap-2">
        {recommendations.map((recommendation) => (
          <li
            key={recommendation.featureId}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2.5"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-fg">{recommendation.featureName}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-fg-muted">
                {recommendation.reason}
              </p>
            </div>
            <Button
              size="sm"
              variant="secondary"
              disabled={disabled}
              onClick={() => onAdd(recommendation.featureId)}
              className="shrink-0"
            >
              Tambahkan
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
