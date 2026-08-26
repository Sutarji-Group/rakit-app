'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { prisma } from '@/lib/db/prisma';
import { stringifyJson } from '@/lib/db/json';
import { requireArea } from '@/lib/auth/guards';
import { slugify } from '@/lib/utils';
import {
  ADDON_KINDS,
  FROZEN_CONFIGURATION_STATUSES,
  USER_ROLE_LABEL,
  USER_TIERS,
} from '@/lib/domain/enums';
import type { PricingRule } from '@/generated/prisma';
import type { CurrentUser } from '@/lib/auth/session';
import type {
  ActionResult,
  AddOnFormValues,
  GuardrailFormValues,
  PricingRuleFormValues,
} from '@/components/admin/pricing/types';

// ---------------------------------------------------------------------------
// Skema validasi
// ---------------------------------------------------------------------------

/** Rasio harus positif dan masuk akal; batas atas mencegah salah ketik nol. */
const ratio = z.number().min(0).max(100);
const money = z.number().int().min(0).max(100_000_000_000);
const share = z.number().min(0).max(1);

const platformMultiplierSchema = z.object({
  WEB: ratio,
  WEB_PWA: ratio,
  WEB_NATIVE: ratio,
});

const deploymentMultiplierSchema = z.object({
  OUR_CLOUD: ratio,
  CLIENT_SERVER: ratio,
  ON_PREMISE: ratio,
});

const userTierPricingSchema = z.array(
  z.object({
    tier: z.enum(USER_TIERS),
    label: z.string().trim().min(1).max(80),
    monthlyMin: money,
    monthlyMax: money,
  }),
);

const volumeDiscountSchema = z.array(
  z.object({
    minFeatures: z.number().int().min(0).max(999),
    maxFeatures: z.number().int().min(0).max(999).nullable(),
    discountPct: share,
    label: z.string().trim().min(1).max(80),
  }),
);

const ruleSchema = z.object({
  label: z.string().trim().min(3, 'Nama versi minimal 3 karakter.').max(120),
  notes: z.string().trim().max(2000),

  referenceRatePerManDay: money,
  multiplierStandard: ratio,
  multiplierConfigurable: ratio,
  multiplierCustom: ratio,
  corePackagePrice: money,

  effortRatioCore: ratio,
  effortRatioStandard: ratio,
  effortRatioConfigurable: ratio,
  effortRatioCustom: ratio,
  corePackageManDay: z.number().min(0).max(500),
  setupEffortManDay: z.number().min(0).max(500),
  overheadEffortRatio: z.number().min(0).max(5),

  avgDeveloperSalary: money,
  burdenFactor: z.number().min(1).max(5),
  effectiveWorkDaysPerMonth: z.number().min(1).max(31),
  billableUtilization: z.number().min(0.05).max(1),
  supportRoleRatio: z.number().min(0).max(5),
  cogsPerManDayOverride: money.nullable(),

  platformMultipliers: platformMultiplierSchema,
  deploymentMultipliers: deploymentMultiplierSchema,
  userTierPricing: userTierPricingSchema,
  setupFee: money,

  volumeDiscountTiers: volumeDiscountSchema,
  discountCountsCoreFeatures: z.boolean(),

  rangeWidthCore: z.number().min(1).max(10),
  rangeWidthStandard: z.number().min(1).max(10),
  rangeWidthConfigurable: z.number().min(1).max(10),
  rangeWidthCustom: z.number().min(1).max(10),

  parallelDevelopers: z.number().min(0.5).max(50),
  workDaysPerWeek: z.number().min(1).max(7),
  fixedDurationWeeks: z.number().min(0).max(52),
  durationBufferFactor: z.number().min(1).max(5),

  quoteValidityDays: z.number().int().min(1).max(365),
});

