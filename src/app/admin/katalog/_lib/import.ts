import 'server-only';

import {
  emptyCsvCounts,
  type CsvPreview,
  type CsvPreviewRow,
} from '@/components/admin/catalog/shared';
import { prisma } from '@/lib/db/prisma';
import {
  CATALOG_FEATURE_TYPES,
  PUBLISH_STATUSES,
  type FeatureType,
  type PublishStatus,
} from '@/lib/domain/enums';
import { validateRangeWidth } from '@/lib/pricing';
import { getActivePricingRule } from '@/lib/services/pricing-rule';
import { slugify } from '@/lib/utils';
import { cellOf, parseBooleanCell, parseCsv, parseDecimal, toCatalogCsv } from './csv';

// ---------------------------------------------------------------------------
// Ekspor (L6)
// ---------------------------------------------------------------------------

/**
 * Ekspor katalog sebagai CSV: satu baris per fitur.
 *
 * Kolomnya sengaja sempit — hanya yang benar-benar dipakai tim saat
 * mengalibrasi katalog di spreadsheet. Kolom teknis seperti rasio effort dan
 * media tidak ikut agar berkas tetap dapat dibaca orang non-teknis.
 */
export async function exportCatalogCsv(categorySlug?: string): Promise<string> {
  const features = await prisma.feature.findMany({
    where: categorySlug ? { category: { slug: categorySlug } } : undefined,
    orderBy: [{ category: { sortOrder: 'asc' } }, { sortOrder: 'asc' }, { name: 'asc' }],
    include: {
      category: { select: { slug: true } },
      group: { select: { slug: true } },
    },
  });

  return toCatalogCsv(
    features.map((feature) => ({
      category_slug: feature.category.slug,
      group_slug: feature.group.slug,
      feature_slug: feature.slug,
      name: feature.name,
      client_description: feature.clientDescription,
      type: feature.type,
      manday_min: String(feature.manDayMin),
      manday_max: String(feature.manDayMax),
      is_essential: feature.isEssential ? 'ya' : 'tidak',
      status: feature.status,
    })),
  );
}

// ---------------------------------------------------------------------------
// Impor (L6)
// ---------------------------------------------------------------------------

/** Baris CSV yang sudah lolos validasi dan siap ditulis ke basis data. */
interface ImportPayload {
  categoryId: string;
  categorySlug: string;
  groupSlug: string;
  groupName: string;
  featureSlug: string;
  name: string;
  clientDescription: string;
  type: FeatureType;
  manDayMin: number;
  manDayMax: number;
  isEssential: boolean;
  status: PublishStatus;
  existingId: string | null;
}

export interface ResolvedImport {
  preview: CsvPreview;
  /** Hanya baris NEW dan CHANGED — baris tidak berubah tidak perlu ditulis ulang. */
  payloads: ImportPayload[];
}

/**
 * Membaca teks CSV lalu menyusun pratinjau perubahan (L6).
 *
 * Pratinjau dan penyimpanan memakai fungsi yang sama persis, sehingga apa yang
 * dilihat admin sebelum menekan simpan benar-benar sama dengan yang dieksekusi.
 */
