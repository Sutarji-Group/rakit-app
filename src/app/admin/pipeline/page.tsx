import { PageBody, PageHeader } from '@/components/admin';
import { LostReasonSummary } from '@/components/admin/pipeline/lost-summary';
import { PipelineBoard } from '@/components/admin/pipeline/pipeline-board';
import { Alert, EmptyState, Stat } from '@/components/ui';
import { requireArea } from '@/lib/auth/guards';
import { LEAD_PIPELINE_STAGES } from '@/lib/domain/enums';
import { formatPercent, formatRupiahShort } from '@/lib/format';
import { loadPipelineBoard } from './_lib/queries';

export const metadata = { title: 'Pipeline Lead' };

/**
 * Papan kanban quote/lead (O1).
 *
 * Nilai proyek dan proyeksi gross margin selalu tampil berdampingan di setiap
 * kartu: proyek besar bukan otomatis proyek sehat, dan papan ini adalah tempat
 * pertama tim melihat keduanya bersamaan (PRD Lampiran C).
 */
export default async function PipelinePage() {
  await requireArea('leads', '/admin/pipeline');

  const { cards, stats, lostSummary } = await loadPipelineBoard();

  return (
    <>
      <PageHeader
        title="Pipeline Lead"
        description="Seluruh penawaran yang masuk dari konfigurator, dari tahap Baru sampai Menang atau Kalah. Angka internal di halaman ini tidak pernah tampil ke klien."
      />
      <PageBody className="flex flex-col gap-6">
        {cards.length === 0 ? (
          <EmptyState
            title="Belum ada penawaran masuk"
            description="Setiap konfigurasi yang dikirim klien dari konfigurator muncul di sini sebagai kartu lead: nilai proyek, proyeksi margin, penanggung jawab, dan riwayat perubahan keranjangnya."
          />
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Stat
                label="Lead berjalan"
                value={stats.activeCount}
                hint={`Nilai pipeline ${formatRupiahShort(stats.activeValueMin)} – ${formatRupiahShort(stats.activeValueMax)}`}
              />
              <Stat
                label="Menang / kalah"
                value={`${stats.wonCount} / ${stats.lostCount}`}
                tone={stats.wonCount >= stats.lostCount ? 'success' : 'warning'}
                hint={
                  stats.winRate === null
                    ? 'Belum ada lead yang selesai.'
                    : `Tingkat kemenangan ${formatPercent(stats.winRate, 1)}`
                }
              />
              <Stat
                label="Pengingat lewat tempo"
                value={stats.overdueReminders}
                tone={stats.overdueReminders > 0 ? 'danger' : 'neutral'}
                hint="Follow-up yang seharusnya sudah dikerjakan."
              />
              <Stat
                label="Override menunggu"
                value={stats.pendingOverrides}
                tone={stats.pendingOverrides > 0 ? 'warning' : 'neutral'}
                hint="Diskon di luar kuota 10% yang butuh persetujuan (BR-16)."
              />
            </div>

            {stats.overdueReminders > 0 && (
              <Alert tone="danger" title="Ada follow-up yang terlewat">
                {stats.overdueReminders} pengingat sudah lewat jatuh tempo. Kartu terkait ditandai
                merah di papan — buka detail lead untuk menutupnya.
              </Alert>
            )}

            <PipelineBoard stages={LEAD_PIPELINE_STAGES} leads={cards} />

            <LostReasonSummary rows={lostSummary} />
          </>
        )}
      </PageBody>
    </>
  );
}