const guardrailSchema = z.object({
  minProjectValue: money,
  maxCustomSharePct: share,
  salesOverrideQuotaPct: share,
  minGrossMarginPct: share,
  targetGrossMarginMin: share,
  targetGrossMarginMax: share,
  customManDayConsultThreshold: z.number().min(0).max(500),
});

const addOnSchema = z.object({
  id: z.string().min(1).nullable(),
  slug: z.string().trim().max(80),
  kind: z.enum(ADDON_KINDS),
  name: z.string().trim().min(3, 'Nama add-on minimal 3 karakter.').max(120),
  description: z.string().trim().min(5, 'Deskripsi minimal 5 karakter.').max(600),
  priceMin: money,
  priceMax: money,
  manDayMin: z.number().min(0).max(500),
  manDayMax: z.number().min(0).max(500),
  isRecurring: z.boolean(),
  optionGroup: z.string().trim().max(60),
  sortOrder: z.number().int().min(0).max(999),
  isActive: z.boolean(),
  isGlobal: z.boolean(),
});

// ---------------------------------------------------------------------------
// Utilitas bersama
// ---------------------------------------------------------------------------

function actorLabel(user: CurrentUser): string {
  return `${user.name} (${USER_ROLE_LABEL[user.role]})`;
}

/**
 * Mencatat perubahan ke AuditLog.
 *
 * Setiap perubahan tarif berdampak langsung ke harga yang dilihat calon klien,
 * sehingga jejaknya wajib dapat ditelusuri siapa mengubah apa dan kapan.
 */
async function recordAudit(params: {
  user: CurrentUser;
  entity: 'PricingRule' | 'AddOn';
  entityId: string;
  action: string;
  summary: string;
  before?: unknown;
  after?: unknown;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: params.user.id,
      actorLabel: actorLabel(params.user),
      entity: params.entity,
      entityId: params.entityId,
      action: params.action,
      summary: params.summary,
      before: stringifyJson(params.before ?? {}),
      after: stringifyJson(params.after ?? {}),
    },
  });
}

function revalidatePricing(ruleId?: string): void {
  revalidatePath('/admin/harga');
  revalidatePath('/admin/harga/simulator');
  revalidatePath('/admin/harga/addon');
  if (ruleId) revalidatePath(`/admin/harga/${ruleId}`);
}

/** Pesan ramah untuk kegagalan validasi Zod. */
function validationMessage(error: z.ZodError): string {
  const first = error.issues[0];
  const path = first?.path.join('.') ?? '';
  return path ? `${path}: ${first?.message}` : (first?.message ?? 'Data tidak sah.');
}

/**
 * Menghitung berapa konfigurasi terbit yang terikat pada satu versi aturan.
 *
 * BR-07: perubahan tarif tidak boleh berlaku surut. Begitu sebuah versi sudah
 * dipakai konfigurasi yang keluar dari status DRAFT, nilainya menjadi arsip —
 * penyimpanan berikutnya harus menjadi versi baru, bukan menimpa versi ini.
 */
async function countIssuedConfigurations(ruleId: string): Promise<number> {
  return prisma.configuration.count({
    where: { pricingRuleId: ruleId, status: { in: FROZEN_CONFIGURATION_STATUSES } },
  });
}

