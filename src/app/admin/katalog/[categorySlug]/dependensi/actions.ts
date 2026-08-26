'use server';

import { revalidatePath } from 'next/cache';
import {
  actionFail,
  actionOk,
  type CatalogActionResult,
  type DependencyInput,
} from '@/components/admin/catalog/shared';
import { requireArea } from '@/lib/auth/guards';
import {
  buildDependencyGraph,
  detectRequiresCycle,
  wouldCreateCycle,
  type DependencyEdge,
  type DependencyFeature,
} from '@/lib/configurator/dependency';
import { prisma } from '@/lib/db/prisma';
import {
  DEPENDENCY_KINDS,
  DEPENDENCY_KIND_LABEL,
  FEATURE_TYPES,
  coerceEnum,
} from '@/lib/domain/enums';
import { recordCatalogAudit } from '../../_lib/audit';

function revalidateDependency(categorySlug: string): void {
  revalidatePath(`/admin/katalog/${categorySlug}/dependensi`);
  revalidatePath(`/admin/katalog/${categorySlug}`);
  revalidatePath('/admin/katalog/preset');
  revalidatePath('/');
}

/** Memuat seluruh fitur & sisi dependensi satu kategori sebagai graf. */
async function loadGraph(categoryId: string) {
  const features = await prisma.feature.findMany({
    where: { categoryId },
    select: { id: true, name: true, type: true, groupId: true, isEssential: true },
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

  return { nodes, links, graph: buildDependencyGraph(nodes, links) };
}

/**
 * Menyimpan satu relasi antar fitur (L3).
 *
 * Kriteria penerimaan modul L: dependensi melingkar wajib DITOLAK. Lingkaran
 * pada REQUIRES membuat keranjang mustahil diselesaikan — mesin akan menambah
 * prasyarat tanpa henti — sehingga pemeriksaan dilakukan sebelum penyimpanan
 * memakai wouldCreateCycle(), bukan sesudahnya.
 */
export async function saveDependency(input: DependencyInput): Promise<CatalogActionResult> {
  const actor = await requireArea('catalog');
  const kind = coerceEnum(input.kind, DEPENDENCY_KINDS, 'REQUIRES');

  if (input.featureId === input.targetFeatureId) {
    return actionFail('Fitur tidak dapat berelasi dengan dirinya sendiri.');
  }

  const [source, target] = await Promise.all([
    prisma.feature.findUnique({
      where: { id: input.featureId },
      include: { category: { select: { id: true, slug: true } } },
    }),
    prisma.feature.findUnique({ where: { id: input.targetFeatureId } }),
  ]);
  if (!source || !target) return actionFail('Fitur tidak ditemukan.');
  if (source.categoryId !== target.categoryId) {
    return actionFail('Relasi hanya boleh dibuat antar fitur dalam satu kategori aplikasi.');
  }

  const existing = await prisma.featureDependency.findUnique({
    where: {
      featureId_targetFeatureId_kind: {
        featureId: input.featureId,
        targetFeatureId: input.targetFeatureId,
        kind,
      },
    },
  });

  if (!existing && kind === 'REQUIRES') {
    const { nodes, links, graph } = await loadGraph(source.categoryId);
    if (wouldCreateCycle(graph, input.featureId, input.targetFeatureId)) {
      // Rantai lingkarannya ikut dihitung agar pesan menyebut fitur konkret,
      // bukan sekadar "terjadi lingkaran".
      const withNewEdge = buildDependencyGraph(nodes, [
        ...links,
        { featureId: input.featureId, targetFeatureId: input.targetFeatureId, kind: 'REQUIRES' },
      ]);
      const { cycle } = detectRequiresCycle(withNewEdge);
      const chain = cycle
        .map((id) => withNewEdge.features.get(id)?.name ?? id)
        .join(' → ');
      return actionFail(
        chain
          ? `Dependensi melingkar ditolak: ${chain}. Keranjang dengan lingkaran prasyarat mustahil diselesaikan (C3.1).`
          : `Dependensi melingkar ditolak: "${target.name}" sudah membutuhkan "${source.name}", langsung atau lewat fitur lain.`,
      );
    }
  }

  const note = input.note.trim().slice(0, 500) || null;

  if (existing) {
    await prisma.featureDependency.update({ where: { id: existing.id }, data: { note } });
    await recordCatalogAudit({
      actor,
      entity: 'FeatureDependency',
      entityId: existing.id,
      action: 'UPDATE',
      summary: `Catatan relasi "${source.name}" ${DEPENDENCY_KIND_LABEL[kind]} "${target.name}" diperbarui.`,
      before: { note: existing.note },
      after: { note },
    });
    revalidateDependency(source.category.slug);
    return actionOk('Catatan relasi tersimpan.');
  }

  const created = await prisma.featureDependency.create({
    data: {
      featureId: input.featureId,
      targetFeatureId: input.targetFeatureId,
      kind,
      note,
    },
  });
  await recordCatalogAudit({
    actor,
    entity: 'FeatureDependency',
    entityId: created.id,
    action: 'CREATE',
    summary: `Relasi baru: "${source.name}" ${DEPENDENCY_KIND_LABEL[kind]} "${target.name}".`,
    after: { kind, note, source: source.name, target: target.name },
  });
  revalidateDependency(source.category.slug);

  const warnings: string[] = [];
  if (kind === 'REQUIRES' && target.status !== 'PUBLISHED' && source.status === 'PUBLISHED') {
    warnings.push(
      `"${target.name}" masih berstatus ${target.status}. Fitur terbit yang membutuhkannya akan menarik fitur yang belum tampil di konfigurator.`,
    );
  }
  return actionOk(
    `Relasi "${source.name}" ${DEPENDENCY_KIND_LABEL[kind]} "${target.name}" dibuat.`,
    { warnings },
  );
}

export async function deleteDependency(edgeId: string): Promise<CatalogActionResult> {
  const actor = await requireArea('catalog');

  const edge = await prisma.featureDependency.findUnique({
    where: { id: edgeId },
    include: {
      feature: { select: { name: true, category: { select: { slug: true } } } },
      target: { select: { name: true } },
    },
  });
  if (!edge) return actionFail('Relasi tidak ditemukan.');

  const kind = coerceEnum(edge.kind, DEPENDENCY_KINDS, 'REQUIRES');
  await prisma.featureDependency.delete({ where: { id: edgeId } });
  await recordCatalogAudit({
    actor,
    entity: 'FeatureDependency',
    entityId: edgeId,
    action: 'DELETE',
    summary: `Relasi "${edge.feature.name}" ${DEPENDENCY_KIND_LABEL[kind]} "${edge.target.name}" dihapus.`,
    before: { kind, note: edge.note },
  });
  revalidateDependency(edge.feature.category.slug);
  return actionOk('Relasi dihapus.');
}
