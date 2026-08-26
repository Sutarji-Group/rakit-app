'use server';

import { revalidatePath } from 'next/cache';
import {
  actionFail,
  actionOk,
  type CatalogActionResult,
  type WizardMappingInput,
  type WizardOptionInput,
  type WizardQuestionInput,
} from '@/components/admin/catalog/shared';
import { MAX_WIZARD_QUESTIONS } from '@/components/admin/catalog/shared';
import { requireArea } from '@/lib/auth/guards';
import { prisma } from '@/lib/db/prisma';
import { WIZARD_INPUT_TYPES, coerceEnum } from '@/lib/domain/enums';
import { slugify } from '@/lib/utils';
import { recordCatalogAudit } from '../_lib/audit';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function revalidateWizard(): void {
  revalidatePath('/admin/katalog/wizard');
  revalidatePath('/admin/katalog');
  revalidatePath('/');
}

// ---------------------------------------------------------------------------
// Pertanyaan
// ---------------------------------------------------------------------------

export async function saveWizardQuestion(
  input: WizardQuestionInput,
): Promise<CatalogActionResult> {
  const actor = await requireArea('catalog');

  const category = await prisma.applicationCategory.findUnique({
    where: { id: input.categoryId },
    select: { id: true, name: true },
  });
  if (!category) return actionFail('Kategori tidak ditemukan.');

  const question = input.question.trim().slice(0, 300);
  const slug = input.slug.trim() ? slugify(input.slug) : slugify(question);
  const fieldErrors: Record<string, string> = {};

  if (!question) fieldErrors.question = 'Pertanyaan wajib diisi.';
  if (!slug || !SLUG_PATTERN.test(slug)) fieldErrors.slug = 'Slug pertanyaan tidak valid.';
  if (Object.keys(fieldErrors).length > 0) {
    return actionFail('Periksa kembali isian yang ditandai.', fieldErrors);
  }

  const duplicate = await prisma.wizardQuestion.findUnique({
    where: { categoryId_slug: { categoryId: category.id, slug } },
  });
  if (duplicate && duplicate.id !== input.id) {
    return actionFail('Slug pertanyaan sudah dipakai di kategori ini.', {
      slug: 'Slug sudah dipakai.',
    });
  }

  if (!input.id) {
    // B1: wizard sengaja dibatasi enam pertanyaan. Lebih dari itu, klien
    // berhenti di tengah jalan dan justru tidak sampai ke konfigurator.
    const existing = await prisma.wizardQuestion.count({ where: { categoryId: category.id } });
    if (existing >= MAX_WIZARD_QUESTIONS) {
      return actionFail(
        `Kategori ${category.name} sudah punya ${existing} pertanyaan. Maksimal ${MAX_WIZARD_QUESTIONS} pertanyaan per kategori (PRD B1) — gabungkan atau hapus pertanyaan lain lebih dulu.`,
      );
    }
  }

  const data = {
    categoryId: category.id,
    slug,
    question,
    helpText: input.helpText.trim().slice(0, 500) || null,
    inputType: coerceEnum(input.inputType, WIZARD_INPUT_TYPES, 'SINGLE'),
    sortOrder: Math.trunc(input.sortOrder) || 0,
    isActive: input.isActive,
  };

  const row = input.id
    ? await prisma.wizardQuestion.update({ where: { id: input.id }, data })
    : await prisma.wizardQuestion.create({ data });

  await recordCatalogAudit({
    actor,
    entity: 'WizardQuestion',
    entityId: row.id,
    action: input.id ? 'UPDATE' : 'CREATE',
    summary: `Pertanyaan wizard "${row.question}" (${category.name}) disimpan.`,
    after: data,
  });
  revalidateWizard();
  return actionOk('Pertanyaan wizard tersimpan.', { createdId: row.id });
}

export async function deleteWizardQuestion(questionId: string): Promise<CatalogActionResult> {
  const actor = await requireArea('catalog');

  const question = await prisma.wizardQuestion.findUnique({
    where: { id: questionId },
    include: { _count: { select: { options: true } } },
  });
  if (!question) return actionFail('Pertanyaan tidak ditemukan.');

  await prisma.wizardQuestion.delete({ where: { id: questionId } });
  await recordCatalogAudit({
    actor,
    entity: 'WizardQuestion',
    entityId: questionId,
    action: 'DELETE',
    summary: `Pertanyaan wizard "${question.question}" beserta ${question._count.options} opsinya dihapus.`,
    before: { question: question.question, slug: question.slug },
  });
  revalidateWizard();
  return actionOk('Pertanyaan wizard dihapus.');
}

// ---------------------------------------------------------------------------
// Opsi jawaban
// ---------------------------------------------------------------------------