/** Bidang aturan harga siap simpan ke Prisma (kolom JSON sudah di-stringify). */
function ruleColumns(values: z.infer<typeof ruleSchema>) {
  return {
    label: values.label,
    notes: values.notes || null,

    referenceRatePerManDay: values.referenceRatePerManDay,
    multiplierStandard: values.multiplierStandard,
    multiplierConfigurable: values.multiplierConfigurable,
    multiplierCustom: values.multiplierCustom,
    corePackagePrice: values.corePackagePrice,

    effortRatioCore: values.effortRatioCore,
    effortRatioStandard: values.effortRatioStandard,
    effortRatioConfigurable: values.effortRatioConfigurable,
    effortRatioCustom: values.effortRatioCustom,
    corePackageManDay: values.corePackageManDay,
    setupEffortManDay: values.setupEffortManDay,
    overheadEffortRatio: values.overheadEffortRatio,

    avgDeveloperSalary: values.avgDeveloperSalary,
    burdenFactor: values.burdenFactor,
    effectiveWorkDaysPerMonth: values.effectiveWorkDaysPerMonth,
    billableUtilization: values.billableUtilization,
    supportRoleRatio: values.supportRoleRatio,
    cogsPerManDayOverride: values.cogsPerManDayOverride,

    platformMultipliers: stringifyJson(values.platformMultipliers),
    deploymentMultipliers: stringifyJson(values.deploymentMultipliers),
    userTierPricing: stringifyJson(values.userTierPricing),
    setupFee: values.setupFee,

    volumeDiscountTiers: stringifyJson(values.volumeDiscountTiers),
    discountCountsCoreFeatures: values.discountCountsCoreFeatures,

    rangeWidthCore: values.rangeWidthCore,
    rangeWidthStandard: values.rangeWidthStandard,
    rangeWidthConfigurable: values.rangeWidthConfigurable,
    rangeWidthCustom: values.rangeWidthCustom,

    parallelDevelopers: values.parallelDevelopers,
    workDaysPerWeek: values.workDaysPerWeek,
    fixedDurationWeeks: values.fixedDurationWeeks,
    durationBufferFactor: values.durationBufferFactor,

    quoteValidityDays: values.quoteValidityDays,
  };
}

/**
 * Menyalin seluruh kolom tarif satu versi apa adanya.
 *
 * Dipakai saat perubahan pagar pengaman memaksa lahirnya versi baru: tarifnya
 * harus persis sama dengan versi asal, hanya kebijakan 6.8 yang berubah.
 */
function carryRuleColumns(rule: PricingRule) {
  return {
    label: rule.label,
    notes: rule.notes,

    referenceRatePerManDay: rule.referenceRatePerManDay,
    multiplierStandard: rule.multiplierStandard,
    multiplierConfigurable: rule.multiplierConfigurable,
    multiplierCustom: rule.multiplierCustom,
    corePackagePrice: rule.corePackagePrice,

    effortRatioCore: rule.effortRatioCore,
    effortRatioStandard: rule.effortRatioStandard,
    effortRatioConfigurable: rule.effortRatioConfigurable,
    effortRatioCustom: rule.effortRatioCustom,
    corePackageManDay: rule.corePackageManDay,
    setupEffortManDay: rule.setupEffortManDay,
    overheadEffortRatio: rule.overheadEffortRatio,

    avgDeveloperSalary: rule.avgDeveloperSalary,
    burdenFactor: rule.burdenFactor,
    effectiveWorkDaysPerMonth: rule.effectiveWorkDaysPerMonth,
    billableUtilization: rule.billableUtilization,
    supportRoleRatio: rule.supportRoleRatio,
    cogsPerManDayOverride: rule.cogsPerManDayOverride,

    platformMultipliers: rule.platformMultipliers,
    deploymentMultipliers: rule.deploymentMultipliers,
    userTierPricing: rule.userTierPricing,
    setupFee: rule.setupFee,

    volumeDiscountTiers: rule.volumeDiscountTiers,
    discountCountsCoreFeatures: rule.discountCountsCoreFeatures,

    rangeWidthCore: rule.rangeWidthCore,
    rangeWidthStandard: rule.rangeWidthStandard,
    rangeWidthConfigurable: rule.rangeWidthConfigurable,
    rangeWidthCustom: rule.rangeWidthCustom,

    parallelDevelopers: rule.parallelDevelopers,
    workDaysPerWeek: rule.workDaysPerWeek,
    fixedDurationWeeks: rule.fixedDurationWeeks,
    durationBufferFactor: rule.durationBufferFactor,

    quoteValidityDays: rule.quoteValidityDays,
  };
}

