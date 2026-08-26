import 'server-only';

import { cache } from 'react';

import { buildDependencyGraph, enforceSelection } from '@/lib/configurator/dependency';
import { prisma } from '@/lib/db/prisma';
import { parseStringArray } from '@/lib/db/json';
import { coerceEnum, FEATURE_TYPES, WIZARD_INPUT_TYPES } from '@/lib/domain/enums';
import {
  computePrice,
  type PriceImpactLevel,
  type PriceInputFeature,
  type PricingRuleSnapshot,
} from '@/lib/pricing';
import {
  indexFeatures,
  listPublishedCategories,
  loadCatalogBundle,
  toDependencyFeatures,
  type CatalogBundle,
  type CategoryDTO,
  type FeatureDTO,
  type FeatureGroupDTO,
} from '@/lib/services/catalog';
import { getActivePricingRule } from '@/lib/services/pricing-rule';
import type {
  FeatureCardData,
  FeatureDetailView,
  FeatureIndexCategory,
  PresetSummary,
  RelatedFeatureView,
  WizardPresetView,
  WizardQuestionView,
} from './types';

/**
 * Pilihan proyek bawaan saat konfigurator baru dibuka (PRD 6.5): web saja,
 * cloud kami, sampai 10 pengguna — sama dengan nilai bawaan di
 * `createConfiguration`.
 *
 * Dipakai untuk semua angka di halaman publik supaya rentang harga preset
 * yang dilihat klien di sini persis sama dengan angka yang muncul sedetik
 * kemudian di konfigurator. Selisih sekecil apa pun merusak kepercayaan.
 */
const DEFAULT_PROJECT_OPTIONS = {
  platform: 'WEB',
  deployment: 'OUR_CLOUD',
  userTier: 'T10',
} as const;

/** Maksimal pertanyaan wizard yang ditampilkan (B1). */
const MAX_WIZARD_QUESTIONS = 6;

function toPriceInputFeature(feature: FeatureDTO, groupName: string): PriceInputFeature {
  return {
    id: feature.id,
    name: feature.name,
    type: feature.type,
    manDayMin: feature.manDayMin,
    manDayMax: feature.manDayMax,
    effortRatioOverride: feature.effortRatioOverride,
    groupName,
  };
}

/** Peta id fitur → nama kelompoknya, dipakai berulang di modul ini. */
function groupNameByFeatureId(groups: FeatureGroupDTO[]): Map<string, string> {
  return new Map(
    groups.flatMap((group) => group.features.map((feature) => [feature.id, group.name] as const)),
  );
}

/**
 * Indikator dampak harga per fitur (C2.4).
 *
 * Dihitung lewat mesin harga yang sama dengan konfigurator, bukan rumus
 * tersendiri, agar tingkat "Rp / Rp Rp / Rp Rp Rp" satu fitur tidak pernah
 * berbeda antara halaman fitur dan keranjang.
 */
function impactByFeatureId(
  bundle: CatalogBundle,
  rule: PricingRuleSnapshot,
): Map<string, PriceImpactLevel> {
  const names = groupNameByFeatureId(bundle.groups);
  const features = bundle.groups.flatMap((group) =>
    group.features.map((feature) => toPriceInputFeature(feature, names.get(feature.id) ?? group.name)),
  );
  const breakdown = computePrice({ rule, features, ...DEFAULT_PROJECT_OPTIONS });
  return new Map(breakdown.lines.map((line) => [line.id, line.impact] as const));
}

/**
 * Ringkasan preset lengkap dengan rentang harga hasil mesin harga (C1).
 *
 * Fitur preset dilewatkan `enforceSelection()` lebih dulu supaya jumlah fitur
 * dan harganya sudah memperhitungkan fitur Core (BR-01) serta prasyarat yang
 * ikut terbawa — sama seperti yang nanti tersimpan di konfigurasi.
 */
