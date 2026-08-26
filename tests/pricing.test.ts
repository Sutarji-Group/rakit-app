/**
 * Pengujian mesin harga terhadap PRD bagian 6 dan Lampiran C.
 *
 * Jalankan: npm test
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  BASELINE_PRICING_RULE,
  computePrice,
  deriveCogsPerManDay,
  evaluatePriceOverride,
  priceImpactLevel,
  resolveDiscountTier,
  roundToMillion,
  validateRangeWidth,
} from '../src/lib/pricing';
import type { PriceInputFeature } from '../src/lib/pricing';

const RULE = BASELINE_PRICING_RULE;

/** Membangun n fitur seragam untuk mereplikasi skenario Lampiran C. */
function makeFeatures(
  type: PriceInputFeature['type'],
  count: number,
  manDay: number,
  prefix: string,
): PriceInputFeature[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix}-${i}`,
    name: `${prefix} ${i + 1}`,
    type,
    manDayMin: manDay,
    manDayMax: manDay,
  }));
}

describe('PRD 6.2 — struktur biaya internal', () => {
  it('menurunkan COGS per man-day ≈ Rp 1,8 juta dari asumsi bawaan', () => {
    const cogs = deriveCogsPerManDay(RULE);
    assert.equal(cogs.monthlyLoadedCost, 16_200_000, 'gaji × faktor beban');
    assert.equal(cogs.billableDaysPerMonth, 13, '19,4 hari × utilisasi 65% ≈ 13 hari');
    // PRD menyebut ≈ Rp 1.800.000 sebagai lantai absolut.
    assert.ok(
      cogs.cogsPerManDay >= 1_750_000 && cogs.cogsPerManDay <= 1_850_000,
      `COGS ${cogs.cogsPerManDay} harus berada di sekitar Rp 1,8 juta`,
    );
  });

  it('menghormati override COGS manual', () => {
    const cogs = deriveCogsPerManDay({ ...RULE, cogsPerManDayOverride: 2_100_000 });
    assert.equal(cogs.cogsPerManDay, 2_100_000);
    assert.equal(cogs.isOverridden, true);
  });

  it('utilisasi yang keliru (100%) menghasilkan biaya semu jauh lebih rendah', () => {
    const naive = deriveCogsPerManDay({ ...RULE, billableUtilization: 1.0 });
    const real = deriveCogsPerManDay(RULE);
    assert.ok(
      naive.cogsPerManDay < real.cogsPerManDay * 0.75,
      'PRD 6.2: asumsi utilisasi adalah variabel paling sensitif terhadap margin',
    );
  });
});

describe('PRD 6.3 — pengali per tipe fitur', () => {
  it('fitur Standard 3 man-day berharga ≈ Rp 5,3 juta (acuan Lampiran C)', () => {
    const result = computePrice({
      rule: RULE,
      features: makeFeatures('STANDARD', 1, 3, 'std'),
      platform: 'WEB',
      deployment: 'OUR_CLOUD',
      userTier: 'T10',
    });
    const line = result.lines[0];
    // 3 × 3.200.000 × 0,55 = 5.280.000
    assert.equal(line.priceMin, 5_280_000);
  });

  it('fitur Configurable 4 man-day berharga Rp 12,8 juta', () => {
    const result = computePrice({
      rule: RULE,
      features: makeFeatures('CONFIGURABLE', 1, 4, 'cfg'),
      platform: 'WEB',
      deployment: 'OUR_CLOUD',
      userTier: 'T10',
    });
    assert.equal(result.lines[0].priceMin, 12_800_000);
  });

  it('fitur Custom dikenakan premi risiko 1,5×', () => {
    const result = computePrice({
      rule: RULE,
      features: [],
      customRequests: [
        { id: 'c1', name: 'Custom A', isEstimated: true, manDayMin: 6, manDayMax: 6 },
      ],
      platform: 'WEB',
      deployment: 'OUR_CLOUD',
      userTier: 'T10',
    });
    // 6 × 3.200.000 × 1,5 = 28.800.000 — sama dengan Lampiran C skenario B.
    assert.equal(result.customValueMin, 28_800_000);
  });

  it('fitur Core tidak menambah subtotal per item, melainkan lewat paket dasar', () => {
    const result = computePrice({
      rule: RULE,
      features: makeFeatures('CORE', 8, 3, 'core'),
      platform: 'WEB',
      deployment: 'OUR_CLOUD',
      userTier: 'T10',
    });
    assert.equal(result.corePackagePrice, 25_000_000);
    assert.equal(result.featuresSubtotalMin, 25_000_000);
    assert.equal(result.paidFeatureCount, 0, 'Core bukan fitur berbayar untuk diskon skala');
  });
});

describe('PRD Lampiran C — skenario A: WMS Starter (14 fitur)', () => {
  const features = [
    ...makeFeatures('CORE', 8, 3, 'core'),
    ...makeFeatures('STANDARD', 6, 3, 'std'),
  ];
  const result = computePrice({
    rule: RULE,
    features,
    platform: 'WEB',
    deployment: 'OUR_CLOUD',
    userTier: 'T10',
  });

  it('subtotal fitur mendekati Rp 56,8 juta', () => {
    // 25.000.000 + 6 × 5.280.000 = 56.680.000
    assert.equal(result.featuresSubtotalMin, 56_680_000);
  });

  it('tidak mendapat diskon skala (6 fitur berbayar, tier 1–15)', () => {
    assert.equal(result.paidFeatureCount, 6);
    assert.equal(result.discountPct, 0);
  });

  it('menambahkan biaya setup tetap Rp 10 juta (BR-14)', () => {
    assert.equal(result.setupFee, 10_000_000);
    assert.equal(result.totalMin, 66_680_000);
  });

  it('gross margin sehat — di atas target karena biaya setup tetap menolong proyek kecil', () => {
    const gm = result.internal.grossMarginPct;
    // PRD 6.8 butir 2: biaya setup Rp 10 juta yang tidak menyusut memang
    // dirancang untuk menyelamatkan margin proyek kecil, sehingga margin di
    // atas pita target 50–55% pada skenario ini justru yang diharapkan.
    assert.ok(gm >= 0.5, `gross margin ${(gm * 100).toFixed(1)}% di bawah target`);
    assert.ok(gm <= 0.7, `gross margin ${(gm * 100).toFixed(1)}% tidak wajar tinggi`);
  });

  it('effort riil mendekati ~15 man-day seperti pada Lampiran C', () => {
    const effort = result.internal.realEffortManDayMax;
    assert.ok(
      effort >= 13 && effort <= 18,
      `effort riil ${effort} man-day menyimpang jauh dari acuan Lampiran C (~15)`,
    );
  });

  it('lolos seluruh pagar pengaman dan boleh terbit otomatis', () => {
    assert.equal(result.canAutoQuote, true);
    assert.equal(result.guardrails.filter((g) => g.blocking).length, 0);
  });
});

describe('PRD Lampiran C — skenario B: WMS Growth (28 fitur)', () => {
  const features = [
    ...makeFeatures('CORE', 8, 3, 'core'),
    ...makeFeatures('STANDARD', 12, 3, 'std'),
    ...makeFeatures('CONFIGURABLE', 5, 4, 'cfg'),
  ];
  const customRequests = Array.from({ length: 3 }, (_, i) => ({
    id: `c${i}`,
    name: `Custom ${i + 1}`,
    isEstimated: true,
    manDayMin: 6,
    manDayMax: 6,
  }));

  const result = computePrice({
    rule: RULE,
    features,
    customRequests,
    platform: 'WEB',
    deployment: 'OUR_CLOUD',
    userTier: 'T50',
  });

  it('subtotal fitur mendekati Rp 239 juta seperti pada Lampiran C', () => {
    // 25.000.000 + 12×5.280.000 + 5×12.800.000 + 3×28.800.000 = 238.760.000
    assert.equal(result.featuresSubtotalMin, 238_760_000);
  });

  it('mendapat diskon skala 10% (20 fitur berbayar + ... masuk tier)', () => {
    assert.equal(result.paidFeatureCount, 20, '17 fitur non-core + 3 custom terestimasi');
    assert.equal(result.discountPct, 0.05, '20 fitur masuk tier 16–25 → 5%');
  });

  it('marginnya lebih rendah daripada skenario A meski nilainya jauh lebih besar', () => {
    const scenarioA = computePrice({
      rule: RULE,
      features: [...makeFeatures('CORE', 8, 3, 'core'), ...makeFeatures('STANDARD', 6, 3, 'std')],
      platform: 'WEB',
      deployment: 'OUR_CLOUD',
      userTier: 'T10',
    });
    assert.ok(
      result.totalMax > scenarioA.totalMax * 3,
      'skenario B bernilai jauh lebih besar',
    );
    assert.ok(
      result.internal.grossMarginPct < scenarioA.internal.grossMarginPct,
      'temuan penting PRD: proyek besar tidak otomatis proyek sehat',
    );
  });

  it('porsi custom dihitung dan dilaporkan', () => {
    assert.ok(result.customSharePct > 0.3 && result.customSharePct < 0.45);
  });
});

describe('PRD 6.6 — diskon skala', () => {
  const cases: Array<[number, number]> = [
    [1, 0],
    [15, 0],
    [16, 0.05],
    [25, 0.05],
    [26, 0.1],
    [40, 0.1],
    [41, 0.15],
    [80, 0.15],
  ];
  for (const [count, expected] of cases) {
    it(`${count} fitur berbayar → diskon ${expected * 100}%`, () => {
      const tier = resolveDiscountTier(RULE.volumeDiscountTiers, count);
      assert.equal(tier?.discountPct ?? 0, expected);
    });
  }

  it('diskon tidak pernah memotong biaya setup (BR-14)', () => {
    const result = computePrice({
      rule: RULE,
      features: makeFeatures('STANDARD', 45, 3, 'std'),
      platform: 'WEB',
      deployment: 'OUR_CLOUD',
      userTier: 'T10',
    });
    assert.equal(result.discountPct, 0.15);
    const expectedTotal =
      result.multipliedMin - result.discountMin + result.addOnOneTimeMin + 10_000_000;
    assert.equal(result.totalMin, expectedTotal);
  });
});

describe('PRD 6.5 — pengali platform & deployment', () => {
  const base = makeFeatures('STANDARD', 10, 3, 'std');

  it('Web + Mobile Native menaikkan subtotal 1,6×', () => {
    const web = computePrice({
      rule: RULE, features: base, platform: 'WEB', deployment: 'OUR_CLOUD', userTier: 'T10',
    });
    const native = computePrice({
      rule: RULE, features: base, platform: 'WEB_NATIVE', deployment: 'OUR_CLOUD', userTier: 'T10',
    });
    assert.equal(native.multipliedMin, Math.round(web.multipliedMin * 1.6));
  });

  it('pengali proyek juga menaikkan effort riil sehingga margin tetap sehat', () => {
    const web = computePrice({
      rule: RULE, features: base, platform: 'WEB', deployment: 'OUR_CLOUD', userTier: 'T10',
    });
    const native = computePrice({
      rule: RULE, features: base, platform: 'WEB_NATIVE', deployment: 'OUR_CLOUD', userTier: 'T10',
    });
    assert.ok(native.internal.realEffortManDayMax > web.internal.realEffortManDayMax);
    assert.ok(
      Math.abs(native.internal.grossMarginPct - web.internal.grossMarginPct) < 0.06,
      'margin tidak boleh melonjak hanya karena pengali platform',
    );
  });

  it('biaya berulang bulanan terpisah dari nilai proyek (BR-12)', () => {
    const result = computePrice({
      rule: RULE, features: base, platform: 'WEB', deployment: 'OUR_CLOUD', userTier: 'T200',
    });
    assert.ok(result.recurringMonthlyMin > 0);
    assert.ok(
      result.totalMin < result.multipliedMin + 11_000_000,
      'biaya berulang tidak boleh ikut masuk total proyek',
    );
  });
});

describe('BR-02 — fitur custom tidak dihitung sebelum diestimasi manusia', () => {
  const result = computePrice({
    rule: RULE,
    features: makeFeatures('STANDARD', 10, 3, 'std'),
    customRequests: [
      { id: 'c1', name: 'Belum diestimasi', isEstimated: false },
      { id: 'c2', name: 'Sudah diestimasi', isEstimated: true, manDayMin: 5, manDayMax: 7 },
    ],
    platform: 'WEB',
    deployment: 'OUR_CLOUD',
    userTier: 'T10',
  });

  it('menghitung hanya yang sudah diestimasi', () => {
    assert.equal(result.pendingCustomCount, 1);
    assert.equal(result.estimatedCustomCount, 1);
    assert.equal(result.customValueMin, 5 * 3_200_000 * 1.5);
  });

  it('menandai bahwa total belum final', () => {
    const flag = result.guardrails.find((g) => g.code === 'PENDING_CUSTOM_ESTIMATE');
    assert.ok(flag, 'harus ada penanda menunggu estimasi');
    assert.equal(flag!.blocking, false, 'tidak memblokir, hanya menandai');
  });
});

describe('PRD 6.8 — pagar pengaman komersial', () => {
  it('BR-13: menolak konfigurasi di bawah nilai proyek minimum Rp 35 juta', () => {
    const result = computePrice({
      rule: RULE,
      features: makeFeatures('STANDARD', 2, 1, 'std'),
      platform: 'WEB',
      deployment: 'OUR_CLOUD',
      userTier: 'T10',
    });
    const flag = result.guardrails.find((g) => g.code === 'BELOW_MIN_PROJECT_VALUE');
    assert.ok(flag, 'harus menandai di bawah proyek minimum');
    assert.equal(flag!.blocking, true);
    assert.equal(result.canAutoQuote, false);
    assert.ok(flag!.clientMessage?.includes('konsultasi'), 'penolakan harus halus dan menawarkan jalan keluar');
  });

  it('BR-15: menandai porsi custom di atas 40%', () => {
    const result = computePrice({
      rule: RULE,
      features: makeFeatures('STANDARD', 4, 3, 'std'),
      customRequests: [
        { id: 'c1', name: 'Besar', isEstimated: true, manDayMin: 25, manDayMax: 25 },
      ],
      platform: 'WEB',
      deployment: 'OUR_CLOUD',
      userTier: 'T10',
    });
    assert.ok(result.customSharePct > 0.4);
    const flag = result.guardrails.find((g) => g.code === 'EXCEEDS_CUSTOM_SHARE');
    assert.ok(flag);
    assert.equal(result.canAutoQuote, false, 'penawaran tidak terbit otomatis');
  });

  it('BR-17: menandai proyeksi gross margin di bawah 40%', () => {
    // Tarif referensi ditekan sangat rendah agar margin jatuh.
    const cheapRule = { ...RULE, referenceRatePerManDay: 900_000, corePackagePrice: 5_000_000 };
    const result = computePrice({
      rule: cheapRule,
      features: makeFeatures('CONFIGURABLE', 20, 5, 'cfg'),
      platform: 'WEB',
      deployment: 'OUR_CLOUD',
      userTier: 'T10',
    });
    assert.ok(result.internal.grossMarginPct < 0.4);
    assert.ok(result.guardrails.some((g) => g.code === 'BELOW_MIN_MARGIN' && g.blocking));
  });

  it('BR-16: override harga di atas kuota 10% memerlukan approval', () => {
    const result = computePrice({
      rule: RULE,
      features: makeFeatures('STANDARD', 20, 3, 'std'),
      platform: 'WEB',
      deployment: 'OUR_CLOUD',
      userTier: 'T10',
    });
    const within = evaluatePriceOverride(RULE, result, Math.round(result.totalMax * 0.93));
    assert.equal(within.withinQuota, true);
    assert.equal(within.needsApproval, false);

    const beyond = evaluatePriceOverride(RULE, result, Math.round(result.totalMax * 0.8));
    assert.equal(beyond.withinQuota, false);
    assert.equal(beyond.needsApproval, true);
    assert.ok(beyond.message.includes('kuota'));
  });
});

describe('BR-05 / PRD 6.1 — batas lebar rentang per tipe', () => {
  const cases: Array<[Parameters<typeof validateRangeWidth>[1], number, number, boolean]> = [
    ['CORE', 2, 2.3, true],      // 1,15×
    ['CORE', 2, 2.4, false],     // 1,20×
    ['STANDARD', 2, 2.6, true],  // 1,30×
    ['STANDARD', 2, 2.8, false], // 1,40×
    ['CONFIGURABLE', 2, 3.6, true],  // 1,80×
    ['CONFIGURABLE', 2, 4.0, false], // 2,00×
  ];
  for (const [type, min, max, expected] of cases) {
    it(`${type} ${min}–${max} man-day → ${expected ? 'sah' : 'ditolak'}`, () => {
      assert.equal(validateRangeWidth(RULE, type, min, max).valid, expected);
    });
  }

  it('memberi pesan yang menjelaskan cara memperbaiki', () => {
    const result = validateRangeWidth(RULE, 'STANDARD', 2, 5);
    assert.equal(result.valid, false);
    assert.ok(result.message?.includes('Persempit rentang'));
  });
});

describe('C2.4 — indikator dampak harga bertingkat', () => {
  it('memetakan harga ke tiga tingkat', () => {
    assert.equal(priceImpactLevel(RULE, 5_000_000), 1);
    assert.equal(priceImpactLevel(RULE, 6_400_000), 1);
    assert.equal(priceImpactLevel(RULE, 10_000_000), 2);
    assert.equal(priceImpactLevel(RULE, 12_800_000), 2);
    assert.equal(priceImpactLevel(RULE, 20_000_000), 3);
  });
});

describe('C4.1 — pembulatan tampilan ke jutaan terdekat', () => {
  it('membulatkan ke jutaan', () => {
    assert.equal(roundToMillion(56_680_000), 57_000_000);
    assert.equal(roundToMillion(56_400_000), 56_000_000);
  });

  it('total yang ditampilkan selalu berupa kelipatan satu juta', () => {
    const result = computePrice({
      rule: RULE,
      features: makeFeatures('STANDARD', 13, 3.2, 'std'),
      platform: 'WEB_PWA',
      deployment: 'CLIENT_SERVER',
      userTier: 'T50',
    });
    assert.equal(result.displayTotalMin % 1_000_000, 0);
    assert.equal(result.displayTotalMax % 1_000_000, 0);
  });
});

describe('Estimasi durasi', () => {
  it('rentang minggu naik seiring bertambahnya fitur', () => {
    const small = computePrice({
      rule: RULE, features: makeFeatures('STANDARD', 5, 3, 's'),
      platform: 'WEB', deployment: 'OUR_CLOUD', userTier: 'T10',
    });
    const large = computePrice({
      rule: RULE, features: makeFeatures('STANDARD', 30, 3, 's'),
      platform: 'WEB', deployment: 'OUR_CLOUD', userTier: 'T10',
    });
    assert.ok(large.duration.weeksMin > small.duration.weeksMin);
    assert.ok(large.duration.weeksMax > large.duration.weeksMin);
  });

  it('selalu menghasilkan fase untuk diagram timeline pada PDF (F4)', () => {
    const result = computePrice({
      rule: RULE, features: makeFeatures('STANDARD', 12, 3, 's'),
      platform: 'WEB', deployment: 'OUR_CLOUD', userTier: 'T10',
    });
    assert.equal(result.duration.phases.length, 5);
    assert.ok(result.duration.phases.every((p) => p.weeks >= 1));
  });
});

describe('4.3 — rasio lebar rentang rata-rata ≤ 1,35', () => {
  it('katalog dengan rentang wajar menghasilkan rasio total di bawah target', () => {
    const features: PriceInputFeature[] = [
      ...Array.from({ length: 8 }, (_, i) => ({
        id: `core-${i}`, name: `Core ${i}`, type: 'CORE' as const, manDayMin: 3, manDayMax: 3.4,
      })),
      ...Array.from({ length: 14 }, (_, i) => ({
        id: `std-${i}`, name: `Std ${i}`, type: 'STANDARD' as const, manDayMin: 3, manDayMax: 3.8,
      })),
      ...Array.from({ length: 4 }, (_, i) => ({
        id: `cfg-${i}`, name: `Cfg ${i}`, type: 'CONFIGURABLE' as const, manDayMin: 4, manDayMax: 6.5,
      })),
    ];
    const result = computePrice({
      rule: RULE, features, platform: 'WEB', deployment: 'OUR_CLOUD', userTier: 'T50',
    });
    assert.ok(
      result.rangeWidthRatio <= 1.35,
      `rasio lebar rentang ${result.rangeWidthRatio} melebihi target 1,35`,
    );
  });
});

describe('BR-07 / M8 — versioning aturan harga', () => {
  it('aturan versi lama menghasilkan angka lama untuk konfigurasi yang sama', () => {
    const oldRule = { ...RULE, version: 1, referenceRatePerManDay: 3_000_000 };
    const newRule = { ...RULE, version: 2, referenceRatePerManDay: 3_600_000 };
    const features = makeFeatures('STANDARD', 10, 3, 'std');

    const withOld = computePrice({
      rule: oldRule, features, platform: 'WEB', deployment: 'OUR_CLOUD', userTier: 'T10',
    });
    const withNew = computePrice({
      rule: newRule, features, platform: 'WEB', deployment: 'OUR_CLOUD', userTier: 'T10',
    });

    assert.equal(withOld.ruleVersion, 1);
    assert.equal(withNew.ruleVersion, 2);
    assert.ok(withNew.totalMin > withOld.totalMin);
  });
});

describe('PRD 6.6 vs Lampiran C — dasar penghitungan diskon', () => {
  const features = [
    ...makeFeatures('CORE', 8, 3, 'core'),
    ...makeFeatures('STANDARD', 12, 3, 'std'),
    ...makeFeatures('CONFIGURABLE', 5, 4, 'cfg'),
  ];
  const customRequests = Array.from({ length: 3 }, (_, i) => ({
    id: `c${i}`, name: `Custom ${i}`, isEstimated: true, manDayMin: 6, manDayMax: 6,
  }));

  it('bawaan mengikuti teks aturan: 20 fitur berbayar → tier 16–25 → 5%', () => {
    const result = computePrice({
      rule: RULE, features, customRequests,
      platform: 'WEB', deployment: 'OUR_CLOUD', userTier: 'T50',
    });
    assert.equal(result.discountBasisCount, 20);
    assert.equal(result.discountPct, 0.05);
  });

  it('opsi Lampiran C: fitur Core ikut dihitung → 28 fitur → tier 26–40 → 10%', () => {
    const result = computePrice({
      rule: { ...RULE, discountCountsCoreFeatures: true },
      features, customRequests,
      platform: 'WEB', deployment: 'OUR_CLOUD', userTier: 'T50',
    });
    assert.equal(result.discountBasisCount, 28);
    assert.equal(result.discountPct, 0.1);
    // 238.760.000 − 10% = 214.884.000, sangat dekat dengan Rp 215.100.000
    // pada Lampiran C skenario B.
    assert.ok(Math.abs(result.multipliedMin - result.discountMin - 215_100_000) < 500_000);
  });
});