/** Ringkasan bidang kunci untuk jejak audit — bukan seluruh baris. */
function auditDigest(rule: {
  version: number;
  label: string;
  referenceRatePerManDay: number;
  multiplierStandard: number;
  multiplierConfigurable: number;
  multiplierCustom: number;
  corePackagePrice: number;
  setupFee: number;
  billableUtilization: number;
  minGrossMarginPct: number;
  minProjectValue: number;
}) {
  return {
    version: rule.version,
    label: rule.label,
    referenceRatePerManDay: rule.referenceRatePerManDay,
    multiplierStandard: rule.multiplierStandard,
    multiplierConfigurable: rule.multiplierConfigurable,
    multiplierCustom: rule.multiplierCustom,
    corePackagePrice: rule.corePackagePrice,
    setupFee: rule.setupFee,
    billableUtilization: rule.billableUtilization,
    minGrossMarginPct: rule.minGrossMarginPct,
    minProjectValue: rule.minProjectValue,
  };
}

async function nextVersionNumber(): Promise<number> {
  const latest = await prisma.pricingRule.findFirst({ orderBy: { version: 'desc' } });
  return (latest?.version ?? 0) + 1;
}

// ---------------------------------------------------------------------------
// Aksi: aturan harga
// ---------------------------------------------------------------------------

/**
 * Menyimpan perubahan satu versi aturan harga.
 *
 * Bila versi tersebut sudah dipakai konfigurasi terbit, penyimpanan dialihkan
 * menjadi pembuatan versi baru (M8 / BR-07) dan versi lama dibiarkan utuh agar
 * penawaran yang sudah keluar tetap dapat dihitung ulang persis.
 */
export async function savePricingRule(
  ruleId: string,
  values: PricingRuleFormValues,
): Promise<ActionResult> {
  const user = await requireArea('pricing', `/admin/harga/${ruleId}`);

  const parsed = ruleSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, message: validationMessage(parsed.error) };
  }

  const existing = await prisma.pricingRule.findUnique({ where: { id: ruleId } });
  if (!existing) {
    return { ok: false, message: 'Versi aturan harga tidak ditemukan.' };
  }

  const columns = ruleColumns(parsed.data);
  const issuedCount = await countIssuedConfigurations(ruleId);

  if (issuedCount > 0) {
    // BR-07: versi ini sudah menjadi arsip harga. Buat versi baru.
    const version = await nextVersionNumber();
    const created = await prisma.pricingRule.create({
      data: {
        ...columns,
        version,
        // Pagar pengaman ikut disalin apa adanya; perubahannya lewat form M7.
        minProjectValue: existing.minProjectValue,
        maxCustomSharePct: existing.maxCustomSharePct,
        salesOverrideQuotaPct: existing.salesOverrideQuotaPct,
        minGrossMarginPct: existing.minGrossMarginPct,
        targetGrossMarginMin: existing.targetGrossMarginMin,
        targetGrossMarginMax: existing.targetGrossMarginMax,
        customManDayConsultThreshold: existing.customManDayConsultThreshold,
        isActive: existing.isActive,
        effectiveFrom: new Date(),
        authorId: user.id,
      },
    });

    if (existing.isActive) {
      await prisma.pricingRule.update({
        where: { id: existing.id },
        data: { isActive: false },
      });
    }

    await recordAudit({
      user,
      entity: 'PricingRule',
      entityId: created.id,
      action: 'VERSION_FORKED',
      summary:
        `Versi v${created.version} dibuat dari v${existing.version} karena ` +
        `v${existing.version} sudah dipakai ${issuedCount} konfigurasi terbit (BR-07).`,
      before: auditDigest(existing),
      after: auditDigest(created),
    });

    revalidatePricing(created.id);
    revalidatePath(`/admin/harga/${ruleId}`);
    return {
      ok: true,
      forked: true,
      ruleId: created.id,
      message:
        `Versi v${existing.version} sudah dipakai ${issuedCount} konfigurasi terbit, ` +
        `sehingga perubahan disimpan sebagai versi baru v${created.version} (BR-07).`,
    };
  }

  const updated = await prisma.pricingRule.update({
    where: { id: ruleId },
    data: { ...columns, authorId: user.id },
  });

  await recordAudit({
    user,
    entity: 'PricingRule',
    entityId: updated.id,
    action: 'UPDATED',
    summary: `Aturan harga v${updated.version} diperbarui.`,
    before: auditDigest(existing),
    after: auditDigest(updated),
  });

  revalidatePricing(updated.id);
  return { ok: true, ruleId: updated.id, message: `Aturan harga v${updated.version} tersimpan.` };
}