export function buildPresetSummaries(
  bundle: CatalogBundle,
  rule: PricingRuleSnapshot,
): PresetSummary[] {
  const graph = buildDependencyGraph(toDependencyFeatures(bundle.groups), bundle.dependencies);
  const features = indexFeatures(bundle.groups);
  const names = groupNameByFeatureId(bundle.groups);

  return bundle.presets.map((preset) => {
    const selected = enforceSelection(graph, preset.featureIds).selected;
    const priceFeatures = [...selected]
      .map((id) => features.get(id))
      .filter((feature): feature is FeatureDTO => Boolean(feature))
      .map((feature) => toPriceInputFeature(feature, names.get(feature.id) ?? ''));

    const breakdown = computePrice({ rule, features: priceFeatures, ...DEFAULT_PROJECT_OPTIONS });

    return {
      slug: preset.slug,
      name: preset.name,
      tagline: preset.tagline,
      description: preset.description,
      bestFor: preset.bestFor,
      isDefault: preset.isDefault,
      featureCount: selected.size,
      // Angka yang ditampilkan ke klien dibulatkan ke jutaan terdekat (C4.1).
      priceMin: breakdown.displayTotalMin,
      priceMax: breakdown.displayTotalMax,
      durationWeeksMin: breakdown.duration.weeksMin,
      durationWeeksMax: breakdown.duration.weeksMax,
    };
  });
}

/** Id + status satu kategori. Halaman publik hanya boleh menampilkan PUBLISHED. */
async function findPublishedCategoryId(slug: string): Promise<string | null> {
  const row = await prisma.applicationCategory.findUnique({
    where: { slug },
    select: { id: true, status: true },
  });
  return row && row.status === 'PUBLISHED' ? row.id : null;
}

export interface CategoryPageData {
  category: CategoryDTO;
  bundle: CatalogBundle;
  presets: PresetSummary[];
}

/**
 * Seluruh isi halaman satu kategori aplikasi.
 *
 * Dibungkus `cache()` agar `generateMetadata` dan komponen halaman berbagi
 * satu kali baca basis data, bukan dua.
 */
export const getCategoryPageData = cache(
  async (slug: string): Promise<CategoryPageData | null> => {
    const categoryId = await findPublishedCategoryId(slug);
    if (!categoryId) return null;

    const [bundle, rule] = await Promise.all([
      loadCatalogBundle(categoryId),
      getActivePricingRule(),
    ]);
    if (!bundle) return null;

    return {
      category: bundle.category,
      bundle,
      presets: buildPresetSummaries(bundle, rule),
    };
  },
);

/**
 * Kartu katalog untuk halaman /aplikasi.
 *
 * Bila admin belum mengunci rentang tipikal sebuah kategori, angkanya dihitung
 * dari preset bawaan lewat mesin harga — kartu katalog tanpa harga membuat
 * pengunjung menebak-nebak, dan menebak-nebak berakhir di tab yang ditutup.
 */
export async function listCatalogCards(): Promise<CategoryDTO[]> {
  const categories = await listPublishedCategories();

  const incomplete = categories.filter(
    (category) =>
      category.typicalPriceMin == null ||
      category.typicalPriceMax == null ||
      category.typicalDurationWeeksMin == null ||
      category.typicalDurationWeeksMax == null,
  );
  if (incomplete.length === 0) return categories;

  const rule = await getActivePricingRule();
  // Katalog dimuat berbarengan, bukan berurutan: halaman ini adalah pintu
  // masuk utama dan waktu muatnya ikut dinilai (NFR performa).
  const bundles = await Promise.all(incomplete.map((category) => loadCatalogBundle(category.id)));

  const filled = new Map<string, CategoryDTO>();
  incomplete.forEach((category, index) => {
    const bundle = bundles[index];
    if (!bundle) return;
    const presets = buildPresetSummaries(bundle, rule);
    const basis = presets.find((preset) => preset.isDefault) ?? presets[0];
    if (!basis) return;
    filled.set(category.id, {
      ...category,
      typicalPriceMin: category.typicalPriceMin ?? basis.priceMin,
      typicalPriceMax: category.typicalPriceMax ?? basis.priceMax,
      typicalDurationWeeksMin: category.typicalDurationWeeksMin ?? basis.durationWeeksMin,
      typicalDurationWeeksMax: category.typicalDurationWeeksMax ?? basis.durationWeeksMax,
    });
  });

  return categories.map((category) => filled.get(category.id) ?? category);
}

