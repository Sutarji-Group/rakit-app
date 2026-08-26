'use server';

import { revalidatePath } from 'next/cache';
import {
  actionFail,
  actionOk,
  inspectPresetSelection,
  type CatalogActionResult,
  type PresetInput,
} from '@/components/admin/catalog/shared';
import { requireArea } from '@/lib/auth/guards';
import {
  buildDependencyGraph,
  type DependencyEdge,
  type DependencyFeature,
} from '@/lib/configurator/dependency';
import { stringifyJson } from '@/lib/db/json';
import { prisma } from '@/lib/db/prisma';
import {
  DEPENDENCY_KINDS,
  FEATURE_TYPES,
  PUBLISH_STATUSES,
  coerceEnum,
} from '@/lib/domain/enums';
import { slugify } from '@/lib/utils';
import { recordCatalogAudit } from '../_lib/audit';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function revalidatePreset(categorySlug?: string): void {
  revalidatePath('/admin/katalog/preset');
  revalidatePath('/admin/katalog');
  if (categorySlug) revalidatePath(`/admin/katalog/${categorySlug}`);
  revalidatePath('/');
}

/**
 * Peringatan keutuhan preset (L4).
 *
 * Dihitung dengan mesin yang sama persis dengan konfigurator
 * (buildDependencyGraph + resolveAdd), sehingga peringatan yang dilihat admin
 * benar-benar mencerminkan apa yang akan terjadi pada rakitan klien: prasyarat
 * yang hilang akan ditambahkan otomatis dan menaikkan harga di luar janji
 * kartu preset.
 */
async function presetWarnings(categoryId: string, featureIds: string[]): Promise<string[]> {
  const features = await prisma.feature.findMany({
    where: { categoryId },
    select: { id: true, name: true, type: true, groupId: true, isEssential: true, status: true },
  });
  const edges = await prisma.featureDependency.findMany({
    where: { featureId: { in: features.map((feature) => feature.id) } },
    select: { featureId: true, targetFeatureId: true, kind: true, note: true },
  });

  const nodes: DependencyFeature[] = features.map((feature) => ({
    id: feature.id,
    name: feature.name,
    type: coerceEnum(feature.type, FEATURE_TYPES, 'STANDARD'),
    groupId: feature.groupId,
    isEssential: feature.isEssential,
  }));
  const links: DependencyEdge[] = edges.map((edge) => ({
    featureId: edge.featureId,
    targetFeatureId: edge.targetFeatureId,
    kind: coerceEnum(edge.kind, DEPENDENCY_KINDS, 'REQUIRES'),
    note: edge.note,
  }));

  const graph = buildDependencyGraph(nodes, links);
  const { missing, conflicts } = inspectPresetSelection(graph, featureIds);

  const warnings: string[] = [];
  if (missing.length > 0) {
    warnings.push(
      `Prasyarat belum tercantum: ${missing
        .map((item) => `${item.featureName} (dibutuhkan ${item.requiredByName})`)
        .join('; ')}.`,
    );
  }
  if (conflicts.length > 0) {
    warnings.push(
      `Ada fitur yang saling meniadakan: ${conflicts
        .map((item) => `${item.featureName} vs ${item.conflictsWithName}`)
        .join('; ')}.`,
    );
  }

  const notPublished = features.filter(
    (feature) => featureIds.includes(feature.id) && feature.status !== 'PUBLISHED',
  );
  if (notPublished.length > 0) {
    warnings.push(
      `Fitur berikut belum terbit sehingga tidak akan muncul di konfigurator: ${notPublished
        .map((feature) => feature.name)
        .join(', ')}.`,
    );
  }

  return warnings;
}