/**
 * Membuat versi aturan harga baru, biasanya hasil salinan dari versi aktif.
 * `activate` menjadikannya aturan yang dipakai konfigurasi baru sejak sekarang.
 */
export async function createPricingRule(
  values: PricingRuleFormValues,
  options: { sourceRuleId?: string | null; activate?: boolean } = {},
): Promise<ActionResult> {
  const user = await requireArea('pricing', '/admin/harga/baru');

  const parsed = ruleSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, message: validationMessage(parsed.error) };
  }

  // Pagar pengaman disalin dari versi sumber (atau versi aktif) agar versi baru
  // tidak lahir tanpa kebijakan 6.8 sama sekali.
  const source = options.sourceRuleId
    ? await prisma.pricingRule.findUnique({ where: { id: options.sourceRuleId } })
    : await prisma.pricingRule.findFirst({ where: { isActive: true } });

  const version = await nextVersionNumber();
  const activate = options.activate ?? false;

  const created = await prisma.pricingRule.create({
    data: {
      ...ruleColumns(parsed.data),
      version,
      minProjectValue: source?.minProjectValue ?? 35_000_000,
      maxCustomSharePct: source?.maxCustomSharePct ?? 0.4,
      salesOverrideQuotaPct: source?.salesOverrideQuotaPct ?? 0.1,
      minGrossMarginPct: source?.minGrossMarginPct ?? 0.4,
      targetGrossMarginMin: source?.targetGrossMarginMin ?? 0.5,
      targetGrossMarginMax: source?.targetGrossMarginMax ?? 0.55,
      customManDayConsultThreshold: source?.customManDayConsultThreshold ?? 20,
      isActive: activate,
      effectiveFrom: new Date(),
      authorId: user.id,
    },
  });

  if (activate) {
    await prisma.pricingRule.updateMany({
      where: { id: { not: created.id }, isActive: true },
      data: { isActive: false },
    });
  }

  await recordAudit({
    user,
    entity: 'PricingRule',
    entityId: created.id,
    action: 'CREATED',
    summary: source
      ? `Versi v${created.version} dibuat sebagai salinan v${source.version}.`
      : `Versi v${created.version} dibuat dari nilai bawaan PRD.`,
    before: source ? auditDigest(source) : {},
    after: auditDigest(created),
  });

  revalidatePricing(created.id);
  return {
    ok: true,
    ruleId: created.id,
    message: activate
      ? `Versi v${created.version} dibuat dan langsung diaktifkan.`
      : `Versi v${created.version} dibuat sebagai draft. Aktifkan bila sudah diuji di simulator.`,
  };
}

/**
 * Menyimpan pagar pengaman komersial 6.8 (M7).
 *
 * Sama seperti tarif, pagar pengaman ikut membeku pada versi yang sudah dipakai
 * konfigurasi terbit — perubahannya melahirkan versi baru (BR-07).
 */
