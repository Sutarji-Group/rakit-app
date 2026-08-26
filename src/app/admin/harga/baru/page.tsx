import Link from 'next/link';

import { PageBody, PageHeader } from '@/components/admin';
import { PricingRuleForm } from '@/components/admin/pricing/rule-form';
import {
  baselineFormValues,
  baselineGuardrailValues,
  ruleToGuardrailValues,
  snapshotToFormValues,
} from '@/components/admin/pricing/rule-values';
import { Alert } from '@/components/ui';
import { requireArea } from '@/lib/auth/guards';
import { prisma } from '@/lib/db/prisma';
import { formatDate } from '@/lib/format';
import { toPricingRuleSnapshot } from '@/lib/pricing';

export const metadata = { title: 'Versi Aturan Harga Baru' };

const SECONDARY_LINK =
  'inline-flex h-9 select-none items-center justify-center rounded-lg border border-border ' +
  'bg-surface-sunken px-4 text-sm font-medium text-fg transition-colors hover:bg-surface-raised ' +
  'hover:border-border-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand';

/**
 * Membuat versi aturan harga baru (M8).
 *
 * Bawaannya menyalin versi aktif, bukan mulai dari nol: kalibrasi tarif hampir
 * selalu berupa penyesuaian beberapa angka dari versi berjalan, dan menyalin
 * membuat perbedaan antar versi mudah dibaca di riwayat.
 */
export default async function NewPricingRulePage({
  searchParams,
}: {
  searchParams: Promise<{ dari?: string }>;
}) {
  await requireArea('pricing', '/admin/harga/baru');
  const { dari } = await searchParams;

  const source = dari
    ? await prisma.pricingRule.findUnique({ where: { id: dari } })
    : await prisma.pricingRule.findFirst({ where: { isActive: true } });

  const latest = await prisma.pricingRule.findFirst({ orderBy: { version: 'desc' } });
  const nextVersion = (latest?.version ?? 0) + 1;

  const initialValues = source
    ? snapshotToFormValues(
        toPricingRuleSnapshot(source),
        `Kalibrasi v${nextVersion} — salinan v${source.version}`,
        '',
      )
    : baselineFormValues();

  const guardrails = source ? ruleToGuardrailValues(source) : baselineGuardrailValues();

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Mesin Harga', href: '/admin/harga' }, { label: 'Versi baru' }]}
        title={`Versi aturan harga v${nextVersion}`}
        description={
          source
            ? `Disalin dari v${source.version} · ${source.label} (berlaku sejak ${formatDate(source.effectiveFrom)}). Ubah angka yang perlu dikalibrasi, sisanya biarkan sama.`
            : 'Belum ada versi sebelumnya, sehingga form terisi nilai bawaan PRD bagian 6.2 – 6.8.'
        }
        actions={
          <Link href="/admin/harga" className={SECONDARY_LINK}>
            Kembali ke riwayat versi
          </Link>
        }
      />

      <PageBody className="flex flex-col gap-5">
        <Alert tone="info" title="Versi baru lahir sebagai draft">
          Versi ini tidak langsung dipakai konfigurator kecuali Anda mencentang &ldquo;langsung
          aktifkan&rdquo; di bilah aksi. Alur yang dianjurkan: simpan sebagai draft, uji di
          simulator harga dengan pembanding aturan aktif, baru aktifkan bila dampaknya sudah
          sesuai. Pagar pengaman komersial (PRD 6.8) ikut disalin dari versi sumber dan dapat
          diubah setelah versi ini tersimpan.
        </Alert>

        <PricingRuleForm
          mode="create"
          version={nextVersion}
          isActive={false}
          issuedConfigCount={0}
          initialValues={initialValues}
          guardrails={guardrails}
          sourceRuleId={source?.id ?? null}
        />
      </PageBody>
    </>
  );
}
