'use server';

import { revalidatePath } from 'next/cache';
import {
  actionFail,
  actionOk,
  type CatalogActionResult,
  type CategoryInput,
  type FeatureInput,
  type GroupInput,
} from '@/components/admin/catalog/shared';
import { requireArea } from '@/lib/auth/guards';
import { stringifyJson } from '@/lib/db/json';
import { prisma } from '@/lib/db/prisma';
import {
  CATALOG_FEATURE_TYPES,
  MEDIA_KINDS,
  PUBLISH_STATUSES,
  coerceEnum,
  type FeatureType,
  type PublishStatus,
} from '@/lib/domain/enums';
import { validateRangeWidth } from '@/lib/pricing';
import { getActivePricingRule } from '@/lib/services/pricing-rule';
import { slugify } from '@/lib/utils';
import { recordCatalogAudit } from './_lib/audit';

// ---------------------------------------------------------------------------
// Utilitas bersama
// ---------------------------------------------------------------------------

/**
 * Menyegarkan seluruh halaman yang menampilkan katalog.
 *
 * Halaman publik ikut disegarkan karena status terbit fitur menentukan apa
 * yang tampil di konfigurator (L7): fitur DRAFT tidak boleh bocor ke klien.
 */
function revalidateCatalog(categorySlug?: string): void {
  revalidatePath('/admin/katalog');
  revalidatePath('/admin/katalog/preset');
  revalidatePath('/admin/katalog/wizard');
  revalidatePath('/admin/katalog/impor');
  if (categorySlug) {
    revalidatePath(`/admin/katalog/${categorySlug}`);
    revalidatePath(`/admin/katalog/${categorySlug}/dependensi`);
  }
  revalidatePath('/');
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function normalizeSlug(raw: string, fallbackFrom: string): string {
  const candidate = raw.trim() ? slugify(raw) : slugify(fallbackFrom);
  return candidate;
}

function requireText(value: string, max = 5000): string {
  return value.trim().slice(0, max);
}

// ---------------------------------------------------------------------------
// L1 — Kategori aplikasi
// ---------------------------------------------------------------------------

export async function saveCategory(input: CategoryInput): Promise<CatalogActionResult> {
  const actor = await requireArea('catalog');

  const name = requireText(input.name, 120);
  const slug = normalizeSlug(input.slug, name);
  const fieldErrors: Record<string, string> = {};

  if (!name) fieldErrors.name = 'Nama kategori wajib diisi.';
  if (!slug || !SLUG_PATTERN.test(slug)) {
    fieldErrors.slug = 'Slug hanya boleh huruf kecil, angka, dan tanda hubung.';
  }
  if (!requireText(input.tagline, 200)) fieldErrors.tagline = 'Tagline wajib diisi.';
  if (!requireText(input.description, 2000)) {
    fieldErrors.description = 'Deskripsi wajib diisi.';
  }
  if (!Number.isFinite(input.minViableFeatureCount) || input.minViableFeatureCount < 1) {
    fieldErrors.minViableFeatureCount = 'Ambang kelayakan minimal 1 fitur.';
  }
  if (Object.keys(fieldErrors).length > 0) {
    return actionFail('Periksa kembali isian yang ditandai.', fieldErrors);
  }

  const duplicate = await prisma.applicationCategory.findUnique({ where: { slug } });
  if (duplicate && duplicate.id !== input.id) {
    return actionFail('Slug sudah dipakai kategori lain.', { slug: 'Slug sudah dipakai.' });
  }

  const status = coerceEnum(input.status, PUBLISH_STATUSES, 'DRAFT');
  const data = {
    slug,
    name,
    shortName: requireText(input.shortName, 60) || name,
    tagline: requireText(input.tagline, 200),
    description: requireText(input.description, 2000),
    longDescription: requireText(input.longDescription, 8000) || null,
    benefits: stringifyJson(
      input.benefits.map((item) => item.trim()).filter((item) => item.length > 0),
    ),
    sortOrder: Math.trunc(input.sortOrder) || 0,
    status,
    minViableFeatureCount: Math.trunc(input.minViableFeatureCount),
    seoTitle: requireText(input.seoTitle, 160) || null,
    seoDescription: requireText(input.seoDescription, 320) || null,
  };

  if (input.id) {
    const before = await prisma.applicationCategory.findUnique({ where: { id: input.id } });
    if (!before) return actionFail('Kategori tidak ditemukan.');

    const updated = await prisma.applicationCategory.update({
      where: { id: input.id },
      data,
    });
    await recordCatalogAudit({
      actor,
      entity: 'ApplicationCategory',
      entityId: updated.id,
      action: 'UPDATE',
      summary: `Kategori "${updated.name}" diperbarui.`,
      before: { name: before.name, status: before.status, sortOrder: before.sortOrder },
      after: { name: updated.name, status: updated.status, sortOrder: updated.sortOrder },
    });
    revalidateCatalog(updated.slug);
    if (before.slug !== updated.slug) revalidateCatalog(before.slug);
    return actionOk(`Kategori "${updated.name}" tersimpan.`);
  }

  const created = await prisma.applicationCategory.create({ data });
  await recordCatalogAudit({
    actor,
    entity: 'ApplicationCategory',
    entityId: created.id,
    action: 'CREATE',
    summary: `Kategori "${created.name}" dibuat dengan status ${created.status}.`,
    after: data,
  });
  revalidateCatalog(created.slug);
  return actionOk(`Kategori "${created.name}" dibuat.`, { createdId: created.id });
}

export async function setCategoryStatus(
  categoryId: string,
  status: string,
): Promise<CatalogActionResult> {
  const actor = await requireArea('catalog');
  const next = coerceEnum(status, PUBLISH_STATUSES, 'DRAFT');

  const category = await prisma.applicationCategory.findUnique({ where: { id: categoryId } });
  if (!category) return actionFail('Kategori tidak ditemukan.');

  const warnings: string[] = [];
  if (next === 'PUBLISHED') {
    const published = await prisma.feature.count({
      where: { categoryId, status: 'PUBLISHED' },
    });
    // Kategori terbit tanpa fitur terbit akan tampil kosong di konfigurator.
    if (published === 0) {
      warnings.push(
        'Kategori ini belum punya satu pun fitur berstatus Terbit, jadi konfigurator akan tampil kosong.',
      );
    } else if (published < category.minViableFeatureCount) {
      warnings.push(
        `Baru ${published} fitur terbit, sedangkan ambang kelayakan kategori ini ${category.minViableFeatureCount} fitur (C3.5).`,
      );
    }
  }

  await prisma.applicationCategory.update({ where: { id: categoryId }, data: { status: next } });
  await recordCatalogAudit({
    actor,
    entity: 'ApplicationCategory',
    entityId: categoryId,
    action: 'STATUS_CHANGE',
    summary: `Status kategori "${category.name}" diubah dari ${category.status} menjadi ${next}.`,
    before: { status: category.status },
    after: { status: next },
  });
  revalidateCatalog(category.slug);
  return actionOk(`Status kategori "${category.name}" diperbarui.`, { warnings });
}

/** Menukar urutan tampil dengan kategori tetangga (L1). */
export async function moveCategory(
  categoryId: string,
  direction: 'UP' | 'DOWN',
): Promise<CatalogActionResult> {
  const actor = await requireArea('catalog');

  const categories = await prisma.applicationCategory.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, slug: true, sortOrder: true },
  });
  const index = categories.findIndex((row) => row.id === categoryId);
  if (index < 0) return actionFail('Kategori tidak ditemukan.');

  const swapIndex = direction === 'UP' ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= categories.length) {
    return actionFail('Kategori sudah berada di ujung daftar.');
  }

  // Urutan disimpan ulang berdasarkan posisi akhir agar nilai sortOrder tetap
  // rapat walau data lama sempat memakai angka yang berlompatan.
  const reordered = [...categories];
  const [moved] = reordered.splice(index, 1);
  reordered.splice(swapIndex, 0, moved);

  await prisma.$transaction(
    reordered.map((row, position) =>
      prisma.applicationCategory.update({
        where: { id: row.id },
        data: { sortOrder: position + 1 },
      }),
    ),
  );

  await recordCatalogAudit({
    actor,
    entity: 'ApplicationCategory',
    entityId: categoryId,
    action: 'REORDER',
    summary: `Urutan tampil kategori "${moved.name}" dipindah ke posisi ${swapIndex + 1}.`,
    before: { position: index + 1 },
    after: { position: swapIndex + 1 },
  });
  revalidateCatalog(moved.slug);
  return actionOk('Urutan tampil diperbarui.');
}