export async function saveGuardrails(
  ruleId: string,
  values: GuardrailFormValues,
): Promise<ActionResult> {
  const user = await requireArea('pricing', `/admin/harga/${ruleId}`);

  const parsed = guardrailSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, message: validationMessage(parsed.error) };
  }
  if (parsed.data.targetGrossMarginMin > parsed.data.targetGrossMarginMax) {
    return { ok: false, message: 'Target margin minimum tidak boleh melebihi target maksimum.' };
  }
  if (parsed.data.minGrossMarginPct > parsed.data.targetGrossMarginMin) {
    return {
      ok: false,
      message: 'Ambang margin wajib approval harus di bawah target margin minimum (BR-17).',
    };
  }

  const existing = await prisma.pricingRule.findUnique({ where: { id: ruleId } });
  if (!existing) return { ok: false, message: 'Versi aturan harga tidak ditemukan.' };

  const issuedCount = await countIssuedConfigurations(ruleId);

  if (issuedCount > 0) {
    const version = await nextVersionNumber();
    const created = await prisma.pricingRule.create({
      data: {
        ...carryRuleColumns(existing),
        ...parsed.data,
        version,
        isActive: existing.isActive,
        effectiveFrom: new Date(),
        authorId: user.id,
      },
    });

    if (existing.isActive) {
      await prisma.pricingRule.update({ where: { id: existing.id }, data: { isActive: false } });
    }

    await recordAudit({
      user,
      entity: 'PricingRule',
      entityId: created.id,
      action: 'GUARDRAIL_FORKED',
      summary:
        `Pagar pengaman 6.8 diubah lewat versi baru v${created.version} karena ` +
        `v${existing.version} sudah dipakai ${issuedCount} konfigurasi terbit (BR-07).`,
      before: auditDigest(existing),
      after: auditDigest(created),
    });

    revalidatePricing(created.id);
    revalidatePath(`/admin/harga/${ruleId}`);
    return {
      ok: true,
      forked: true,
      ruleId: created.id,
      message: `Pagar pengaman tersimpan pada versi baru v${created.version} (BR-07).`,
    };
  }

  const updated = await prisma.pricingRule.update({
    where: { id: ruleId },
    data: parsed.data,
  });

  await recordAudit({
    user,
    entity: 'PricingRule',
    entityId: updated.id,
    action: 'GUARDRAIL_UPDATED',
    summary: `Pagar pengaman 6.8 pada v${updated.version} diperbarui.`,
    before: auditDigest(existing),
    after: auditDigest(updated),
  });

  revalidatePricing(updated.id);
  return { ok: true, ruleId: updated.id, message: 'Pagar pengaman tersimpan.' };
}

/** Menjadikan satu versi sebagai aturan yang dipakai konfigurasi baru. */
export async function activatePricingRule(ruleId: string): Promise<ActionResult> {
  const user = await requireArea('pricing', '/admin/harga');

  const rule = await prisma.pricingRule.findUnique({ where: { id: ruleId } });
  if (!rule) return { ok: false, message: 'Versi aturan harga tidak ditemukan.' };
  if (rule.isActive) return { ok: true, ruleId, message: 'Versi ini memang sudah aktif.' };

  await prisma.pricingRule.updateMany({
    where: { isActive: true },
    data: { isActive: false },
  });
  const activated = await prisma.pricingRule.update({
    where: { id: ruleId },
    data: { isActive: true, effectiveFrom: new Date() },
  });

  await recordAudit({
    user,
    entity: 'PricingRule',
    entityId: activated.id,
    action: 'ACTIVATED',
    summary:
      `Versi v${activated.version} diaktifkan. Konfigurasi lama tetap memakai versi ` +
      `aturannya sendiri (BR-07).`,
    after: auditDigest(activated),
  });

  revalidatePricing(activated.id);
  return { ok: true, ruleId: activated.id, message: `Versi v${activated.version} kini aktif.` };
}

/**
 * Menghapus versi aturan harga.
 *
 * Hanya boleh untuk versi draft yang belum pernah dipakai konfigurasi mana pun;
 * versi yang sudah terpakai adalah arsip harga (BR-07).
 */
