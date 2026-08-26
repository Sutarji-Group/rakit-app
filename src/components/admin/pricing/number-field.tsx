'use client';

import { useEffect, useId, useState } from 'react';
import type { ReactNode } from 'react';
import { Field, Input } from '@/components/ui';
import { formatRupiah } from '@/lib/format';

export type NumberFieldKind = 'money' | 'percent' | 'ratio' | 'plain';

/**
 * Isian angka untuk seluruh form mesin harga.
 *
 * Nilai persen disimpan sebagai pecahan (0,65) karena itulah yang dipakai
 * mesin harga, tetapi ditampilkan sebagai 65 agar admin tidak perlu
 * menerjemahkan sendiri — sumber salah ketik yang paling sering terjadi.
 */
export function NumberField({
  label,
  hint,
  value,
  onChange,
  kind = 'plain',
  step,
  min,
  max,
  suffix,
  disabled,
  error,
  className,
}: {
  label: ReactNode;
  hint?: ReactNode;
  value: number;
  onChange: (next: number) => void;
  kind?: NumberFieldKind;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
  disabled?: boolean;
  error?: string | null;
  className?: string;
}) {
  const id = useId();
  const [text, setText] = useState(() => toText(value, kind));

  // Menyelaraskan kembali teks bila nilai diubah dari luar (mis. tombol
  // "kembalikan ke bawaan"), tanpa mengganggu pengetikan yang sedang berjalan.
  useEffect(() => {
    const local = fromText(text, kind);
    if (local === null || Math.abs(local - value) > 1e-9) {
      setText(toText(value, kind));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, kind]);

  const resolvedSuffix = suffix ?? (kind === 'percent' ? '%' : kind === 'ratio' ? '×' : undefined);
  const resolvedStep = step ?? (kind === 'percent' ? 1 : kind === 'ratio' ? 0.05 : kind === 'money' ? 100_000 : 1);

  const moneyHint = kind === 'money' && Number.isFinite(value) ? formatRupiah(value) : null;

  return (
    <Field
      label={label}
      htmlFor={id}
      hint={moneyHint ? <span className="tabular">{moneyHint}</span> : hint}
      error={error}
      className={className}
    >
      <div className="relative">
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          className={resolvedSuffix ? 'tabular pr-9' : 'tabular'}
          value={text}
          step={resolvedStep}
          min={min}
          max={max}
          disabled={disabled}
          invalid={Boolean(error)}
          onChange={(event) => {
            setText(event.target.value);
            const parsed = fromText(event.target.value, kind);
            if (parsed !== null) onChange(parsed);
          }}
          onBlur={() => setText(toText(value, kind))}
        />
        {resolvedSuffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-fg-subtle">
            {resolvedSuffix}
          </span>
        )}
      </div>
    </Field>
  );
}

function toText(value: number, kind: NumberFieldKind): string {
  if (!Number.isFinite(value)) return '';
  if (kind === 'percent') {
    // Pembulatan menahan galat floating point: 0,55 × 100 = 55,000000000000004.
    return String(Math.round(value * 10_000) / 100);
  }
  return String(value);
}

function fromText(text: string, kind: NumberFieldKind): number | null {
  if (text.trim() === '') return null;
  const raw = Number(text);
  if (!Number.isFinite(raw)) return null;
  if (kind === 'percent') return Math.round(raw * 1_000_000) / 100_000_000;
  return raw;
}