export async function deleteCategory(categoryId: string): Promise<CatalogActionResult> {
  const actor = await requireArea('catalog');

  const category = await prisma.applicationCategory.findUnique({
    where: { id: categoryId },
    include: { _count: { select: { configurations: true, features: true } } },
  });
  if (!category) return actionFail('Kategori tidak ditemukan.');

  // Konfigurasi klien menunjuk kategori ini; menghapusnya akan memutus jejak
  // penawaran yang sudah terbit. Arsipkan saja.
  if (category._count.configurations > 0) {
    return actionFail(
      `Kategori ini dipakai ${category._count.configurations} konfigurasi klien. Arsipkan kategori alih-alih menghapusnya.`,
    );
  }

  await prisma.applicationCategory.delete({ where: { id: categoryId } });
  await recordCatalogAudit({
    actor,
    entity: 'ApplicationCategory',
    entityId: categoryId,
    action: 'DELETE',
    summary: `Kategori "${category.name}" beserta ${category._count.features} fitur di dalamnya dihapus.`,
    before: { name: category.name, slug: category.slug, featureCount: category._count.features },
  });
  revalidateCatalog(category.slug);
  return actionOk(`Kategori "${category.name}" dihapus.`);
}

// ---------------------------------------------------------------------------
// Kelompok fitur
// ---------------------------------------------------------------------------

