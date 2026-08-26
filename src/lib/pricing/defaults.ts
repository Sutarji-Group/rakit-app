import type {
  ProjectDeployment,
  ProjectPlatform,
} from '@/lib/domain/enums';
import type { UserTierPrice, VolumeDiscountTier } from './types';

/** Pengali platform (PRD 6.5). */
export const DEFAULT_PLATFORM_MULTIPLIERS: Record<ProjectPlatform, number> = {
  WEB: 1.0,
  WEB_PWA: 1.25,
  WEB_NATIVE: 1.6,
};

/** Pengali deployment (PRD 6.5). */
export const DEFAULT_DEPLOYMENT_MULTIPLIERS: Record<ProjectDeployment, number> = {
  OUR_CLOUD: 1.0,
  CLIENT_SERVER: 1.1,
  ON_PREMISE: 1.25,
};

/**
 * Biaya lisensi & hosting bulanan menurut jumlah pengguna (PRD 6.5).
 * Selalu ditampilkan terpisah dari biaya proyek (BR-12).
 */
export const DEFAULT_USER_TIER_PRICING: UserTierPrice[] = [
  { tier: 'T10', label: '≤ 10 pengguna', monthlyMin: 750_000, monthlyMax: 1_200_000 },
  { tier: 'T50', label: '11 – 50 pengguna', monthlyMin: 1_500_000, monthlyMax: 2_500_000 },
  { tier: 'T200', label: '51 – 200 pengguna', monthlyMin: 3_500_000, monthlyMax: 5_500_000 },
  {
    tier: 'T200_PLUS',
    label: 'Lebih dari 200 pengguna',
    monthlyMin: 7_500_000,
    monthlyMax: 12_000_000,
  },
];

/** Tabel diskon skala (PRD 6.6). */
export const DEFAULT_VOLUME_DISCOUNT_TIERS: VolumeDiscountTier[] = [
  { minFeatures: 1, maxFeatures: 15, discountPct: 0, label: '1 – 15 fitur' },
  { minFeatures: 16, maxFeatures: 25, discountPct: 0.05, label: '16 – 25 fitur' },
  { minFeatures: 26, maxFeatures: 40, discountPct: 0.1, label: '26 – 40 fitur' },
  { minFeatures: 41, maxFeatures: null, discountPct: 0.15, label: 'Lebih dari 40 fitur' },
];
