import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowLeft, ArrowRight, TrendingDown, TrendingUp } from 'lucide-react';
import { Badge, Button, Card, EmptyState } from '@/components/ui';
import { PageIntro } from '@/components/portal/page-intro';
import {
  CONFIGURATION_STATUS_TONE,
  REVISION_ACTION_LABEL,
  REVISION_ACTION_TONE,
} from '@/components/portal/status';
import { requireUser } from '@/lib/auth/guards';
import { CONFIGURATION_STATUS_LABEL } from '@/lib/domain/enums';
import { formatDateTime, formatRupiah, formatRupiahRange } from '@/lib/format';
import { getRevisionHistory } from '../../../_lib/queries';

export const metadata: Metadata = { title: 'Riwayat rakitan' };

export default async function RiwayatRakitanPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const user = await requireUser(`/akun/rakitan/${token}/riwayat`);
  const history = await getRevisionHistory(token, user.id);

  if (!history) notFound();

  return (
    <div className="flex flex-col gap-8">
      <PageIntro
        eyebrow={history.categoryName}
        title={`Riwayat: ${history.name}`}
        description="Setiap perubahan tercatat lengkap dengan pergerakan estimasi biayanya, sehingga Anda tahu keputusan mana yang menaikkan atau menurunkan angka."
        actions={
          <>
            <Button asChild size="sm" variant="secondary">
              <Link href="/akun">
                <ArrowLeft className="size-4" aria-hidden="true" />
                Kembali
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href={`/rakit/${history.token}`}>
                Buka rakitan
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
          </>
        }
      />

      <div>
        <Badge variant={CONFIGURATION_STATUS_TONE[history.status]} size="md">
          {CONFIGURATION_STATUS_LABEL[history.status]}
        </Badge>
      </div>

      {history.entries.length === 0 ? (
        <EmptyState
          title="Belum ada perubahan tercatat"
          description="Riwayat mulai terisi begitu Anda menambah atau mengurangi fitur di konfigurator."
          action={
            <Button asChild>
              <Link href={`/rakit/${history.token}`}>Buka rakitan</Link>
            </Button>
          }
        />
      ) : (
        <ol className="flex flex-col gap-3">
          {history.entries.map((entry) => {
            const naik = entry.deltaMax > 0;
            const turun = entry.deltaMax < 0;
            return (
              <li key={entry.id}>
                <Card className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="tabular text-xs font-semibold text-fg-subtle">
                          v{entry.version}
                        </span>
                        <Badge variant={REVISION_ACTION_TONE[entry.action]}>
                          {REVISION_ACTION_LABEL[entry.action]}
                        </Badge>
                      </div>
                      <p className="mt-1.5 text-sm leading-relaxed text-fg">{entry.summary}</p>
                      <p className="mt-1 text-xs text-fg-subtle">
                        {entry.actorLabel} · {formatDateTime(entry.createdAt)}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="tabular text-sm font-semibold text-fg">
                        {formatRupiahRange(entry.totalMin, entry.totalMax)}
                      </p>
                      {(naik || turun) && (
                        <p
                          className={`tabular mt-0.5 inline-flex items-center gap-1 text-xs font-medium ${
                            naik ? 'text-danger' : 'text-success'
                          }`}
                        >
                          {naik ? (
                            <TrendingUp className="size-3.5" aria-hidden="true" />
                          ) : (
                            <TrendingDown className="size-3.5" aria-hidden="true" />
                          )}
                          {naik ? '+' : '−'}
                          {formatRupiah(Math.abs(entry.deltaMax))}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ol>
      )}

      <p className="text-xs leading-relaxed text-fg-subtle">
        Angka pada tiap baris adalah estimasi batas bawah sampai batas atas saat perubahan itu
        terjadi. Perubahan tarif kami tidak pernah berlaku surut terhadap penawaran yang sudah
        terbit.
      </p>
    </div>
  );
}