export async function saveGroup(input: GroupInput): Promise<CatalogActionResult> {
  const actor = await requireArea('catalog');

  const category = await prisma.applicationCategory.findUnique({
    where: { id: input.categoryId },
    select: { id: true, slug: true },
  });
  if (!category) return actionFail('Kategori tidak ditemukan.');

  const name = requireText(input.name, 120);
  const slug = normalizeSlug(input.slug, name);
  if (!name) return actionFail('Nama kelompok wajib diisi.', { name: 'Nama wajib diisi.' });
  if (!slug || !SLUG_PATTERN.test(slug)) {
    return actionFail('Slug kelompok tidak valid.', { slug: 'Slug tidak valid.' });
  }

  const duplicate = await prisma.featureGroup.findUnique({
    where: { categoryId_slug: { categoryId: category.id, slug } },
  });
  if (duplicate && duplicate.id !== input.id) {
    return actionFail('Slug kelompok sudah dipakai di kategori ini.', {
      slug: 'Slug sudah dipakai.',
    });
  }

  const data = {
    categoryId: category.id,
    slug,
    name,
    description: requireText(input.description, 1000) || null,
    icon: requireText(input.icon, 40) || 'Layers',
    sortOrder: Math.trunc(input.sortOrder) || 0,
  };

  if (input.id) {
    const updated = await prisma.featureGroup.update({ where: { id: input.id }, data });
    await recordCatalogAudit({
      actor,
      entity: 'FeatureGroup',
      entityId: updated.id,
      action: 'UPDATE',
      summary: `Kelompok fitur "${updated.name}" diperbarui.`,
      after: data,
    });
    revalidateCatalog(category.slug);
    return actionOk(`Kelompok "${updated.name}" tersimpan.`);
  }

  const created = await prisma.featureGroup.create({ data });
  await recordCatalogAudit({
    actor,
    entity: 'FeatureGroup',
    entityId: created.id,
    action: 'CREATE',
    summary: `Kelompok fitur "${created.name}" dibuat.`,
    after: data,
  });
  revalidateCatalog(category.slug);
  return actionOk(`Kelompok "${created.name}" dibuat.`, { createdId: created.id });
}

export async function deleteGroup(groupId: string): Promise<CatalogActionResult> {
  const actor = await requireArea('catalog');

  const group = await prisma.featureGroup.findUnique({
    where: { id: groupId },
    include: {
      category: { select: { slug: true } },
      _count: { select: { features: true } },
    },
  });
  if (!group) return actionFail('Kelompok tidak ditemukan.');
  if (group._count.features > 0) {
    return actionFail(
      `Kelompok "${group.name}" masih berisi ${group._count.features} fitur. Pindahkan fiturnya lebih dulu.`,
    );
  }

  await prisma.featureGroup.delete({ where: { id: groupId } });
  await recordCatalogAudit({
    actor,
    entity: 'FeatureGroup',
    entityId: groupId,
    action: 'DELETE',
    summary: `Kelompok fitur "${group.name}" dihapus.`,
    before: { name: group.name, slug: group.slug },
  });
  revalidateCatalog(group.category.slug);
  return actionOk(`Kelompok "${group.name}" dihapus.`);
}