export async function resolveCatalogImport(text: string): Promise<ResolvedImport> {
  const counts = emptyCsvCounts();
  const parsed = parseCsv(text);
  if (parsed.error) {
    return { preview: { rows: [], counts, fatalError: parsed.error }, payloads: [] };
  }

  const [categories, groups, features, rule] = await Promise.all([
    prisma.applicationCategory.findMany({ select: { id: true, slug: true, name: true } }),
    prisma.featureGroup.findMany({ select: { id: true, categoryId: true, slug: true, name: true } }),
    prisma.feature.findMany({
      select: {
        id: true,
        categoryId: true,
        slug: true,
        name: true,
        clientDescription: true,
        type: true,
        manDayMin: true,
        manDayMax: true,
        isEssential: true,
        status: true,
      },
    }),
    getActivePricingRule(),
  ]);

  const categoryBySlug = new Map(categories.map((category) => [category.slug, category]));
  const groupByKey = new Map(groups.map((group) => [`${group.categoryId}:${group.slug}`, group]));
  const featureByKey = new Map(
    features.map((feature) => [`${feature.categoryId}:${feature.slug}`, feature]),
  );

  const rows: CsvPreviewRow[] = [];
  const payloads: ImportPayload[] = [];
  const seenKeys = new Set<string>();
  // Kelompok baru yang sudah "dijanjikan" baris sebelumnya, agar catatannya
  // tidak diulang di setiap baris yang memakai kelompok yang sama.
  const promisedGroups = new Set<string>();

  for (const record of parsed.rows) {
    const cells = record.cells;
    const categorySlug = cellOf(parsed.header, cells, 'category_slug').toLowerCase();
    const groupSlug = cellOf(parsed.header, cells, 'group_slug').toLowerCase();
    const featureSlugRaw = cellOf(parsed.header, cells, 'feature_slug');
    const name = cellOf(parsed.header, cells, 'name');
    const clientDescription = cellOf(parsed.header, cells, 'client_description');
    const typeRaw = cellOf(parsed.header, cells, 'type').toUpperCase();
    const manDayMin = parseDecimal(cellOf(parsed.header, cells, 'manday_min'));
    const manDayMax = parseDecimal(cellOf(parsed.header, cells, 'manday_max'));
    const isEssential = parseBooleanCell(cellOf(parsed.header, cells, 'is_essential'));
    const statusRaw = cellOf(parsed.header, cells, 'status').toUpperCase();

    const featureSlug = featureSlugRaw ? slugify(featureSlugRaw) : slugify(name);
    const problems: string[] = [];
    const notes: string[] = [];

    const category = categoryBySlug.get(categorySlug);
    if (!categorySlug) problems.push('Kolom category_slug kosong.');
    else if (!category) problems.push(`Kategori "${categorySlug}" tidak ada di basis data.`);

    if (!groupSlug) problems.push('Kolom group_slug kosong.');
    if (!featureSlug) problems.push('Slug fitur tidak dapat ditentukan dari kolom mana pun.');
    if (!name) problems.push('Kolom name kosong.');
    if (!clientDescription) problems.push('Kolom client_description kosong.');

    const type = (CATALOG_FEATURE_TYPES as string[]).includes(typeRaw)
      ? (typeRaw as FeatureType)
      : null;
    if (!type) {
      problems.push(
        `Tipe "${typeRaw || '(kosong)'}" tidak dikenal. Pakai ${CATALOG_FEATURE_TYPES.join(', ')}.`,
      );
    }

    if (manDayMin === null || manDayMin <= 0) problems.push('Kolom manday_min bukan angka positif.');
    if (manDayMax === null || manDayMax <= 0) problems.push('Kolom manday_max bukan angka positif.');

    const status = statusRaw
      ? ((PUBLISH_STATUSES as readonly string[]).includes(statusRaw)
          ? (statusRaw as PublishStatus)
          : null)
      : ('DRAFT' as PublishStatus);
    if (status === null) {
      problems.push(`Status "${statusRaw}" tidak dikenal. Pakai ${PUBLISH_STATUSES.join(', ')}.`);
    }

    // Batas lebar rentang ditegakkan sama ketat seperti di form (BR-05):
    // impor massal justru cara paling mudah menyelundupkan rentang yang lebar.
    if (type && manDayMin !== null && manDayMax !== null && manDayMin > 0 && manDayMax > 0) {
      const check = validateRangeWidth(rule, type, manDayMin, manDayMax);
      if (!check.valid && check.message) problems.push(check.message);
    }

    const key = category ? `${category.id}:${featureSlug}` : `${categorySlug}:${featureSlug}`;
    if (seenKeys.has(key)) {
      problems.push('Slug fitur ini muncul lebih dari sekali di berkas yang sama.');
    }
    seenKeys.add(key);

    const base = {
      lineNumber: record.lineNumber,
      categorySlug,
      groupSlug,
      featureSlug,
      name,
    };

    if (problems.length > 0 || !category || !type || status === null || manDayMin === null || manDayMax === null) {
      rows.push({ ...base, status: 'INVALID', changes: [], problems, notes });
      counts.INVALID += 1;
      continue;
    }

    const groupKey = `${category.id}:${groupSlug}`;
    const group = groupByKey.get(groupKey);
    if (!group && !promisedGroups.has(groupKey)) {
      notes.push(`Kelompok "${groupSlug}" belum ada dan akan ikut dibuat.`);
      promisedGroups.add(groupKey);
    }

    const existing = featureByKey.get(`${category.id}:${featureSlug}`);
    const changes: string[] = [];
    if (existing) {
      if (existing.name !== name) changes.push(`nama "${existing.name}" → "${name}"`);
      if (existing.clientDescription !== clientDescription) changes.push('deskripsi klien diubah');
      if (existing.type !== type) changes.push(`tipe ${existing.type} → ${type}`);
      if (existing.manDayMin !== manDayMin) {
        changes.push(`man-day min ${existing.manDayMin} → ${manDayMin}`);
      }
      if (existing.manDayMax !== manDayMax) {
        changes.push(`man-day maks ${existing.manDayMax} → ${manDayMax}`);
      }
      if (existing.isEssential !== isEssential) {
        changes.push(`esensial ${existing.isEssential ? 'ya' : 'tidak'} → ${isEssential ? 'ya' : 'tidak'}`);
      }
      if (existing.status !== status) changes.push(`status ${existing.status} → ${status}`);
    }

    const rowStatus = existing ? (changes.length > 0 ? 'CHANGED' : 'UNCHANGED') : 'NEW';
    counts[rowStatus] += 1;
    rows.push({ ...base, status: rowStatus, changes, problems, notes });

    if (rowStatus !== 'UNCHANGED') {
      payloads.push({
        categoryId: category.id,
        categorySlug: category.slug,
        groupSlug,
        groupName: group?.name ?? groupSlug.replace(/-/g, ' '),
        featureSlug,
        name,
        clientDescription,
        type,
        manDayMin,
        manDayMax,
        isEssential,
        status,
        existingId: existing?.id ?? null,
      });
    }
  }

  return { preview: { rows, counts, fatalError: null }, payloads };
}

