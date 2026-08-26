/**
 * Seed basis data RAKIT.
 *
 * Menyiapkan aturan harga versi pertama, pengguna internal, katalog aplikasi
 * beserta dependensi/preset/wizard, daftar add-on, serta sekumpulan data contoh
 * agar seluruh papan admin (antrean custom, pipeline lead, proyek, analitik)
 * dapat langsung dilihat berfungsi.
 *
 * Jalankan: npm run db:seed   (atau npm run db:reset untuk memulai dari nol)
 */

import { PrismaClient } from '../src/generated/prisma';
import { hashPassword } from '../src/lib/auth/password';
import { stringifyJson } from '../src/lib/db/json';
import {
  DEFAULT_DEPLOYMENT_MULTIPLIERS,
  DEFAULT_PLATFORM_MULTIPLIERS,
  DEFAULT_USER_TIER_PRICING,
  DEFAULT_VOLUME_DISCOUNT_TIERS,
  BASELINE_PRICING_RULE,
  computePrice,
  validateRangeWidth,
  type PriceInputFeature,
} from '../src/lib/pricing';
import type { CatalogDefinition } from '../src/lib/seed/types';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Pemuatan katalog
// ---------------------------------------------------------------------------

/**
 * Katalog dimuat secara dinamis supaya menambah kategori baru cukup dengan
 * menambah satu berkas dan satu baris di sini.
 */
async function loadCatalogs(): Promise<CatalogDefinition[]> {
  const modules: Array<{ path: string; name: string }> = [
    { path: '../src/lib/seed/catalog-wms', name: 'WMS_CATALOG' },
    { path: '../src/lib/seed/catalog-crm', name: 'CRM_CATALOG' },
    { path: '../src/lib/seed/catalog-pos', name: 'POS_CATALOG' },
  ];

  const catalogs: CatalogDefinition[] = [];
  for (const entry of modules) {
    try {
      const mod = (await import(entry.path)) as Record<string, CatalogDefinition>;
      const catalog = mod[entry.name];
      if (catalog) catalogs.push(catalog);
    } catch {
      console.warn(`  ⚠ Katalog ${entry.name} belum tersedia, dilewati.`);
    }
  }
  return catalogs;
}

interface SeedAddOnShape {
  slug: string;
  kind: string;
  name: string;
  description: string;
  icon: string;
  priceMin: number;
  priceMax: number;
  manDayMin: number;
  manDayMax: number;
  isRecurring: boolean;
  optionGroup?: string;
  sortOrder?: number;
  categorySlugs?: string[];
}

async function loadAddOns(): Promise<SeedAddOnShape[]> {
  try {
    const mod = (await import('../src/lib/seed/addons')) as { ADDONS?: SeedAddOnShape[] };
    return mod.ADDONS ?? [];
  } catch {
    console.warn('  ⚠ Daftar add-on belum tersedia, dilewati.');
    return [];
  }
}

// ---------------------------------------------------------------------------
// Validasi katalog sebelum masuk basis data
// ---------------------------------------------------------------------------

interface ValidationIssue {
  catalog: string;
  kind: string;
  detail: string;
}

/**
 * Memeriksa katalog terhadap aturan yang ditegakkan sistem (BR-05, dependensi
 * melingkar, rujukan slug). Lebih baik gagal keras saat seed daripada katalog
 * cacat diam-diam masuk produksi.
 */
