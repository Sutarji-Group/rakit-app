import Link from 'next/link';

import { PageBody, PageHeader } from '@/components/admin';
import { PricingSimulator } from '@/components/admin/pricing/simulator';
import type {
  SimulatorAddOn,
  SimulatorCategory,
  SimulatorRuleOption,
} from '@/components/admin/pricing/types';
import { Alert, EmptyState } from '@/components/ui';
import { requireArea } from '@/lib/auth/guards';
import { prisma } from '@/lib/db/prisma';
import {
  ADDON_KINDS,
  FEATURE_TYPES,
  coerceEnum,
} from '@/lib/domain/enums';
import { toPricingRuleSnapshot } from '@/lib/pricing';

export const metadata = { title: 'Simulator Harga & Margin' };

const PRIMARY_LINK =
  'inline-flex h-9 select-none items-center justify-center rounded-lg bg-brand px-4 text-sm ' +
  'font-medium text-brand-fg shadow-xs transition-colors hover:bg-brand-hover ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand';

const SECONDARY_LINK =
  'inline-flex h-9 select-none items-center justify-center rounded-lg border border-border ' +
  'bg-surface-sunken px-4 text-sm font-medium text-fg transition-colors hover:bg-surface-raised ' +
  'hover:border-border-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand';

/**
 * Simulator harga & margin (M6).
 *
 * Halaman ini adalah pengaman perubahan tarif: sebelum sebuah versi aturan
 * diaktifkan, dampaknya terhadap harga jual, COGS, margin, dan durasi diuji di
 * sini dengan konfigurasi contoh yang mewakili proyek nyata.
 */
export default async function PricingSimulatorPage({
  searchParams,
}: {
  searchParams: Promise<{ banding?: string }>;
}) {
  await requireArea('pricing', '/admin/harga/simulator');
  const { banding } = await searchParams;

  const [rules, categories, addOns] = await Promise.all([
    prisma.pricingRule.findMany({ orderBy: { version: 'desc' } }),
    prisma.applicationCategory.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { sortOrder: 'asc' },
      include: {
        featureGroups: {
          orderBy: { sortOrder: 'asc' },
          include: {
            features: {
              where: { status: 'PUBLISHED' },
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
        presets: {
          where: { status: 'PUBLISHED' },
          orderBy: { sortOrder: 'asc' },
          include: { presetFeatures: { select: { featureId: true } } },
        },
      },
    }),
    prisma.addOn.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { categories: { select: { categoryId: true } } },
    }),
  ]);

  const ruleOptions: SimulatorRuleOption[] = rules.map((rule) => ({
    id: rule.id,
    version: rule.version,
    label: rule.label,
    isActive: rule.isActive,
    snapshot: toPricingRuleSnapshot(rule),
  }));

  const activeRule = ruleOptions.find((rule) => rule.isActive) ?? ruleOptions[0] ?? null;

  const simulatorCategories: SimulatorCategory[] = categories
    .map((category) => ({
      id: category.id,
      name: category.name,
      shortName: category.shortName,
      minViableFeatureCount: category.minViableFeatureCount,
      groups: category.featureGroups
        .map((group) => ({
          id: group.id,
          name: group.name,
          features: group.features.map((feature) => ({
            id: feature.id,
            name: feature.name,
            type: coerceEnum(feature.type, FEATURE_TYPES, 'STANDARD'),
            manDayMin: feature.manDayMin,
            manDayMax: feature.manDayMax,
            effortRatioOverride: feature.effortRatioOverride,
            groupName: group.name,
            isEssential: feature.isEssential,
          })),
        }))
        // Kelompok tanpa fitur terbit hanya menambah kebisingan di daftar.
        .filter((group) => group.features.length > 0),
      presets: category.presets.map((preset) => ({
        id: preset.id,
        name: preset.name,
        tagline: preset.tagline,
        featureIds: preset.presetFeatures.map((link) => link.featureId),
      })),
    }))
    .filter((category) => category.groups.length > 0);

  const simulatorAddOns: SimulatorAddOn[] = addOns.map((addOn) => ({
    id: addOn.id,
    name: addOn.name,
    description: addOn.description,
    kind: coerceEnum(addOn.kind, ADDON_KINDS, 'OTHER'),
    priceMin: addOn.priceMin,
    priceMax: addOn.priceMax,
    manDayMin: addOn.manDayMin,
    manDayMax: addOn.manDayMax,
    isRecurring: addOn.isRecurring,
    categoryIds: addOn.isGlobal ? null : addOn.categories.map((link) => link.categoryId),
  }));

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Mesin Harga', href: '/admin/harga' }, { label: 'Simulator' }]}
        title="Simulator Harga & Margin"
        description="Susun konfigurasi contoh, lalu lihat langsung harga jual, rincian per komponen, proyeksi COGS, gross margin, effort riil, dan estimasi durasi. Perhitungan memakai mesin harga yang sama persis dengan yang dipakai konfigurator dan server."
        actions={
          <Link href="/admin/harga" className={SECONDARY_LINK}>
            Kembali ke mesin harga
          </Link>
        }
      />

      <PageBody className="flex flex-col gap-5">
        {!activeRule ? (
          <EmptyState
            title="Belum ada aturan harga untuk disimulasikan"
            description="Simulator memerlukan minimal satu versi aturan harga. Setelah versi pertama dibuat, halaman ini akan menampilkan harga jual, rincian komponen, proyeksi COGS, margin, dan durasi untuk konfigurasi contoh apa pun."
            action={
              <Link href="/admin/harga/baru" className={PRIMARY_LINK}>
                Buat versi aturan pertama
              </Link>
            }
          />
        ) : simulatorCategories.length === 0 ? (
          <EmptyState
            title="Belum ada katalog yang bisa dirakit"
            description="Simulator menyusun konfigurasi contoh dari kategori aplikasi terbit beserta fiturnya. Terbitkan minimal satu kategori dengan fitur di papan katalog, lalu kembali ke sini untuk menguji dampak tarif."
            action={
              <Link href="/admin/katalog" className={PRIMARY_LINK}>
                Buka papan katalog
              </Link>
            }
          />
        ) : null}

        {activeRule && simulatorCategories.length > 0 && (
          <>
            <Alert tone="info" title="Cara memakai simulator sebelum mengubah tarif">
              Pilih versi draft sebagai pembanding, susun rakitan yang mewakili proyek tipikal, lalu
              baca kolom selisih. Perhatikan gross margin: penawaran dengan margin di bawah ambang
              tidak boleh terbit otomatis (BR-17), dan nilai proyek di bawah minimum akan dialihkan
              ke sesi konsultasi (BR-13).
            </Alert>

            <PricingSimulator
              categories={simulatorCategories}
              addOns={simulatorAddOns}
              ruleOptions={ruleOptions}
              activeRuleId={activeRule.id}
              initialCompareRuleId={banding ?? null}
            />
          </>
        )}
      </PageBody>
    </>
  );
}