export async function savePreset(input: PresetInput): Promise<CatalogActionResult> {
  const actor = await requireArea('catalog');

  const category = await prisma.applicationCategory.findUnique({
    where: { id: input.categoryId },
    select: { id: true, slug: true, name: true },
  });
  if (!category) return actionFail('Kategori tidak ditemukan.');

  const name = input.name.trim().slice(0, 120);
  const slug = input.slug.trim() ? slugify(input.slug) : slugify(name);
  const fieldErrors: Record<string, string> = {};

  if (!name) fieldErrors.name = 'Nama preset wajib diisi.';
  if (!slug || !SLUG_PATTERN.test(slug)) fieldErrors.slug = 'Slug preset tidak valid.';
  if (!input.tagline.trim()) fieldErrors.tagline = 'Tagline wajib diisi.';
  if (!input.description.trim()) fieldErrors.description = 'Deskripsi wajib diisi.';
  if (Object.keys(fieldErrors).length > 0) {
    return actionFail('Periksa kembali isian yang ditandai.', fieldErrors);
  }

  const duplicate = await prisma.preset.findUnique({
    where: { categoryId_slug: { categoryId: category.id, slug } },
  });
  if (duplicate && duplicate.id !== input.id) {
    return actionFail('Slug preset sudah dipakai di kategori ini.', {
      slug: 'Slug sudah dipakai.',
    });
  }

  // Hanya fitur milik kategori ini yang boleh masuk preset.
  const validFeatures = await prisma.feature.findMany({
    where: { id: { in: input.featureIds }, categoryId: category.id },
    select: { id: true },
  });
  const featureIds = validFeatures.map((feature) => feature.id);

  const data = {
    categoryId: category.id,
    slug,
    name,
    tagline: input.tagline.trim().slice(0, 200),
    description: input.description.trim().slice(0, 2000),
    bestFor: stringifyJson(
      input.bestFor.map((item) => item.trim()).filter((item) => item.length > 0),
    ),
    sortOrder: Math.trunc(input.sortOrder) || 0,
    isDefault: input.isDefault,
    status: coerceEnum(input.status, PUBLISH_STATUSES, 'PUBLISHED'),
  };

  const warnings = await presetWarnings(category.id, featureIds);

  const preset = await prisma.$transaction(async (tx) => {
    const row = input.id
      ? await tx.preset.update({ where: { id: input.id }, data })
      : await tx.preset.create({ data });

    // Satu kategori hanya boleh punya satu preset bawaan.
    if (data.isDefault) {
      await tx.preset.updateMany({
        where: { categoryId: category.id, id: { not: row.id } },
        data: { isDefault: false },
      });
    }

    await tx.presetFeature.deleteMany({ where: { presetId: row.id } });
    if (featureIds.length > 0) {
      await tx.presetFeature.createMany({
        data: featureIds.map((featureId) => ({ presetId: row.id, featureId })),
      });
    }
    return row;
  });

  await recordCatalogAudit({
    actor,
    entity: 'Preset',
    entityId: preset.id,
    action: input.id ? 'UPDATE' : 'CREATE',
    summary: `Preset "${preset.name}" (${category.name}) disimpan dengan ${featureIds.length} fitur bawaan.`,
    after: { ...data, featureCount: featureIds.length, warnings },
  });
  revalidatePreset(category.slug);

  return actionOk(
    `Preset "${preset.name}" tersimpan dengan ${featureIds.length} fitur bawaan.`,
    { warnings, createdId: preset.id },
  );
}

export async function deletePreset(presetId: string): Promise<CatalogActionResult> {
  const actor = await requireArea('catalog');

  const preset = await prisma.preset.findUnique({
    where: { id: presetId },
    include: {
      category: { select: { slug: true } },
      _count: { select: { configurations: true } },
    },
  });
  if (!preset) return actionFail('Preset tidak ditemukan.');

  // Konfigurasi menyimpan presetId sebagai asal rakitan; jejak itu dipakai
  // analitik konversi per preset (Q2), jadi preset terpakai hanya diarsipkan.
  if (preset._count.configurations > 0) {
    return actionFail(
      `Preset ini menjadi asal ${preset._count.configurations} rakitan klien. Ubah statusnya menjadi Diarsipkan alih-alih menghapusnya.`,
    );
  }

  await prisma.preset.delete({ where: { id: presetId } });
  await recordCatalogAudit({
    actor,
    entity: 'Preset',
    entityId: presetId,
    action: 'DELETE',
    summary: `Preset "${preset.name}" dihapus.`,
    before: { name: preset.name, slug: preset.slug },
  });
  revalidatePreset(preset.category.slug);
  return actionOk(`Preset "${preset.name}" dihapus.`);
}