// ---------------------------------------------------------------------------
// L2 — Fitur
// ---------------------------------------------------------------------------

export async function saveFeature(input: FeatureInput): Promise<CatalogActionResult> {
  const actor = await requireArea('catalog');

  const category = await prisma.applicationCategory.findUnique({
    where: { id: input.categoryId },
    select: { id: true, slug: true, name: true },
  });
  if (!category) return actionFail('Kategori tidak ditemukan.');

  const group = await prisma.featureGroup.findFirst({
    where: { id: input.groupId, categoryId: category.id },
    select: { id: true, name: true },
  });
  if (!group) {
    return actionFail('Kelompok fitur tidak ditemukan di kategori ini.', {
      groupId: 'Pilih kelompok fitur.',
    });
  }

  const name = requireText(input.name, 160);
  const slug = normalizeSlug(input.slug, name);
  const type = coerceEnum(input.type, CATALOG_FEATURE_TYPES, 'STANDARD') as FeatureType;
  const status = coerceEnum(input.status, PUBLISH_STATUSES, 'DRAFT') as PublishStatus;
  const fieldErrors: Record<string, string> = {};

  if (!name) fieldErrors.name = 'Nama fitur wajib diisi.';
  if (!slug || !SLUG_PATTERN.test(slug)) {
    fieldErrors.slug = 'Slug hanya boleh huruf kecil, angka, dan tanda hubung.';
  }
  if (!requireText(input.clientDescription, 2000)) {
    fieldErrors.clientDescription = 'Deskripsi untuk klien wajib diisi.';
  }
  if (!Number.isFinite(input.manDayMin) || input.manDayMin <= 0) {
    fieldErrors.manDayMin = 'Man-day minimum harus lebih besar dari nol.';
  }
  if (!Number.isFinite(input.manDayMax) || input.manDayMax <= 0) {
    fieldErrors.manDayMax = 'Man-day maksimum harus lebih besar dari nol.';
  }
  if (
    input.effortRatioOverride !== null &&
    (!Number.isFinite(input.effortRatioOverride) || input.effortRatioOverride <= 0)
  ) {
    fieldErrors.effortRatioOverride = 'Rasio effort harus lebih besar dari nol.';
  }
  if (Object.keys(fieldErrors).length > 0) {
    return actionFail('Periksa kembali isian yang ditandai.', fieldErrors);
  }

  // Kriteria penerimaan L: penyimpanan yang melanggar batas lebar rentang
  // untuk tipenya WAJIB ditolak sistem (BR-05 / PRD 6.1). Validasi memakai
  // aturan harga yang sedang aktif, bukan konstanta lokal, agar kalibrasi
  // ulang tarif ikut terpakai di sini.
  const rule = await getActivePricingRule();
  const rangeCheck = validateRangeWidth(rule, type, input.manDayMin, input.manDayMax);
  if (!rangeCheck.valid) {
    const message = rangeCheck.message ?? 'Lebar rentang man-day melanggar batas tipe fitur.';
    return actionFail(message, { manDayMax: message });
  }

  const duplicate = await prisma.feature.findUnique({
    where: { categoryId_slug: { categoryId: category.id, slug } },
  });
  if (duplicate && duplicate.id !== input.id) {
    return actionFail('Slug fitur sudah dipakai di kategori ini.', {
      slug: 'Slug sudah dipakai.',
    });
  }

  const media = input.media
    .filter((item) => item.url.trim().length > 0)
    .slice(0, 12)
    .map((item, index) => ({
      kind: coerceEnum(item.kind, MEDIA_KINDS, 'IMAGE'),
      url: requireText(item.url, 500),
      caption: requireText(item.caption, 200) || null,
      sortOrder: index,
    }));

  const data = {
    categoryId: category.id,
    groupId: group.id,
    slug,
    name,
    clientDescription: requireText(input.clientDescription, 2000),
    internalDescription: requireText(input.internalDescription, 4000) || null,
    type,
    manDayMin: input.manDayMin,
    manDayMax: input.manDayMax,
    effortRatioOverride: input.effortRatioOverride,
    isEssential: input.isEssential,
    keywords: stringifyJson(
      input.keywords.map((item) => item.trim()).filter((item) => item.length > 0).slice(0, 30),
    ),
    status,
    sortOrder: Math.trunc(input.sortOrder) || 0,
    seoTitle: requireText(input.seoTitle, 160) || null,
    seoDescription: requireText(input.seoDescription, 320) || null,
  };

  const warnings: string[] = [];
  if (status === 'PUBLISHED') {
    warnings.push(...(await draftPrerequisiteWarnings(input.id ?? null, name)));
  }

  if (input.id) {
    const before = await prisma.feature.findUnique({ where: { id: input.id } });
    if (!before) return actionFail('Fitur tidak ditemukan.');

    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.feature.update({
        where: { id: input.id },
        data: {
          ...data,
          lastReviewedAt: input.markReviewed ? new Date() : before.lastReviewedAt,
        },
      });
      await tx.featureMedia.deleteMany({ where: { featureId: row.id } });
      if (media.length > 0) {
        await tx.featureMedia.createMany({
          data: media.map((item) => ({ ...item, featureId: row.id })),
        });
      }
      return row;
    });

    await recordCatalogAudit({
      actor,
      entity: 'Feature',
      entityId: updated.id,
      action: 'UPDATE',
      summary: `Fitur "${updated.name}" diperbarui (${type}, ${data.manDayMin}–${data.manDayMax} man-day, ${status}).`,
      before: {
        name: before.name,
        type: before.type,
        manDayMin: before.manDayMin,
        manDayMax: before.manDayMax,
        status: before.status,
        isEssential: before.isEssential,
      },
      after: {
        name: data.name,
        type: data.type,
        manDayMin: data.manDayMin,
        manDayMax: data.manDayMax,
        status: data.status,
        isEssential: data.isEssential,
      },
    });
    revalidateCatalog(category.slug);
    return actionOk(`Fitur "${updated.name}" tersimpan.`, { warnings });
  }

  const created = await prisma.$transaction(async (tx) => {
    const row = await tx.feature.create({
      data: { ...data, lastReviewedAt: new Date() },
    });
    if (media.length > 0) {
      await tx.featureMedia.createMany({
        data: media.map((item) => ({ ...item, featureId: row.id })),
      });
    }
    return row;
  });

  await recordCatalogAudit({
    actor,
    entity: 'Feature',
    entityId: created.id,
    action: 'CREATE',
    summary: `Fitur "${created.name}" ditambahkan ke kategori ${category.name} (${type}, ${data.manDayMin}–${data.manDayMax} man-day).`,
    after: data,
  });
  revalidateCatalog(category.slug);
  return actionOk(`Fitur "${created.name}" dibuat.`, { createdId: created.id, warnings });
}