export interface ImportOutcome {
  created: number;
  updated: number;
  groupsCreated: number;
  categorySlugs: string[];
}

/** Menulis baris hasil pratinjau ke katalog. */
export async function commitCatalogImport(payloads: ImportPayload[]): Promise<ImportOutcome> {
  let created = 0;
  let updated = 0;
  let groupsCreated = 0;
  const categorySlugs = new Set<string>();

  // Kelompok dibuat lebih dulu dalam satu putaran agar fitur di baris berikutnya
  // sudah menemukannya, termasuk ketika beberapa baris memakai kelompok yang sama.
  const groupIdByKey = new Map<string, string>();
  for (const payload of payloads) {
    const key = `${payload.categoryId}:${payload.groupSlug}`;
    if (groupIdByKey.has(key)) continue;

    const existing = await prisma.featureGroup.findUnique({
      where: { categoryId_slug: { categoryId: payload.categoryId, slug: payload.groupSlug } },
      select: { id: true },
    });
    if (existing) {
      groupIdByKey.set(key, existing.id);
      continue;
    }

    const group = await prisma.featureGroup.create({
      data: {
        categoryId: payload.categoryId,
        slug: payload.groupSlug,
        name: payload.groupName,
        sortOrder: 0,
      },
      select: { id: true },
    });
    groupIdByKey.set(key, group.id);
    groupsCreated += 1;
  }

  for (const payload of payloads) {
    categorySlugs.add(payload.categorySlug);
    const groupId = groupIdByKey.get(`${payload.categoryId}:${payload.groupSlug}`);
    if (!groupId) continue;

    const data = {
      groupId,
      name: payload.name,
      clientDescription: payload.clientDescription,
      type: payload.type,
      manDayMin: payload.manDayMin,
      manDayMax: payload.manDayMax,
      isEssential: payload.isEssential,
      status: payload.status,
    };

    if (payload.existingId) {
      await prisma.feature.update({ where: { id: payload.existingId }, data });
      updated += 1;
    } else {
      await prisma.feature.create({
        data: {
          ...data,
          categoryId: payload.categoryId,
          slug: payload.featureSlug,
          // Baris impor dianggap baru dikalibrasi tim, jadi tidak langsung
          // dihitung sebagai katalog usang (R8).
          lastReviewedAt: new Date(),
        },
      });
      created += 1;
    }
  }

  return { created, updated, groupsCreated, categorySlugs: [...categorySlugs] };
}