export async function saveWizardOption(input: WizardOptionInput): Promise<CatalogActionResult> {
  const actor = await requireArea('catalog');

  const question = await prisma.wizardQuestion.findUnique({
    where: { id: input.questionId },
    select: { id: true, question: true, categoryId: true },
  });
  if (!question) return actionFail('Pertanyaan tidak ditemukan.');

  const label = input.label.trim().slice(0, 200);
  const slug = input.slug.trim() ? slugify(input.slug) : slugify(label);
  const fieldErrors: Record<string, string> = {};

  if (!label) fieldErrors.label = 'Label opsi wajib diisi.';
  if (!slug || !SLUG_PATTERN.test(slug)) fieldErrors.slug = 'Slug opsi tidak valid.';
  if (Object.keys(fieldErrors).length > 0) {
    return actionFail('Periksa kembali isian yang ditandai.', fieldErrors);
  }

  const duplicate = await prisma.wizardOption.findUnique({
    where: { questionId_slug: { questionId: question.id, slug } },
  });
  if (duplicate && duplicate.id !== input.id) {
    return actionFail('Slug opsi sudah dipakai pada pertanyaan ini.', {
      slug: 'Slug sudah dipakai.',
    });
  }

  const presetSlug = input.suggestPresetSlug.trim();
  if (presetSlug) {
    const preset = await prisma.preset.findUnique({
      where: { categoryId_slug: { categoryId: question.categoryId, slug: presetSlug } },
      select: { id: true },
    });
    if (!preset) {
      return actionFail('Preset yang disarankan tidak ada di kategori ini.', {
        suggestPresetSlug: 'Preset tidak ditemukan.',
      });
    }
  }

  const data = {
    questionId: question.id,
    slug,
    label,
    description: input.description.trim().slice(0, 500) || null,
    icon: input.icon.trim().slice(0, 40) || 'Circle',
    sortOrder: Math.trunc(input.sortOrder) || 0,
    suggestPresetSlug: presetSlug || null,
  };

  const row = input.id
    ? await prisma.wizardOption.update({ where: { id: input.id }, data })
    : await prisma.wizardOption.create({ data });

  await recordCatalogAudit({
    actor,
    entity: 'WizardOption',
    entityId: row.id,
    action: input.id ? 'UPDATE' : 'CREATE',
    summary: `Opsi "${row.label}" pada pertanyaan "${question.question}" disimpan.`,
    after: data,
  });
  revalidateWizard();
  return actionOk('Opsi jawaban tersimpan.', { createdId: row.id });
}

export async function deleteWizardOption(optionId: string): Promise<CatalogActionResult> {
  const actor = await requireArea('catalog');

  const option = await prisma.wizardOption.findUnique({
    where: { id: optionId },
    include: { _count: { select: { featureLinks: true } } },
  });
  if (!option) return actionFail('Opsi tidak ditemukan.');

  await prisma.wizardOption.delete({ where: { id: optionId } });
  await recordCatalogAudit({
    actor,
    entity: 'WizardOption',
    entityId: optionId,
    action: 'DELETE',
    summary: `Opsi "${option.label}" beserta ${option._count.featureLinks} pemetaan fiturnya dihapus.`,
    before: { label: option.label, slug: option.slug },
  });
  revalidateWizard();
  return actionOk('Opsi jawaban dihapus.');
}

// ---------------------------------------------------------------------------
// Pemetaan opsi → fitur (B3 & B4)
// ---------------------------------------------------------------------------

export async function saveWizardMapping(
  input: WizardMappingInput,
): Promise<CatalogActionResult> {
  const actor = await requireArea('catalog');

  const [option, feature] = await Promise.all([
    prisma.wizardOption.findUnique({
      where: { id: input.optionId },
      include: { question: { select: { categoryId: true, question: true } } },
    }),
    prisma.feature.findUnique({ where: { id: input.featureId } }),
  ]);
  if (!option || !feature) return actionFail('Opsi atau fitur tidak ditemukan.');
  if (feature.categoryId !== option.question.categoryId) {
    return actionFail('Fitur harus berasal dari kategori yang sama dengan pertanyaannya.');
  }

  // B4: setiap rekomendasi wajib punya alasan yang dibaca klien — tanpa itu,
  // konfigurator hanya menyodorkan daftar fitur tanpa penjelasan.
  const reason = input.reason.trim().slice(0, 400);
  if (!reason) {
    return actionFail('Alasan rekomendasi wajib diisi (B4).', {
      reason: 'Alasan wajib diisi.',
    });
  }

  const row = await prisma.wizardOptionFeature.upsert({
    where: {
      optionId_featureId: { optionId: option.id, featureId: feature.id },
    },
    create: { optionId: option.id, featureId: feature.id, reason },
    update: { reason },
  });

  await recordCatalogAudit({
    actor,
    entity: 'WizardOptionFeature',
    entityId: row.id,
    action: 'UPSERT',
    summary: `Opsi "${option.label}" memetakan fitur "${feature.name}".`,
    after: { reason },
  });
  revalidateWizard();

  const warnings =
    feature.status === 'PUBLISHED'
      ? []
      : [
          `Fitur "${feature.name}" masih berstatus ${feature.status}, jadi rekomendasi ini belum akan muncul di konfigurator.`,
        ];
  return actionOk(`Pemetaan "${feature.name}" tersimpan.`, { warnings });
}

export async function deleteWizardMapping(mappingId: string): Promise<CatalogActionResult> {
  const actor = await requireArea('catalog');

  const mapping = await prisma.wizardOptionFeature.findUnique({
    where: { id: mappingId },
    include: {
      feature: { select: { name: true } },
      option: { select: { label: true } },
    },
  });
  if (!mapping) return actionFail('Pemetaan tidak ditemukan.');

  await prisma.wizardOptionFeature.delete({ where: { id: mappingId } });
  await recordCatalogAudit({
    actor,
    entity: 'WizardOptionFeature',
    entityId: mappingId,
    action: 'DELETE',
    summary: `Pemetaan opsi "${mapping.option.label}" → fitur "${mapping.feature.name}" dihapus.`,
    before: { reason: mapping.reason },
  });
  revalidateWizard();
  return actionOk('Pemetaan dihapus.');
}
