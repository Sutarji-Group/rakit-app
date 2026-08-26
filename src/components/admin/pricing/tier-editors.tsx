'use client';

import { Alert, Button, Input, Table, TableWrapper, Td, Th, Tr } from '@/components/ui';
import { formatPercent, formatRupiah } from '@/lib/format';
import { USER_TIER_LABEL, USER_TIERS, type UserTier } from '@/lib/domain/enums';
import type { UserTierPrice, VolumeDiscountTier } from '@/lib/pricing';

// ---------------------------------------------------------------------------
// Diskon skala (PRD 6.6, M4)
// ---------------------------------------------------------------------------

/**
 * Editor baris tabel diskon skala.
 *
 * Batas atas kosong berarti "tanpa batas" — tier terakhir wajib begitu, kalau
 * tidak, rakitan yang sangat besar justru jatuh ke luar semua tier dan tidak
 * mendapat diskon sama sekali.
 */
export function VolumeDiscountEditor({
  tiers,
  onChange,
  disabled,
}: {
  tiers: VolumeDiscountTier[];
  onChange: (next: VolumeDiscountTier[]) => void;
  disabled?: boolean;
}) {
  const problems = inspectTiers(tiers);

  const update = (index: number, patch: Partial<VolumeDiscountTier>) => {
    onChange(tiers.map((tier, i) => (i === index ? { ...tier, ...patch } : tier)));
  };

  const addRow = () => {
    const last = tiers[tiers.length - 1];
    const nextMin = last ? (last.maxFeatures ?? last.minFeatures) + 1 : 1;
    onChange([
      ...tiers,
      {
        minFeatures: nextMin,
        maxFeatures: null,
        discountPct: 0,
        label: `Lebih dari ${nextMin - 1} fitur`,
      },
    ]);
  };

  return (
    <div className="flex flex-col gap-3">
      <TableWrapper>
        <Table>
          <thead>
            <tr>
              <Th className="min-w-32">Min fitur</Th>
              <Th className="min-w-32">Maks fitur</Th>
              <Th className="min-w-28">Diskon</Th>
              <Th className="min-w-48">Label di rincian harga</Th>
              <Th className="w-16 text-right">Aksi</Th>
            </tr>
          </thead>
          <tbody>
            {tiers.map((tier, index) => (
              <Tr key={index}>
                <Td>
                  <Input
                    type="number"
                    className="tabular h-9"
                    min={0}
                    value={String(tier.minFeatures)}
                    disabled={disabled}
                    aria-label={`Minimum fitur baris ${index + 1}`}
                    onChange={(event) =>
                      update(index, { minFeatures: toInt(event.target.value, 0) })
                    }
                  />
                </Td>
                <Td>
                  <Input
                    type="number"
                    className="tabular h-9"
                    min={0}
                    placeholder="Tanpa batas"
                    value={tier.maxFeatures === null ? '' : String(tier.maxFeatures)}
                    disabled={disabled}
                    aria-label={`Maksimum fitur baris ${index + 1}`}
                    onChange={(event) =>
                      update(index, {
                        maxFeatures:
                          event.target.value.trim() === '' ? null : toInt(event.target.value, 0),
                      })
                    }
                  />
                </Td>
                <Td>
                  <div className="relative">
                    <Input
                      type="number"
                      className="tabular h-9 pr-7"
                      min={0}
                      max={100}
                      step={1}
                      value={String(Math.round(tier.discountPct * 10_000) / 100)}
                      disabled={disabled}
                      aria-label={`Persen diskon baris ${index + 1}`}
                      onChange={(event) =>
                        update(index, {
                          discountPct: Math.round(toNumber(event.target.value, 0) * 100) / 10_000,
                        })
                      }
                    />
                    <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-fg-subtle">
                      %
                    </span>
                  </div>
                </Td>
                <Td>
                  <Input
                    className="h-9"
                    value={tier.label}
                    disabled={disabled}
                    aria-label={`Label baris ${index + 1}`}
                    onChange={(event) => update(index, { label: event.target.value })}
                  />
                </Td>
                <Td className="text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={disabled || tiers.length <= 1}
                    onClick={() => onChange(tiers.filter((_, i) => i !== index))}
                  >
                    Hapus
                  </Button>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </TableWrapper>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="secondary" size="sm" onClick={addRow} disabled={disabled}>
          Tambah baris tier
        </Button>
        <p className="text-xs text-fg-subtle">
          Diskon dihitung dari subtotal fitur setelah pengali proyek. Biaya setup tidak pernah ikut
          didiskon (BR-14).
        </p>
      </div>

      {problems.length > 0 && (
        <Alert tone="warning" title="Tabel tier perlu dirapikan">
          <ul className="list-disc space-y-1 pl-4">
            {problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        </Alert>
      )}
    </div>
  );
}

/** Memeriksa celah, tumpang tindih, dan tier terakhir yang tertutup. */
function inspectTiers(tiers: VolumeDiscountTier[]): string[] {
  const problems: string[] = [];
  const sorted = [...tiers].sort((a, b) => a.minFeatures - b.minFeatures);

  sorted.forEach((tier, index) => {
    if (tier.maxFeatures !== null && tier.maxFeatures < tier.minFeatures) {
      problems.push(`Tier "${tier.label}": batas atas lebih kecil dari batas bawah.`);
    }
    const next = sorted[index + 1];
    if (!next) return;
    if (tier.maxFeatures === null) {
      problems.push(`Tier "${tier.label}" tanpa batas atas menutupi tier "${next.label}".`);
      return;
    }
    if (next.minFeatures <= tier.maxFeatures) {
      problems.push(`Tier "${tier.label}" dan "${next.label}" tumpang tindih.`);
    } else if (next.minFeatures > tier.maxFeatures + 1) {
      problems.push(
        `Ada celah antara "${tier.label}" dan "${next.label}" — rakitan dengan ` +
          `${tier.maxFeatures + 1} fitur tidak masuk tier mana pun.`,
      );
    }
  });

  const last = sorted[sorted.length - 1];
  if (last && last.maxFeatures !== null) {
    problems.push(
      `Tier terbesar "${last.label}" masih punya batas atas. Kosongkan batas atasnya agar ` +
        'rakitan sangat besar tetap mendapat diskon.',
    );
  }

  return problems;
}

// ---------------------------------------------------------------------------
// Biaya berulang menurut jumlah pengguna (PRD 6.5, BR-12)
// ---------------------------------------------------------------------------

/** Editor biaya hosting & lisensi bulanan per tingkat jumlah pengguna. */
export function UserTierPricingEditor({
  tiers,
  onChange,
  disabled,
}: {
  tiers: UserTierPrice[];
  onChange: (next: UserTierPrice[]) => void;
  disabled?: boolean;
}) {
  // Tingkat yang belum punya baris tetap ditampilkan agar tidak ada tingkat
  // pengguna yang diam-diam kehilangan harga berulangnya.
  const rows: UserTierPrice[] = USER_TIERS.map((tier: UserTier) => {
    const existing = tiers.find((row) => row.tier === tier);
    return existing ?? { tier, label: USER_TIER_LABEL[tier], monthlyMin: 0, monthlyMax: 0 };
  });

  const update = (tier: UserTier, patch: Partial<UserTierPrice>) => {
    onChange(rows.map((row) => (row.tier === tier ? { ...row, ...patch } : row)));
  };

  return (
    <div className="flex flex-col gap-3">
      <TableWrapper>
        <Table>
          <thead>
            <tr>
              <Th className="min-w-40">Tingkat pengguna</Th>
              <Th className="min-w-40">Biaya bulanan minimum</Th>
              <Th className="min-w-40">Biaya bulanan maksimum</Th>
              <Th className="min-w-40">Rentang</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <Tr key={row.tier}>
                <Td className="font-medium">{USER_TIER_LABEL[row.tier]}</Td>
                <Td>
                  <Input
                    type="number"
                    className="tabular h-9"
                    min={0}
                    step={100_000}
                    value={String(row.monthlyMin)}
                    disabled={disabled}
                    aria-label={`Biaya minimum ${USER_TIER_LABEL[row.tier]}`}
                    onChange={(event) =>
                      update(row.tier, { monthlyMin: toInt(event.target.value, 0) })
                    }
                  />
                </Td>
                <Td>
                  <Input
                    type="number"
                    className="tabular h-9"
                    min={0}
                    step={100_000}
                    value={String(row.monthlyMax)}
                    disabled={disabled}
                    aria-label={`Biaya maksimum ${USER_TIER_LABEL[row.tier]}`}
                    onChange={(event) =>
                      update(row.tier, { monthlyMax: toInt(event.target.value, 0) })
                    }
                  />
                </Td>
                <Td className="tabular text-fg-muted">
                  {formatRupiah(row.monthlyMin)} – {formatRupiah(row.monthlyMax)}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </TableWrapper>
      <p className="text-xs text-fg-subtle">
        Biaya ini berulang setiap bulan dan tidak pernah dijumlahkan ke nilai proyek (BR-12).
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pengali sederhana (platform & deployment)
// ---------------------------------------------------------------------------

/** Satu baris pengali dengan pratinjau dampaknya terhadap contoh subtotal. */
export function MultiplierRow({
  label,
  description,
  value,
  onChange,
  sampleSubtotal,
  disabled,
}: {
  label: string;
  description: string;
  value: number;
  onChange: (next: number) => void;
  sampleSubtotal: number;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-fg">{label}</p>
        <p className="text-xs leading-snug text-fg-muted">{description}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="tabular hidden text-xs text-fg-subtle sm:inline">
          contoh: {formatRupiah(Math.round(sampleSubtotal * value))}
        </span>
        <div className="relative w-28">
          <Input
            type="number"
            className="tabular h-9 pr-7"
            min={0}
            step={0.05}
            value={String(value)}
            disabled={disabled}
            aria-label={`Pengali ${label}`}
            onChange={(event) => onChange(toNumber(event.target.value, 1))}
          />
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-fg-subtle">
            ×
          </span>
        </div>
      </div>
    </div>
  );
}

/** Label ringkas "naik 25%" untuk menjelaskan arti sebuah pengali. */
export function multiplierDelta(value: number): string {
  if (value === 1) return 'tanpa perubahan harga';
  return value > 1
    ? `menaikkan ${formatPercent(value - 1, 0)}`
    : `menurunkan ${formatPercent(1 - value, 0)}`;
}

function toInt(value: string, fallback: number): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toNumber(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