export interface WizardPageData {
  category: CategoryDTO;
  questions: WizardQuestionView[];
  presets: WizardPresetView[];
}

/**
 * Pertanyaan wizard beserta pemetaan jawaban → fitur (B2, B3, B4).
 *
 * Pertanyaan dan alasan rekomendasi seluruhnya berasal dari basis data; modul
 * ini hanya menyusunnya menjadi bentuk siap render, tanpa menambah logika
 * bisnis apa pun di lapisan tampilan.
 */
export const getWizardPageData = cache(async (slug: string): Promise<WizardPageData | null> => {
  const data = await getCategoryPageData(slug);
  if (!data) return null;

  const rows = await prisma.wizardQuestion.findMany({
    where: { categoryId: data.category.id, isActive: true },
    orderBy: { sortOrder: 'asc' },
    take: MAX_WIZARD_QUESTIONS,
    include: {
      options: {
        orderBy: { sortOrder: 'asc' },
        include: {
          featureLinks: {
            include: {
              feature: {
                select: {
                  id: true,
                  slug: true,
                  name: true,
                  type: true,
                  status: true,
                  group: { select: { name: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  const questions: WizardQuestionView[] = rows.map((row) => ({
    slug: row.slug,
    question: row.question,
    helpText: row.helpText,
    inputType: coerceEnum(row.inputType, WIZARD_INPUT_TYPES, 'SINGLE'),
    options: row.options.map((option) => ({
      slug: option.slug,
      label: option.label,
      description: option.description,
      icon: option.icon,
      suggestPresetSlug: option.suggestPresetSlug,
      features: option.featureLinks
        // Fitur yang belum terbit tidak boleh muncul sebagai rekomendasi:
        // klien akan mencarinya di konfigurator dan tidak menemukannya.
        .filter((link) => link.feature.status === 'PUBLISHED')
        .map((link) => ({
          id: link.feature.id,
          slug: link.feature.slug,
          name: link.feature.name,
          type: coerceEnum(link.feature.type, FEATURE_TYPES, 'STANDARD'),
          groupName: link.feature.group.name,
          reason: link.reason,
        })),
    })),
  }));

  // Urutan katalog dipakai sebagai peringkat kelengkapan paket: preset yang
  // berada lebih belakang dianggap lebih lengkap (Starter → Growth → Enterprise).
  const presets: WizardPresetView[] = data.presets.map((preset, index) => ({
    slug: preset.slug,
    name: preset.name,
    featureCount: preset.featureCount,
    isDefault: preset.isDefault,
    rank: index,
  }));

  return { category: data.category, questions, presets };
});

/**
 * Seluruh fitur terbit, dikelompokkan per kategori aplikasi, untuk /fitur.
 *
 * Seluruh isi dirender di server agar terbaca mesin pencari — halaman fitur
 * adalah sumber trafik organik terbesar pada persyaratan non-fungsional SEO.
 */
export async function listFeatureIndex(): Promise<FeatureIndexCategory[]> {
  const [categories, rule] = await Promise.all([
    listPublishedCategories(),
    getActivePricingRule(),
  ]);

  const bundles = await Promise.all(categories.map((category) => loadCatalogBundle(category.id)));
  const result: FeatureIndexCategory[] = [];

  categories.forEach((category, index) => {
    const bundle = bundles[index];
    if (!bundle) return;

    const impacts = impactByFeatureId(bundle, rule);
    const features: FeatureCardData[] = bundle.groups.flatMap((group) =>
      group.features.map((feature) => ({
        slug: feature.slug,
        name: feature.name,
        clientDescription: feature.clientDescription,
        type: feature.type,
        groupName: group.name,
        keywords: feature.keywords,
        impact: impacts.get(feature.id) ?? 1,
      })),
    );

    if (features.length === 0) return;

    result.push({
      slug: category.slug,
      name: category.name,
      shortName: category.shortName,
      icon: category.icon,
      tagline: category.tagline,
      features,
    });
  });

  return result;
}

function toRelated(row: {
  slug: string;
  name: string;
  type: string;
  note?: string | null;
}): RelatedFeatureView {
  return {
    slug: row.slug,
    name: row.name,
    type: coerceEnum(row.type, FEATURE_TYPES, 'STANDARD'),
    note: row.note ?? null,
  };
}

/** Isi satu halaman fitur. `null` bila fitur atau kategorinya belum terbit. */
export const getFeatureDetail = cache(
  async (categorySlug: string, featureSlug: string): Promise<FeatureDetailView | null> => {
    const feature = await prisma.feature.findFirst({
      where: {
        slug: featureSlug,
        status: 'PUBLISHED',
        category: { slug: categorySlug, status: 'PUBLISHED' },
      },
      include: {
        category: {
          select: { slug: true, name: true, shortName: true, icon: true, tagline: true },
        },
        group: { select: { id: true, name: true, description: true, icon: true } },
        dependencies: {
          include: {
            target: { select: { slug: true, name: true, type: true, status: true } },
          },
        },
      },
    });
    if (!feature) return null;

    const [rule, siblings] = await Promise.all([
      getActivePricingRule(),
      prisma.feature.findMany({
        where: { groupId: feature.groupId, status: 'PUBLISHED', NOT: { id: feature.id } },
        orderBy: { sortOrder: 'asc' },
        take: 6,
        select: { slug: true, name: true, type: true },
      }),
    ]);

    const type = coerceEnum(feature.type, FEATURE_TYPES, 'STANDARD');

    // Dampak harga dihitung lewat mesin harga agar identik dengan konfigurator.
    const breakdown = computePrice({
      rule,
      features: [
        {
          id: feature.id,
          name: feature.name,
          type,
          manDayMin: feature.manDayMin,
          manDayMax: feature.manDayMax,
          effortRatioOverride: feature.effortRatioOverride,
          groupName: feature.group.name,
        },
      ],
      ...DEFAULT_PROJECT_OPTIONS,
    });

    const published = feature.dependencies.filter((edge) => edge.target.status === 'PUBLISHED');

    return {
      category: feature.category,
      group: {
        name: feature.group.name,
        description: feature.group.description,
        icon: feature.group.icon,
      },
      feature: {
        slug: feature.slug,
        name: feature.name,
        clientDescription: feature.clientDescription,
        type,
        groupName: feature.group.name,
        keywords: parseStringArray(feature.keywords),
        impact: breakdown.lines[0]?.impact ?? 1,
        seoTitle: feature.seoTitle,
        seoDescription: feature.seoDescription,
      },
      requires: published
        .filter((edge) => edge.kind === 'REQUIRES')
        .map((edge) => toRelated({ ...edge.target, note: edge.note })),
      recommends: published
        .filter((edge) => edge.kind === 'RECOMMENDS')
        .map((edge) => toRelated({ ...edge.target, note: edge.note })),
      siblings: siblings.map((row) => toRelated(row)),
    };
  },
);

/** Parameter untuk `generateStaticParams` halaman kategori. */
export async function listCategoryParams(): Promise<Array<{ slug: string }>> {
  try {
    const rows = await prisma.applicationCategory.findMany({
      where: { status: 'PUBLISHED' },
      select: { slug: true },
    });
    return rows.map((row) => ({ slug: row.slug }));
  } catch {
    // Build tetap berjalan walau basis data belum siap; halaman dirender
    // saat pertama diminta.
    return [];
  }
}

/** Parameter untuk `generateStaticParams` halaman fitur. */
export async function listFeatureParams(): Promise<
  Array<{ categorySlug: string; featureSlug: string }>
> {
  try {
    const rows = await prisma.feature.findMany({
      where: { status: 'PUBLISHED', category: { status: 'PUBLISHED' } },
      select: { slug: true, category: { select: { slug: true } } },
    });
    return rows.map((row) => ({ categorySlug: row.category.slug, featureSlug: row.slug }));
  } catch {
    return [];
  }
}