function validateCatalog(catalog: CatalogDefinition): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const push = (kind: string, detail: string) =>
    issues.push({ catalog: catalog.slug, kind, detail });

  const features = catalog.groups.flatMap((g) => g.features);
  const bySlug = new Map(features.map((f) => [f.slug, f] as const));

  if (features.length !== bySlug.size) {
    push('DUPLIKAT', 'Terdapat slug fitur yang dipakai lebih dari sekali.');
  }

  // BR-05 — batas lebar rentang per tipe fitur.
  for (const feature of features) {
    const check = validateRangeWidth(
      BASELINE_PRICING_RULE,
      feature.type,
      feature.manDayMin,
      feature.manDayMax,
    );
    if (!check.valid) {
      push(
        'LEBAR_RENTANG',
        `${feature.slug} (${feature.type}) ${feature.manDayMin}–${feature.manDayMax}: ${check.message}`,
      );
    }
  }

  // Rujukan slug pada dependensi.
  const requires = new Map<string, string[]>();
  for (const dep of catalog.dependencies) {
    if (!bySlug.has(dep.feature)) push('RUJUKAN', `Dependensi menunjuk fitur tak dikenal: ${dep.feature}`);
    if (!bySlug.has(dep.target)) push('RUJUKAN', `Dependensi menunjuk target tak dikenal: ${dep.target}`);
    if (dep.feature === dep.target) push('DEPENDENSI', `${dep.feature} merujuk dirinya sendiri.`);
    if (dep.kind === 'REQUIRES') {
      requires.set(dep.feature, [...(requires.get(dep.feature) ?? []), dep.target]);
    }
  }

  // Dependensi melingkar pada relasi REQUIRES.
  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;
  const color = new Map<string, number>(features.map((f) => [f.slug, WHITE]));
  const stack: string[] = [];

  const visit = (node: string): string[] | null => {
    color.set(node, GRAY);
    stack.push(node);
    for (const next of requires.get(node) ?? []) {
      const state = color.get(next) ?? WHITE;
      if (state === GRAY) return [...stack.slice(stack.indexOf(next)), next];
      if (state === WHITE) {
        const found = visit(next);
        if (found) return found;
      }
    }
    stack.pop();
    color.set(node, BLACK);
    return null;
  };

  for (const feature of features) {
    if ((color.get(feature.slug) ?? WHITE) === WHITE) {
      const cycle = visit(feature.slug);
      if (cycle) {
        push('MELINGKAR', `Dependensi melingkar: ${cycle.join(' → ')}`);
        break;
      }
    }
  }

  // Konsistensi preset terhadap prasyarat.
  for (const preset of catalog.presets) {
    const selected = new Set(preset.features);
    for (const slug of preset.features) {
      if (!bySlug.has(slug)) {
        push('PRESET', `Preset ${preset.slug} memuat fitur tak dikenal: ${slug}`);
        continue;
      }
      for (const prerequisite of requires.get(slug) ?? []) {
        if (!selected.has(prerequisite)) {
          push(
            'PRESET',
            `Preset ${preset.slug}: "${slug}" membutuhkan "${prerequisite}" yang belum tercantum.`,
          );
        }
      }
    }
    for (const feature of features) {
      if (feature.type === 'CORE' && !selected.has(feature.slug)) {
        push('PRESET', `Preset ${preset.slug} belum memuat fitur Core "${feature.slug}".`);
      }
    }
  }

  // Rujukan slug pada wizard.
  for (const question of catalog.wizard) {
    for (const option of question.options) {
      for (const map of option.maps) {
        if (!bySlug.has(map.feature)) {
          push('WIZARD', `${question.slug}/${option.slug} memetakan fitur tak dikenal: ${map.feature}`);
        }
      }
      if (option.suggestPresetSlug && !catalog.presets.some((p) => p.slug === option.suggestPresetSlug)) {
        push('WIZARD', `${question.slug}/${option.slug} menunjuk preset tak dikenal: ${option.suggestPresetSlug}`);
      }
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Perhitungan rentang harga tipikal per kategori (A3)
// ---------------------------------------------------------------------------

function typicalRange(catalog: CatalogDefinition) {
  const bySlug = new Map(catalog.groups.flatMap((g) => g.features).map((f) => [f.slug, f] as const));
  const results = catalog.presets.map((preset) => {
    const features: PriceInputFeature[] = preset.features
      .map((slug) => bySlug.get(slug))
      .filter((f): f is NonNullable<typeof f> => Boolean(f))
      .map((f) => ({
        id: f.slug,
        name: f.name,
        type: f.type,
        manDayMin: f.manDayMin,
        manDayMax: f.manDayMax,
      }));
    return computePrice({
      rule: BASELINE_PRICING_RULE,
      features,
      platform: 'WEB',
      deployment: 'OUR_CLOUD',
      userTier: 'T50',
    });
  });

  if (results.length === 0) return null;

  return {
    priceMin: Math.min(...results.map((r) => r.displayTotalMin)),
    priceMax: Math.max(...results.map((r) => r.displayTotalMax)),
    weeksMin: Math.min(...results.map((r) => r.duration.weeksMin)),
    weeksMax: Math.max(...results.map((r) => r.duration.weeksMax)),
    presets: catalog.presets.map((preset, index) => ({
      name: preset.name,
      featureCount: preset.features.length,
      totalMin: results[index].displayTotalMin,
      totalMax: results[index].displayTotalMax,
      marginPct: results[index].internal.grossMarginPct,
      weeks: `${results[index].duration.weeksMin}–${results[index].duration.weeksMax}`,
    })),
  };
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

async function main() {
  console.log('\n=== Seed RAKIT ===\n');

  const catalogs = await loadCatalogs();
  const addOns = await loadAddOns();

  // -- Validasi lebih dulu; jangan biarkan katalog cacat masuk basis data ----
  const issues = catalogs.flatMap(validateCatalog);
  if (issues.length > 0) {
    console.error(`\n✗ Ditemukan ${issues.length} masalah pada katalog:\n`);
    for (const issue of issues.slice(0, 40)) {
      console.error(`  [${issue.catalog}] ${issue.kind}: ${issue.detail}`);
    }
    if (issues.length > 40) console.error(`  … dan ${issues.length - 40} lainnya.`);
    throw new Error('Seed dibatalkan karena katalog belum memenuhi aturan.');
  }
  console.log(`✓ ${catalogs.length} katalog lolos validasi.`);

  // -- Bersihkan data lama ---------------------------------------------------
  await prisma.$transaction([
    prisma.analyticsEvent.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.discussionMessage.deleteMany(),
    prisma.projectDocument.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.invoice.deleteMany(),
    prisma.milestone.deleteMany(),
    prisma.projectTask.deleteMany(),
    prisma.changeRequest.deleteMany(),
    prisma.project.deleteMany(),
    prisma.contract.deleteMany(),
    prisma.leadActivity.deleteMany(),
    prisma.lead.deleteMany(),
    prisma.configurationRevision.deleteMany(),
    prisma.priceSnapshot.deleteMany(),
    prisma.configurationAddOn.deleteMany(),
    prisma.customFeatureRequest.deleteMany(),
    prisma.configurationItem.deleteMany(),
    prisma.configuration.deleteMany(),
    prisma.consultationRequest.deleteMany(),
    prisma.wizardOptionFeature.deleteMany(),
    prisma.wizardOption.deleteMany(),
    prisma.wizardQuestion.deleteMany(),
    prisma.presetFeature.deleteMany(),
    prisma.preset.deleteMany(),
    prisma.featureDependency.deleteMany(),
    prisma.featureMedia.deleteMany(),
    prisma.feature.deleteMany(),
    prisma.featureGroup.deleteMany(),
    prisma.addOnCategory.deleteMany(),
    prisma.addOn.deleteMany(),
    prisma.applicationCategory.deleteMany(),
    prisma.calibrationSnapshot.deleteMany(),
    prisma.session.deleteMany(),
    prisma.pricingRule.deleteMany(),
    prisma.user.deleteMany(),
  ]);
  console.log('✓ Data lama dibersihkan.');

  // -- Pengguna internal & klien contoh -------------------------------------
  const password = await hashPassword('rakit2026');
  const users = await Promise.all(
    [
      { email: 'admin@rakit.id', name: 'Dimas Prakoso', role: 'SUPER_ADMIN' },
      { email: 'katalog@rakit.id', name: 'Rina Wulandari', role: 'CATALOG_ADMIN' },
      { email: 'consultant@rakit.id', name: 'Bayu Nugroho', role: 'CONSULTANT' },
      { email: 'sales@rakit.id', name: 'Sinta Maharani', role: 'SALES' },
      { email: 'pm@rakit.id', name: 'Aldi Rahmatullah', role: 'PM' },
      {
        email: 'klien@contoh.id',
        name: 'Budi Santoso',
        role: 'CLIENT',
        company: 'CV Sumber Rejeki Distribusi',
      },
    ].map((user) =>
      prisma.user.create({
        data: {
          email: user.email,
          name: user.name,
          role: user.role,
          company: 'company' in user ? user.company : 'RAKIT',
          passwordHash: password,
        },
      }),
    ),
  );
  const byRole = new Map(users.map((u) => [u.role, u] as const));
  console.log(`✓ ${users.length} pengguna dibuat (kata sandi semua: rakit2026).`);

  // -- Aturan harga versi pertama -------------------------------------------
  const pricingRule = await prisma.pricingRule.create({
    data: {
      version: 1,
      label: 'Kalibrasi awal — PRD v1.1',
      notes:
        'Nilai bawaan mengikuti PRD bagian 6.2–6.8. Utilisasi billable 65% adalah ASUMSI ' +
        'dan wajib diukur ulang dari data aktual tiap kuartal sebelum tarif dikunci ' +
        '(pertanyaan terbuka PRD #9).',
      isActive: true,
      authorId: byRole.get('SUPER_ADMIN')!.id,
      platformMultipliers: stringifyJson(DEFAULT_PLATFORM_MULTIPLIERS),
      deploymentMultipliers: stringifyJson(DEFAULT_DEPLOYMENT_MULTIPLIERS),
      userTierPricing: stringifyJson(DEFAULT_USER_TIER_PRICING),
      volumeDiscountTiers: stringifyJson(DEFAULT_VOLUME_DISCOUNT_TIERS),
    },
  });
  console.log('✓ Aturan harga versi 1 dibuat dan diaktifkan.');

  // -- Add-on ----------------------------------------------------------------
  const addOnBySlug = new Map<string, string>();
  for (const [index, addOn] of addOns.entries()) {
    const created = await prisma.addOn.create({
      data: {
        slug: addOn.slug,
        kind: addOn.kind,
        name: addOn.name,
        description: addOn.description,
        icon: addOn.icon,
        priceMin: addOn.priceMin,
        priceMax: addOn.priceMax,
        manDayMin: addOn.manDayMin,
        manDayMax: addOn.manDayMax,
        isRecurring: addOn.isRecurring,
        optionGroup: addOn.optionGroup ?? null,
        sortOrder: addOn.sortOrder ?? index,
        isGlobal: !addOn.categorySlugs || addOn.categorySlugs.length === 0,
      },
    });
    addOnBySlug.set(addOn.slug, created.id);
  }
  console.log(`✓ ${addOns.length} add-on dibuat.`);

  // -- Katalog ---------------------------------------------------------------
  const summaries: Array<{ name: string; range: ReturnType<typeof typicalRange> }> = [];

  for (const [catalogIndex, catalog] of catalogs.entries()) {
    const range = typicalRange(catalog);

    const category = await prisma.applicationCategory.create({
      data: {
        slug: catalog.slug,
        name: catalog.name,
        shortName: catalog.shortName,
        icon: catalog.icon,
        accent: catalog.accent,
        tagline: catalog.tagline,
        description: catalog.description,
        longDescription: catalog.longDescription,
        benefits: stringifyJson(catalog.benefits),
        painPoints: stringifyJson(catalog.painPoints),
        minViableFeatureCount: catalog.minViableFeatureCount,
        seoTitle: catalog.seoTitle,
        seoDescription: catalog.seoDescription,
        sortOrder: catalogIndex,
        status: 'PUBLISHED',
        typicalPriceMin: range?.priceMin ?? null,
        typicalPriceMax: range?.priceMax ?? null,
        typicalDurationWeeksMin: range?.weeksMin ?? null,
        typicalDurationWeeksMax: range?.weeksMax ?? null,
      },
    });

    const featureIdBySlug = new Map<string, string>();

    for (const [groupIndex, group] of catalog.groups.entries()) {
      const createdGroup = await prisma.featureGroup.create({
        data: {
          categoryId: category.id,
          slug: group.slug,
          name: group.name,
          description: group.description ?? null,
          icon: group.icon ?? 'Layers',
          sortOrder: groupIndex,
        },
      });

      for (const [featureIndex, feature] of group.features.entries()) {
        const created = await prisma.feature.create({
          data: {
            categoryId: category.id,
            groupId: createdGroup.id,
            slug: feature.slug,
            name: feature.name,
            clientDescription: feature.clientDescription,
            internalDescription: feature.internalDescription ?? null,
            type: feature.type,
            manDayMin: feature.manDayMin,
            manDayMax: feature.manDayMax,
            isEssential: feature.isEssential ?? false,
            keywords: stringifyJson(feature.keywords ?? []),
            status: 'PUBLISHED',
            sortOrder: feature.sortOrder ?? featureIndex,
            seoTitle: feature.seoTitle ?? null,
            seoDescription: feature.seoDescription ?? null,
            lastReviewedAt: new Date(),
          },
        });
        featureIdBySlug.set(feature.slug, created.id);
      }
    }

    for (const dependency of catalog.dependencies) {
      const featureId = featureIdBySlug.get(dependency.feature);
      const targetId = featureIdBySlug.get(dependency.target);
      if (!featureId || !targetId) continue;
      await prisma.featureDependency.create({
        data: {
          featureId,
          targetFeatureId: targetId,
          kind: dependency.kind,
          note: dependency.note ?? null,
        },
      });
    }

    for (const [presetIndex, preset] of catalog.presets.entries()) {
      await prisma.preset.create({
        data: {
          categoryId: category.id,
          slug: preset.slug,
          name: preset.name,
          tagline: preset.tagline,
          description: preset.description,
          bestFor: stringifyJson(preset.bestFor),
          sortOrder: presetIndex,
          isDefault: preset.isDefault ?? presetIndex === 1,
          status: 'PUBLISHED',
          presetFeatures: {
            create: preset.features
              .map((slug) => featureIdBySlug.get(slug))
              .filter((id): id is string => Boolean(id))
              .map((featureId) => ({ featureId })),
          },
        },
      });
    }

    for (const [questionIndex, question] of catalog.wizard.entries()) {
      const createdQuestion = await prisma.wizardQuestion.create({
        data: {
          categoryId: category.id,
          slug: question.slug,
          question: question.question,
          helpText: question.helpText ?? null,
          inputType: question.inputType,
          sortOrder: questionIndex,
        },
      });

      for (const [optionIndex, option] of question.options.entries()) {
        await prisma.wizardOption.create({
          data: {
            questionId: createdQuestion.id,
            slug: option.slug,
            label: option.label,
            description: option.description ?? null,
            icon: option.icon ?? 'Circle',
            sortOrder: optionIndex,
            suggestPresetSlug: option.suggestPresetSlug ?? null,
            featureLinks: {
              create: option.maps
                .map((map) => ({ featureId: featureIdBySlug.get(map.feature), reason: map.reason }))
                .filter((m): m is { featureId: string; reason: string } => Boolean(m.featureId))
                .map((m) => ({ featureId: m.featureId, reason: m.reason })),
            },
          },
        });
      }
    }

    // Kaitkan add-on yang dibatasi ke kategori tertentu.
    for (const addOn of addOns) {
      if (addOn.categorySlugs?.includes(catalog.slug)) {
        const addOnId = addOnBySlug.get(addOn.slug);
        if (addOnId) {
          await prisma.addOnCategory.create({ data: { addOnId, categoryId: category.id } });
        }
      }
    }

    const featureCount = catalog.groups.reduce((sum, g) => sum + g.features.length, 0);
    console.log(
      `✓ ${catalog.shortName}: ${catalog.groups.length} kelompok, ${featureCount} fitur, ` +
        `${catalog.dependencies.length} dependensi, ${catalog.presets.length} preset, ` +
        `${catalog.wizard.length} pertanyaan wizard.`,
    );
    summaries.push({ name: catalog.shortName, range });
  }

  // -- Ringkasan kalibrasi harga --------------------------------------------
  console.log('\n--- Rentang harga tipikal per preset ---');
  for (const summary of summaries) {
    if (!summary.range) continue;
    console.log(`\n${summary.name}`);
    for (const preset of summary.range.presets) {
      const rp = (v: number) => `Rp ${(v / 1_000_000).toLocaleString('id-ID')} jt`;
      console.log(
        `  ${preset.name.padEnd(20)} ${String(preset.featureCount).padStart(2)} fitur  ` +
          `${rp(preset.totalMin).padStart(12)} – ${rp(preset.totalMax).padEnd(12)} ` +
          `GM ${(preset.marginPct * 100).toFixed(1)}%  ${preset.weeks} minggu`,
      );
    }
  }

  await seedDemoData(prisma, pricingRule.id, byRole);

  console.log('\n=== Seed selesai ===');
  console.log('\nMasuk sebagai:');
  console.log('  admin@rakit.id      / rakit2026   (Super Admin)');
  console.log('  katalog@rakit.id    / rakit2026   (Admin Katalog)');
  console.log('  consultant@rakit.id / rakit2026   (Solution Consultant)');
  console.log('  sales@rakit.id      / rakit2026   (Sales)');
  console.log('  pm@rakit.id         / rakit2026   (Project Manager)');
  console.log('  klien@contoh.id     / rakit2026   (Klien — portal)\n');
}

// Data contoh dipisah agar mudah dinonaktifkan pada instalasi produksi.
async function seedDemoData(
  db: PrismaClient,
  pricingRuleId: string,
  byRole: Map<string, { id: string }>,
): Promise<void> {
  const { seedDemo } = await import('./seed-demo');
  await seedDemo(db, pricingRuleId, byRole);
}

main()
  .catch((error) => {
    console.error('\n✗ Seed gagal:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