export async function deletePricingRule(ruleId: string): Promise<ActionResult> {
  const user = await requireArea('pricing', '/admin/harga');

  const rule = await prisma.pricingRule.findUnique({
    where: { id: ruleId },
    include: { _count: { select: { configurations: true, priceSnapshots: true } } },
  });
  if (!rule) return { ok: false, message: 'Versi aturan harga tidak ditemukan.' };
  if (rule.isActive) {
    return { ok: false, message: 'Versi aktif tidak dapat dihapus. Aktifkan versi lain lebih dulu.' };
  }
  if (rule._count.configurations > 0 || rule._count.priceSnapshots > 0) {
    return {
      ok: false,
      message:
        `Versi v${rule.version} sudah dipakai ${rule._count.configurations} konfigurasi dan ` +
        `tidak boleh dihapus — riwayat harga harus tetap dapat dihitung ulang (BR-07).`,
    };
  }

  await prisma.pricingRule.delete({ where: { id: ruleId } });
  await recordAudit({
    user,
    entity: 'PricingRule',
    entityId: ruleId,
    action: 'DELETED',
    summary: `Versi draft v${rule.version} dihapus sebelum pernah dipakai.`,
    before: auditDigest(rule),
  });

  revalidatePricing();
  return { ok: true, message: `Versi draft v${rule.version} dihapus.` };
}

// ---------------------------------------------------------------------------
// Aksi: add-on (M5)
// ---------------------------------------------------------------------------

/** Membuat atau memperbarui satu add-on. */
export async function saveAddOn(values: AddOnFormValues): Promise<ActionResult> {
  const user = await requireArea('pricing', '/admin/harga/addon');

  const parsed = addOnSchema.safeParse(values);
  if (!parsed.success) return { ok: false, message: validationMessage(parsed.error) };

  const data = parsed.data;
  if (data.priceMax < data.priceMin) {
    return { ok: false, message: 'Harga maksimum tidak boleh lebih kecil dari minimum.' };
  }
  if (data.manDayMax < data.manDayMin) {
    return { ok: false, message: 'Man-day maksimum tidak boleh lebih kecil dari minimum.' };
  }
  // BR-12: biaya berulang tidak boleh membawa effort proyek, karena effort itu
  // akan ikut menaikkan proyeksi COGS satu kali padahal biayanya bulanan.
  if (data.isRecurring && (data.manDayMin > 0 || data.manDayMax > 0)) {
    return {
      ok: false,
      message:
        'Add-on berulang tidak boleh membawa effort man-day proyek. ' +
        'Pisahkan pekerjaan sekali jalan menjadi add-on tersendiri (BR-12).',
    };
  }

  const slug = data.slug.trim() ? slugify(data.slug) : slugify(data.name);
  if (!slug) return { ok: false, message: 'Slug tidak dapat dibentuk dari nama add-on.' };

  const columns = {
    slug,
    kind: data.kind,
    name: data.name,
    description: data.description,
    priceMin: data.priceMin,
    priceMax: data.priceMax,
    manDayMin: data.manDayMin,
    manDayMax: data.manDayMax,
    isRecurring: data.isRecurring,
    optionGroup: data.optionGroup.trim() ? data.optionGroup.trim() : null,
    sortOrder: data.sortOrder,
    isActive: data.isActive,
    isGlobal: data.isGlobal,
  };

  const duplicate = await prisma.addOn.findUnique({ where: { slug } });
  if (duplicate && duplicate.id !== data.id) {
    return { ok: false, message: `Slug "${slug}" sudah dipakai add-on lain.` };
  }

  if (data.id) {
    const existing = await prisma.addOn.findUnique({ where: { id: data.id } });
    if (!existing) return { ok: false, message: 'Add-on tidak ditemukan.' };

    const updated = await prisma.addOn.update({ where: { id: data.id }, data: columns });
    await recordAudit({
      user,
      entity: 'AddOn',
      entityId: updated.id,
      action: 'UPDATED',
      summary: `Add-on "${updated.name}" diperbarui.`,
      before: {
        name: existing.name,
        priceMin: existing.priceMin,
        priceMax: existing.priceMax,
        isRecurring: existing.isRecurring,
        isActive: existing.isActive,
      },
      after: {
        name: updated.name,
        priceMin: updated.priceMin,
        priceMax: updated.priceMax,
        isRecurring: updated.isRecurring,
        isActive: updated.isActive,
      },
    });
    revalidatePricing();
    return { ok: true, message: `Add-on "${updated.name}" tersimpan.` };
  }

  const created = await prisma.addOn.create({ data: columns });
  await recordAudit({
    user,
    entity: 'AddOn',
    entityId: created.id,
    action: 'CREATED',
    summary: `Add-on "${created.name}" dibuat.`,
    after: {
      name: created.name,
      kind: created.kind,
      priceMin: created.priceMin,
      priceMax: created.priceMax,
      isRecurring: created.isRecurring,
    },
  });
  revalidatePricing();
  return { ok: true, message: `Add-on "${created.name}" dibuat.` };
}