/**
 * Prasyarat yang masih berstatus DRAFT saat fiturnya diterbitkan.
 *
 * Mesin dependensi menambahkan prasyarat secara otomatis (C3.1); bila prasyarat
 * itu belum terbit, konfigurator akan menarik fitur yang tidak terlihat klien.
 * Karena itu kondisi ini dilaporkan sebagai peringatan saat penerbitan.
 */
async function draftPrerequisiteWarnings(
  featureId: string | null,
  featureName: string,
): Promise<string[]> {
  if (!featureId) return [];
  const edges = await prisma.featureDependency.findMany({
    where: { featureId, kind: 'REQUIRES' },
    include: { target: { select: { name: true, status: true } } },
  });
  const unpublished = edges
    .filter((edge) => edge.target.status !== 'PUBLISHED')
    .map((edge) => edge.target.name);
  if (unpublished.length === 0) return [];
  return [
    `Prasyarat "${featureName}" belum terbit: ${unpublished.join(', ')}. Terbitkan juga agar konfigurator tidak menarik fitur yang tidak terlihat klien.`,
  ];
}

export async function setFeatureStatus(
  featureId: string,
  status: string,
): Promise<CatalogActionResult> {
  const actor = await requireArea('catalog');
  const next = coerceEnum(status, PUBLISH_STATUSES, 'DRAFT');

  const feature = await prisma.feature.findUnique({
    where: { id: featureId },
    include: { category: { select: { slug: true } } },
  });
  if (!feature) return actionFail('Fitur tidak ditemukan.');

  const warnings = next === 'PUBLISHED' ? await draftPrerequisiteWarnings(featureId, feature.name) : [];

  await prisma.feature.update({ where: { id: featureId }, data: { status: next } });
  await recordCatalogAudit({
    actor,
    entity: 'Feature',
    entityId: featureId,
    action: 'STATUS_CHANGE',
    summary: `Status fitur "${feature.name}" diubah dari ${feature.status} menjadi ${next}.`,
    before: { status: feature.status },
    after: { status: next },
  });
  revalidateCatalog(feature.category.slug);
  return actionOk(`Status "${feature.name}" diperbarui.`, { warnings });
}

