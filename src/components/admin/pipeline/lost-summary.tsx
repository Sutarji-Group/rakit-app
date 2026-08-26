import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Progress,
  Table,
  TableWrapper,
  Td,
  Th,
  Tr,
} from '@/components/ui';
import { LOST_REASON_LABEL } from '@/lib/domain/enums';
import { formatPercent, formatRupiahShort } from '@/lib/format';
import type { LostReasonSummaryRow } from './shared';

/**
 * Agregat alasan kalah (O5).
 *
 * Ditempatkan di papan, bukan di laporan terpisah, karena inilah satu-satunya
 * umpan balik terstruktur tentang mengapa penawaran gagal — dan darinya
 * katalog, harga, serta pagar pengaman dikoreksi.
 */
export function LostReasonSummary({ rows }: { rows: LostReasonSummaryRow[] }) {
  const total = rows.reduce((sum, row) => sum + row.count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mengapa lead kalah</CardTitle>
        <CardDescription>
          {total > 0
            ? `Ringkasan ${total} lead yang berakhir di kolom Kalah. Urutan teratas adalah masalah yang paling mahal untuk dibiarkan.`
            : 'Belum ada lead yang berakhir kalah. Ringkasan alasan akan muncul di sini begitu ada.'}
        </CardDescription>
      </CardHeader>
      {total > 0 && (
        <CardContent>
          <TableWrapper>
            <Table>
              <thead>
                <tr>
                  <Th>Alasan</Th>
                  <Th className="w-20 text-right">Lead</Th>
                  <Th className="w-40">Porsi</Th>
                  <Th className="w-32 text-right">Nilai hilang</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <Tr key={row.reason ?? 'TANPA_ALASAN'}>
                    <Td>{row.reason ? LOST_REASON_LABEL[row.reason] : 'Tanpa alasan tercatat'}</Td>
                    <Td className="tabular text-right">{row.count}</Td>
                    <Td>
                      <Progress
                        value={(row.count / total) * 100}
                        tone={row.reason === 'HARGA_TERLALU_TINGGI' ? 'danger' : 'brand'}
                      />
                      <span className="tabular mt-1 block text-xs text-fg-subtle">
                        {formatPercent(row.count / total)}
                      </span>
                    </Td>
                    <Td className="tabular text-right">{formatRupiahShort(row.valueMax)}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </TableWrapper>
        </CardContent>
      )}
    </Card>
  );
}
