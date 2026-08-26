import 'server-only';

import { prisma } from '@/lib/db/prisma';
import { stringifyJson } from '@/lib/db/json';
import {
  DEFAULT_DEPLOYMENT_MULTIPLIERS,
  DEFAULT_PLATFORM_MULTIPLIERS,
  DEFAULT_USER_TIER_PRICING,
  DEFAULT_VOLUME_DISCOUNT_TIERS,
  toPricingRuleSnapshot,
  type PricingRuleSnapshot,
} from '@/lib/pricing';

/**
 * Mengambil aturan harga yang sedang aktif. Bila belum ada sama sekali,
 * aturan bawaan dibuat agar aplikasi tetap berjalan pada instalasi baru.
 */
export async function getActivePricingRule(): Promise<PricingRuleSnapshot> {
  const active = await prisma.pricingRule.findFirst({
    where: { isActive: true },
    orderBy: { version: 'desc' },
  });
  if (active) return toPricingRuleSnapshot(active);

  const created = await prisma.pricingRule.create({
    data: {
      version: 1,
      label: 'Kalibrasi awal — PRD v1.1',
      notes:
        'Dibuat otomatis pada instalasi baru dengan nilai bawaan PRD bagian 6.2–6.8.',
      isActive: true,
      platformMultipliers: stringifyJson(DEFAULT_PLATFORM_MULTIPLIERS),
      deploymentMultipliers: stringifyJson(DEFAULT_DEPLOYMENT_MULTIPLIERS),
      userTierPricing: stringifyJson(DEFAULT_USER_TIER_PRICING),
      volumeDiscountTiers: stringifyJson(DEFAULT_VOLUME_DISCOUNT_TIERS),
    },
  });
  return toPricingRuleSnapshot(created);
}

/**
 * Mengambil aturan harga tertentu berdasarkan id.
 *
 * Dipakai untuk menghitung ulang konfigurasi lama dengan aturan versi lamanya
 * (BR-07): perubahan tarif tidak berlaku surut terhadap penawaran yang terbit.
 */
export async function getPricingRuleById(id: string): Promise<PricingRuleSnapshot | null> {
  const rule = await prisma.pricingRule.findUnique({ where: { id } });
  return rule ? toPricingRuleSnapshot(rule) : null;
}

export async function listPricingRules() {
  return prisma.pricingRule.findMany({
    orderBy: { version: 'desc' },
    include: {
      author: { select: { name: true } },
      _count: { select: { configurations: true } },
    },
  });
}
