import { Alert, Badge, Table, TableWrapper, Td, Th, Tr } from '@/components/ui';
import { formatNumber, formatPercent, formatRupiah } from '@/lib/format';
import { deriveCogsPerManDay, type PricingRuleSnapshot } from '@/lib/pricing';

/** Jumlah hari billable "naif" yang dipakai PRD 6.2 sebagai contoh kesalahan. */
const NAIVE_BILLABLE_DAYS = 20;

/**
 * Tabel penurunan COGS per man-day, baris demi baris seperti PRD 6.2 (M3).
 *
 * Seluruh angka diturunkan langsung dari deriveCogsPerManDay() — bukan dihitung
 * ulang di komponen — supaya tabel yang dilihat admin tidak pernah berbeda dari
 * angka yang dipakai mesin harga saat menilai margin.
 */
export function CogsTable({
  rule,
  className,
}: {
  rule: PricingRuleSnapshot;
  className?: string;
}) {
  const cogs = deriveCogsPerManDay(rule);

  // Angka semu yang diperingatkan PRD: memakai 20 hari billable per bulan
  // seolah-olah developer menagih hampir setiap hari kerja.
  const naiveCostPerDay = cogs.monthlyLoadedCost / NAIVE_BILLABLE_DAYS;
  const naiveCogs = Math.round(naiveCostPerDay * (1 + rule.supportRoleRatio));
  const understatementPct = cogs.cogsPerManDay > 0 ? 1 - naiveCogs / cogs.cogsPerManDay : 0;

  const rows = [
    {
      step: '1',
      label: 'Gaji rata-rata developer',
      formula: 'Asumsi gaji bulanan per developer',
      value: formatRupiah(rule.avgDeveloperSalary),
      sub: 'per bulan',
    },
    {
      step: '2',
      label: 'Beban tambahan',
      formula: `Gaji × faktor beban ${formatNumber(rule.burdenFactor, 2)}`,
      value: formatRupiah(cogs.monthlyLoadedCost),
      sub: 'BPJS, THR, perangkat, ruang kerja, tunjangan',
    },
    {
      step: '3',
      label: 'Hari kerja efektif',
      formula: 'Hari kerja per bulan setelah libur & cuti',
      value: `${formatNumber(rule.effectiveWorkDaysPerMonth, 1)} hari`,
      sub: 'per bulan',
    },
    {
      step: '4',
      label: 'Utilisasi billable',
      formula: `${formatNumber(rule.effectiveWorkDaysPerMonth, 1)} hari × ${formatPercent(rule.billableUtilization)}`,
      value: `${formatNumber(cogs.billableDaysPerMonth)} hari`,
      sub: 'sisanya habis untuk rapat, riset, dukungan, dan rework',
    },
    {
      step: '5',
      label: 'Biaya per hari billable',
      formula: `${formatRupiah(cogs.monthlyLoadedCost)} ÷ ${formatNumber(cogs.billableDaysPerMonth)} hari`,
      value: formatRupiah(cogs.costPerBillableDay),
      sub: 'biaya langsung satu developer per man-day',
    },
    {
      step: '6',
      label: 'Beban peran pendukung',
      formula: `Biaya per hari × ${formatPercent(rule.supportRoleRatio)}`,
      value: formatRupiah(cogs.supportLoadPerDay),
      sub: 'PM, QA, DevOps, dan solution consultant',
    },
  ];

  return (
    <div className={className}>
      <TableWrapper>
        <Table>
          <thead>
            <tr>
              <Th className="w-10">#</Th>
              <Th>Komponen</Th>
              <Th>Perhitungan</Th>
              <Th className="text-right">Nilai</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <Tr key={row.step}>
                <Td className="text-fg-subtle tabular">{row.step}</Td>
                <Td>
                  <span className="font-medium text-fg">{row.label}</span>
                  <span className="block text-xs leading-snug text-fg-subtle">{row.sub}</span>
                </Td>
                <Td className="tabular text-fg-muted">{row.formula}</Td>
                <Td className="tabular text-right font-medium">{row.value}</Td>
              </Tr>
            ))}
            <Tr className="bg-brand-soft/50">
              <Td className="text-fg-subtle tabular">7</Td>
              <Td>
                <span className="font-semibold text-fg">COGS per man-day</span>
                <span className="block text-xs leading-snug text-fg-subtle">
                  Dasar seluruh proyeksi margin di papan internal (PRD 6.4)
                </span>
              </Td>
              <Td className="tabular text-fg-muted">
                {formatRupiah(cogs.costPerBillableDay)} + {formatRupiah(cogs.supportLoadPerDay)}
              </Td>
              <Td className="tabular text-right text-base font-semibold text-fg">
                {formatRupiah(cogs.cogsPerManDay)}
                {cogs.isOverridden && (
                  <Badge variant="warning" className="ml-2 align-middle">
                    Ditimpa manual
                  </Badge>
                )}
              </Td>
            </Tr>
          </tbody>
        </Table>
      </TableWrapper>

      {cogs.isOverridden && (
        <Alert tone="warning" className="mt-3" title="Nilai COGS ditimpa manual">
          Perhitungan di atas diabaikan; mesin harga memakai{' '}
          <span className="tabular font-semibold">{formatRupiah(cogs.cogsPerManDay)}</span> per
          man-day. Kosongkan penimpaan agar asumsi biaya kembali menjadi sumber kebenaran.
        </Alert>
      )}

      <Alert
        tone="warning"
        className="mt-3"
        title={`Utilisasi ${formatPercent(rule.billableUtilization)} adalah ASUMSI, bukan fakta`}
      >
        <p>
          Ini variabel tunggal yang paling sensitif terhadap margin. Bila utilisasi riil ternyata
          lebih rendah, seluruh proyeksi margin di papan internal terlalu optimistis.
        </p>
        <p className="mt-2">
          PRD 6.2 memperingatkan kesalahan yang paling sering terjadi: menghitung dengan{' '}
          {NAIVE_BILLABLE_DAYS} hari billable per bulan menghasilkan biaya semu hanya{' '}
          <span className="tabular font-semibold">{formatRupiah(naiveCogs)}</span> per man-day —{' '}
          <span className="tabular font-semibold">{formatPercent(understatementPct, 0)}</span> lebih
          rendah dari angka riil{' '}
          <span className="tabular font-semibold">{formatRupiah(cogs.cogsPerManDay)}</span>, dan
          berujung pada harga jual yang terlalu rendah.
        </p>
        <p className="mt-2">
          Bandingkan asumsi ini dengan man-day aktual di{' '}
          <a href="/admin/harga/kalibrasi" className="font-medium underline underline-offset-2">
            laporan kalibrasi
          </a>{' '}
          sebelum menaikkan angka utilisasi.
        </p>
      </Alert>
    </div>
  );
}