/** L7 — menerbitkan sekaligus fitur draft yang sudah dipratinjau admin. */
export async function publishFeatures(featureIds: string[]): Promise<CatalogActionResult> {
  const actor = await requireArea('catalog');
  if (featureIds.length === 0) return actionFail('Belum ada fitur yang dipilih.');

  const features = await prisma.feature.findMany({
    where: { id: { in: featureIds } },
    include: { category: { select: { slug: true, name: true } } },
  });
  if (features.length === 0) return actionFail('Fitur tidak ditemukan.');

  const warnings: string[] = [];
  for (const feature of features) {
    warnings.push(...(await draftPrerequisiteWarnings(feature.id, feature.name)));
  }

  await prisma.feature.updateMany({
    where: { id: { in: features.map((feature) => feature.id) } },
    data: { status: 'PUBLISHED' },
  });

  for (const feature of features) {
    await recordCatalogAudit({
      actor,
      entity: 'Feature',
      entityId: feature.id,
      action: 'PUBLISH',
      summary: `Fitur "${feature.name}" diterbitkan ke konfigurator ${feature.category.name}.`,
      before: { status: feature.status },
      after: { status: 'PUBLISHED' },
    });
  }

  revalidateCatalog(features[0].category.slug);
  return actionOk(`${features.length} fitur diterbitkan.`, { warnings });
}

/** Menandai fitur baru ditinjau ulang — mengatur ulang penanda katalog usang (R8). */
export async function markFeaturesReviewed(featureIds: string[]): Promise<CatalogActionResult> {
  const actor = await requireArea('catalog');
  if (featureIds.length === 0) return actionFail('Belum ada fitur yang dipilih.');

  const features = await prisma.feature.findMany({
    where: { id: { in: featureIds } },
    include: { category: { select: { slug: true } } },
  });
  if (features.length === 0) return actionFail('Fitur tidak ditemukan.');

  const reviewedAt = new Date();
  await prisma.feature.updateMany({
    where: { id: { in: features.map((feature) => feature.id) } },
    data: { lastReviewedAt: reviewedAt },
  });
  await recordCatalogAudit({
    actor,
    entity: 'Feature',
    entityId: features[0].id,
    action: 'REVIEW',
    summary: `${features.length} fitur ditandai sudah ditinjau ulang.`,
    after: { featureIds: features.map((feature) => feature.id), reviewedAt },
  });
  revalidateCatalog(features[0].category.slug);
  return actionOk(`${features.length} fitur ditandai sudah ditinjau.`);
}

export async function deleteFeature(featureId: string): Promise<CatalogActionResult> {
  const actor = await requireArea('catalog');

  const feature = await prisma.feature.findUnique({
    where: { id: featureId },
    include: {
      category: { select: { slug: true } },
      _count: {
        select: { configurationItems: true, dependents: true, presetFeatures: true },
      },
    },
  });
  if (!feature) return actionFail('Fitur tidak ditemukan.');

  // Fitur yang pernah masuk rakitan klien tidak boleh hilang: ConfigurationItem
  // memang menyimpan snapshot harganya, tetapi jejak ke katalog tetap dipakai
  // untuk kalibrasi man-day (M9). Arsipkan saja.
  if (feature._count.configurationItems > 0) {
    return actionFail(
      `Fitur ini sudah dipakai di ${feature._count.configurationItems} rakitan klien. Ubah statusnya menjadi Diarsipkan alih-alih menghapusnya.`,
    );
  }

  await prisma.feature.delete({ where: { id: featureId } });
  await recordCatalogAudit({
    actor,
    entity: 'Feature',
    entityId: featureId,
    action: 'DELETE',
    summary:
      `Fitur "${feature.name}" dihapus. ${feature._count.dependents} relasi dependensi dan ` +
      `${feature._count.presetFeatures} tautan preset ikut terhapus.`,
    before: {
      name: feature.name,
      slug: feature.slug,
      type: feature.type,
      manDayMin: feature.manDayMin,
      manDayMax: feature.manDayMax,
    },
  });
  revalidateCatalog(feature.category.slug);
  return actionOk(`Fitur "${feature.name}" dihapus.`);
}