/** Menyalakan/mematikan ketersediaan satu add-on di konfigurator. */
export async function setAddOnActive(addOnId: string, isActive: boolean): Promise<ActionResult> {
  const user = await requireArea('pricing', '/admin/harga/addon');

  const existing = await prisma.addOn.findUnique({ where: { id: addOnId } });
  if (!existing) return { ok: false, message: 'Add-on tidak ditemukan.' };

  const updated = await prisma.addOn.update({ where: { id: addOnId }, data: { isActive } });
  await recordAudit({
    user,
    entity: 'AddOn',
    entityId: updated.id,
    action: isActive ? 'ACTIVATED' : 'DEACTIVATED',
    summary: `Add-on "${updated.name}" ${isActive ? 'ditayangkan' : 'disembunyikan'} di konfigurator.`,
    before: { isActive: existing.isActive },
    after: { isActive: updated.isActive },
  });

  revalidatePricing();
  return {
    ok: true,
    message: `Add-on "${updated.name}" ${isActive ? 'kini tampil' : 'disembunyikan'} di konfigurator.`,
  };
}

/**
 * Menghapus add-on yang belum pernah dipilih konfigurasi mana pun.
 * Bila sudah pernah dipakai, add-on hanya dinonaktifkan agar riwayat penawaran
 * tetap dapat dibaca utuh.
 */
export async function deleteAddOn(addOnId: string): Promise<ActionResult> {
  const user = await requireArea('pricing', '/admin/harga/addon');

  const existing = await prisma.addOn.findUnique({
    where: { id: addOnId },
    include: { _count: { select: { configurations: true } } },
  });
  if (!existing) return { ok: false, message: 'Add-on tidak ditemukan.' };

  if (existing._count.configurations > 0) {
    await prisma.addOn.update({ where: { id: addOnId }, data: { isActive: false } });
    await recordAudit({
      user,
      entity: 'AddOn',
      entityId: addOnId,
      action: 'DEACTIVATED',
      summary:
        `Add-on "${existing.name}" dinonaktifkan (tidak dihapus) karena sudah dipakai ` +
        `${existing._count.configurations} konfigurasi.`,
      before: { isActive: existing.isActive },
      after: { isActive: false },
    });
    revalidatePricing();
    return {
      ok: true,
      message:
        `Add-on "${existing.name}" sudah dipakai ${existing._count.configurations} konfigurasi, ` +
        'jadi hanya dinonaktifkan agar riwayat penawaran tetap utuh.',
    };
  }

  await prisma.addOn.delete({ where: { id: addOnId } });
  await recordAudit({
    user,
    entity: 'AddOn',
    entityId: addOnId,
    action: 'DELETED',
    summary: `Add-on "${existing.name}" dihapus sebelum pernah dipakai.`,
    before: { name: existing.name, kind: existing.kind },
  });

  revalidatePricing();
  return { ok: true, message: `Add-on "${existing.name}" dihapus.` };
}
