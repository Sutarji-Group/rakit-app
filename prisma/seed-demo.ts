/**
 * Data contoh RAKIT.
 *
 * Tujuannya bukan sekadar mengisi tabel, melainkan membuat setiap papan admin
 * dapat dibaca sebagai cerita: antrean custom yang SLA-nya berbeda-beda,
 * pipeline dengan lead sehat dan lead bermargin tipis, satu proyek berjalan
 * dengan man-day aktual agar laporan varians punya isi, serta jejak event
 * analitik agar corong konversi menampilkan angka nyata.
 *
 * Dipanggil dari prisma/seed.ts. Lewati bagian ini pada instalasi produksi.
 */

import type { PrismaClient } from '../src/generated/prisma';
import { stringifyJson } from '../src/lib/db/json';
import {
  computePrice,
  toPricingRuleSnapshot,
  type PriceInputCustom,
  type PriceInputFeature,
} from '../src/lib/pricing';
import {
  buildDependencyGraph,
  enforceSelection,
} from '../src/lib/configurator/dependency';

function daysAgo(days: number, hours = 0): Date {
  return new Date(Date.now() - days * 86_400_000 - hours * 3_600_000);
}

function hoursFromNow(hours: number): Date {
  return new Date(Date.now() + hours * 3_600_000);
}

const TOKEN_ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz';
function makeToken(seed: number): string {
  let value = seed * 2654435761;
  let token = '';
  for (let i = 0; i < 12; i += 1) {
    value = (value * 1103515245 + 12345) & 0x7fffffff;
    token += TOKEN_ALPHABET[value % TOKEN_ALPHABET.length];
  }
  return token;
}

interface DemoConfigSpec {
  seed: number;
  categorySlug: string;
  presetSlug?: string;
  name: string;
  /** Fitur tambahan di luar preset, ditunjuk lewat slug. */
  extraFeatureSlugs?: string[];
  removeFeatureSlugs?: string[];
  platform?: 'WEB' | 'WEB_PWA' | 'WEB_NATIVE';
  deployment?: 'OUR_CLOUD' | 'CLIENT_SERVER' | 'ON_PREMISE';
  userTier?: 'T10' | 'T50' | 'T200' | 'T200_PLUS';
  addOnSlugs?: string[];
  customRequests?: Array<{
    name: string;
    problem: string;
    userRoles: string;
    flowSteps: string[];
    priority: 'MUST_HAVE' | 'NICE_TO_HAVE';
    status: 'PENDING' | 'IN_REVIEW' | 'NEEDS_CLARIFICATION' | 'ESTIMATED' | 'CONSULT_REQUIRED';
    slaHoursFromNow: number;
    manDayMin?: number;
    manDayMax?: number;
    riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
    internalNote?: string;
    clarificationQuestion?: string;
  }>;
  lead: {
    contactName: string;
    company: string;
    email: string;
    whatsapp: string;
    budgetBand: string;
    stage: string;
    ownerRole: 'SALES' | 'CONSULTANT';
    createdDaysAgo: number;
    lostReason?: string;
    lostNote?: string;
    note?: string;
    activities?: Array<{ kind: string; body: string; daysAgo: number }>;
  };
  /** Konfigurasi yang dimenangkan dikonversi menjadi proyek. */
  becomesProject?: {
    code: string;
    name: string;
    status: string;
    startedDaysAgo: number;
    durationWeeks: number;
    progressNote: string;
  };
}

const DEMO_CONFIGS: DemoConfigSpec[] = [
  {
    seed: 101,
    categorySlug: 'wms',
    presetSlug: 'wms-growth',
    name: 'WMS Sumber Rejeki',
    platform: 'WEB_PWA',
    deployment: 'OUR_CLOUD',
    userTier: 'T50',
    lead: {
      contactName: 'Budi Santoso',
      company: 'CV Sumber Rejeki Distribusi',
      email: 'budi@sumberrejeki.co.id',
      whatsapp: '0812-3456-7890',
      budgetBand: 'B100_250',
      stage: 'WON',
      ownerRole: 'SALES',
      createdDaysAgo: 47,
      note: 'Dua gudang di Bekasi dan Cikarang. Sudah pakai barcode, belum terintegrasi akuntansi.',
      activities: [
        { kind: 'CALL', body: 'Discovery call 45 menit. Fokus utama: selisih stok akhir bulan dan pencarian barang di rak.', daysAgo: 44 },
        { kind: 'NOTE', body: 'Direksi minta perbandingan dengan dua vendor lain. Kirim proposal versi ringkas.', daysAgo: 40 },
        { kind: 'EMAIL', body: 'Proposal final dikirim, harga dikunci 30 hari.', daysAgo: 36 },
        { kind: 'NOTE', body: 'Deal ditutup. DP 30% masuk, kickoff minggu depan.', daysAgo: 30 },
      ],
    },
    becomesProject: {
      code: 'PRJ-2026-001',
      name: 'WMS Sumber Rejeki Distribusi',
      status: 'IN_PROGRESS',
      startedDaysAgo: 28,
      durationWeeks: 9,
      progressNote: 'Fase master data dan penerimaan selesai, sedang mengerjakan pengeluaran.',
    },
  },
  {
    seed: 102,
    categorySlug: 'wms',
    presetSlug: 'wms-enterprise',
    name: 'WMS Multi-Gudang Nusantara',
    platform: 'WEB_NATIVE',
    deployment: 'CLIENT_SERVER',
    userTier: 'T200',
    customRequests: [
      {
        name: 'Integrasi timbangan digital di area penerimaan',
        problem:
          'Barang curah ditimbang manual lalu diketik ulang ke sistem. Sering salah ketik dan tidak ada bukti timbangan yang bisa ditelusuri saat ada klaim dari supplier.',
        userRoles: 'Petugas penerimaan barang dan supervisor gudang',
        flowSteps: [
          'Petugas menaruh barang di timbangan digital di area penerimaan',
          'Berat terbaca otomatis masuk ke form penerimaan tanpa diketik',
          'Sistem membandingkan berat aktual dengan berat pada Purchase Order',
          'Bila selisih melebihi toleransi, supervisor menerima notifikasi untuk verifikasi',
        ],
        priority: 'MUST_HAVE',
        status: 'ESTIMATED',
        slaHoursFromNow: -18,
        manDayMin: 7,
        manDayMax: 11,
        riskLevel: 'MEDIUM',
        internalNote:
          'Timbangan merek Excellent, protokol serial RS-232. Perlu jembatan lokal karena browser tidak bisa membaca serial port langsung.',
      },
      {
        name: 'Papan monitor besar untuk status pengiriman harian',
        problem:
          'Supervisor harus keliling bertanya ke tiap tim untuk tahu berapa surat jalan yang sudah keluar. Informasi selalu terlambat satu sampai dua jam.',
        userRoles: 'Supervisor gudang dan kepala operasional',
        flowSteps: [
          'Layar TV di area gudang menampilkan target dan realisasi pengiriman hari ini',
          'Angka diperbarui otomatis setiap kali surat jalan diterbitkan',
          'Baris berubah warna bila ada pengiriman yang melewati jam janji',
        ],
        priority: 'NICE_TO_HAVE',
        status: 'PENDING',
        slaHoursFromNow: 5,
      },
    ],
    lead: {
      contactName: 'Sarah Wijaya',
      company: 'PT Nusantara Logistik Prima',
      email: 'sarah.wijaya@nusantaralogistik.co.id',
      whatsapp: '0813-9876-5432',
      budgetBand: 'B250_500',
      stage: 'NEGOTIATION',
      ownerRole: 'CONSULTANT',
      createdDaysAgo: 12,
      note: 'Lima gudang, 200+ pengguna. Wajib deploy di server sendiri karena kebijakan grup.',
      activities: [
        { kind: 'CALL', body: 'Discovery call 60 menit bersama tim IT dan operasional.', daysAgo: 9 },
        { kind: 'NOTE', body: 'Minta breakdown biaya per gudang untuk presentasi ke direksi.', daysAgo: 6 },
        { kind: 'REMINDER', body: 'Follow up hasil rapat direksi.', daysAgo: 2 },
      ],
    },
  },
  {
    seed: 103,
    categorySlug: 'crm',
    presetSlug: 'crm-growth',
    name: 'CRM Tim Sales Mitra Jaya',
    platform: 'WEB_PWA',
    userTier: 'T50',
    lead: {
      contactName: 'Andi Kurniawan',
      company: 'PT Mitra Jaya Teknologi',
      email: 'andi@mitrajaya.id',
      whatsapp: '0857-1122-3344',
      budgetBand: 'B100_250',
      stage: 'DISCOVERY_SCHEDULED',
      ownerRole: 'SALES',
      createdDaysAgo: 5,
      note: 'Tim sales 22 orang, mayoritas di lapangan. Sekarang pakai Google Sheets.',
      activities: [
        { kind: 'EMAIL', body: 'Konfirmasi jadwal discovery call Selasa 10.00.', daysAgo: 2 },
      ],
    },
  },
  {
    seed: 104,
    categorySlug: 'pos',
    presetSlug: 'pos-starter',
    name: 'POS Kopi Kenangan Senja',
    platform: 'WEB',
    userTier: 'T10',
    lead: {
      contactName: 'Maya Anggraini',
      company: 'Kopi Senja',
      email: 'maya@kopisenja.id',
      whatsapp: '0878-5566-7788',
      budgetBand: 'UNDER_50',
      stage: 'LOST',
      ownerRole: 'SALES',
      createdDaysAgo: 21,
      lostReason: 'HARGA_TERLALU_TINGGI',
      lostNote:
        'Anggaran hanya Rp 25 juta. Diarahkan ke aplikasi kasir siap pakai berlangganan; ' +
        'akan kembali saat outlet bertambah menjadi tiga.',
      activities: [
        { kind: 'CALL', body: 'Telepon 20 menit. Satu outlet, tiga kasir.', daysAgo: 18 },
        { kind: 'NOTE', body: 'Anggaran tidak mencukupi nilai proyek minimum.', daysAgo: 16 },
      ],
    },
  },
  {
    seed: 105,
    categorySlug: 'pos',
    presetSlug: 'pos-growth',
    name: 'POS Jaringan Apotek Sehat',
    platform: 'WEB_PWA',
    deployment: 'OUR_CLOUD',
    userTier: 'T50',
    customRequests: [
      {
        name: 'Pencatatan resep dokter dan obat keras',
        problem:
          'Penjualan obat keras wajib mencatat data resep dan dokter penulisnya. Sekarang dicatat di buku terpisah dan sering tidak cocok dengan transaksi kasir saat diperiksa.',
        userRoles: 'Apoteker penanggung jawab dan asisten apoteker',
        flowSteps: [
          'Kasir menandai transaksi berisi obat keras',
          'Sistem meminta nomor resep, nama dokter, dan nama pasien',
          'Data resep tersimpan menempel pada transaksi tersebut',
          'Laporan penjualan obat keras dapat dicetak per periode untuk pemeriksaan',
        ],
        priority: 'MUST_HAVE',
        status: 'IN_REVIEW',
        slaHoursFromNow: 2,
      },
    ],
    lead: {
      contactName: 'Dewi Lestari',
      company: 'Apotek Sehat Bersama',
      email: 'dewi@apoteksehat.co.id',
      whatsapp: '0811-2233-4455',
      budgetBand: 'B100_250',
      stage: 'IN_REVIEW',
      ownerRole: 'CONSULTANT',
      createdDaysAgo: 1,
      note: 'Tujuh outlet apotek di Bandung dan sekitarnya.',
    },
  },
  {
    seed: 106,
    categorySlug: 'crm',
    presetSlug: 'crm-starter',
    name: 'CRM Agen Properti Cemerlang',
    platform: 'WEB',
    userTier: 'T10',
    lead: {
      contactName: 'Rizal Fahmi',
      company: 'Cemerlang Property',
      email: 'rizal@cemerlangproperty.com',
      whatsapp: '0821-4455-6677',
      budgetBand: 'B50_100',
      stage: 'NEW',
      ownerRole: 'SALES',
      createdDaysAgo: 0,
    },
  },
];

export async function seedDemo(
  db: PrismaClient,
  pricingRuleId: string,
  byRole: Map<string, { id: string }>,
): Promise<void> {
  const ruleRow = await db.pricingRule.findUniqueOrThrow({ where: { id: pricingRuleId } });
  const rule = toPricingRuleSnapshot(ruleRow);

  const salesId = byRole.get('SALES')!.id;
  const consultantId = byRole.get('CONSULTANT')!.id;
  const pmId = byRole.get('PM')!.id;
  const clientId = byRole.get('CLIENT')!.id;

  let created = 0;

  for (const spec of DEMO_CONFIGS) {
    const category = await db.applicationCategory.findUnique({
      where: { slug: spec.categorySlug },
      include: {
        features: { where: { status: 'PUBLISHED' }, include: { group: true } },
        presets: { include: { presetFeatures: true } },
      },
    });
    if (!category) continue;

    const featureBySlug = new Map(category.features.map((f) => [f.slug, f] as const));
    const preset = spec.presetSlug
      ? category.presets.find((p) => p.slug === spec.presetSlug)
      : category.presets.find((p) => p.isDefault);

    const dependencyRows = await db.featureDependency.findMany({
      where: { featureId: { in: category.features.map((f) => f.id) } },
    });

    const graph = buildDependencyGraph(
      category.features.map((f) => ({
        id: f.id,
        name: f.name,
        type: f.type as 'CORE' | 'STANDARD' | 'CONFIGURABLE',
        groupId: f.groupId,
        isEssential: f.isEssential,
      })),
      dependencyRows.map((d) => ({
        featureId: d.featureId,
        targetFeatureId: d.targetFeatureId,
        kind: d.kind as 'REQUIRES' | 'CONFLICTS_WITH' | 'RECOMMENDS',
        note: d.note,
      })),
    );

    const requested = new Set(preset?.presetFeatures.map((pf) => pf.featureId) ?? []);
    for (const slug of spec.extraFeatureSlugs ?? []) {
      const feature = featureBySlug.get(slug);
      if (feature) requested.add(feature.id);
    }
    for (const slug of spec.removeFeatureSlugs ?? []) {
      const feature = featureBySlug.get(slug);
      if (feature) requested.delete(feature.id);
    }

    const enforced = enforceSelection(graph, requested);
    const selectedFeatures = category.features.filter((f) => enforced.selected.has(f.id));

    const addOns = spec.addOnSlugs?.length
      ? await db.addOn.findMany({ where: { slug: { in: spec.addOnSlugs } } })
      : [];

    const priceFeatures: PriceInputFeature[] = selectedFeatures.map((f) => ({
      id: f.id,
      name: f.name,
      type: f.type as PriceInputFeature['type'],
      manDayMin: f.manDayMin,
      manDayMax: f.manDayMax,
      groupName: f.group.name,
    }));

    const priceCustoms: PriceInputCustom[] = (spec.customRequests ?? []).map((c, i) => ({
      id: `demo-custom-${spec.seed}-${i}`,
      name: c.name,
      isEstimated: c.status === 'ESTIMATED',
      manDayMin: c.manDayMin ?? null,
      manDayMax: c.manDayMax ?? null,
    }));

    const breakdown = computePrice({
      rule,
      features: priceFeatures,
      customRequests: priceCustoms,
      addOns: addOns.map((a) => ({
        id: a.id,
        name: a.name,
        kind: a.kind as 'INTEGRATION',
        priceMin: a.priceMin,
        priceMax: a.priceMax,
        manDayMin: a.manDayMin,
        manDayMax: a.manDayMax,
        isRecurring: a.isRecurring,
      })),
      platform: spec.platform ?? 'WEB',
      deployment: spec.deployment ?? 'OUR_CLOUD',
      userTier: spec.userTier ?? 'T50',
    });

    const submittedAt = daysAgo(spec.lead.createdDaysAgo);
    const isDraftLead = spec.lead.stage === 'NEW' && spec.lead.createdDaysAgo === 0;

    const configuration = await db.configuration.create({
      data: {
        publicToken: makeToken(spec.seed),
        categoryId: category.id,
        presetId: preset?.id ?? null,
        pricingRuleId,
        ownerId: spec.lead.email === 'budi@sumberrejeki.co.id' ? clientId : null,
        name: spec.name,
        status: spec.becomesProject
          ? 'CONVERTED'
          : priceCustoms.some((c) => !c.isEstimated)
            ? 'AWAITING_CUSTOM_ESTIMATE'
            : 'SUBMITTED',
        source: 'PRESET',
        platform: spec.platform ?? 'WEB',
        deployment: spec.deployment ?? 'OUR_CLOUD',
        userTier: spec.userTier ?? 'T50',
        projectOptionsCompleted: true,
        subtotalMin: breakdown.featuresSubtotalMin,
        subtotalMax: breakdown.featuresSubtotalMax,
        discountPct: breakdown.discountPct,
        discountMin: breakdown.discountMin,
        discountMax: breakdown.discountMax,
        addOnMin: breakdown.addOnOneTimeMin,
        addOnMax: breakdown.addOnOneTimeMax,
        setupFee: breakdown.setupFee,
        totalMin: breakdown.totalMin,
        totalMax: breakdown.totalMax,
        recurringMonthlyMin: breakdown.recurringMonthlyMin,
        recurringMonthlyMax: breakdown.recurringMonthlyMax,
        durationWeeksMin: breakdown.duration.weeksMin,
        durationWeeksMax: breakdown.duration.weeksMax,
        cogsProjection: breakdown.internal.cogsProjection,
        grossMarginPct: breakdown.internal.grossMarginPct,
        realEffortManDay: breakdown.internal.realEffortManDayMax,
        customSharePct: breakdown.customSharePct,
        belowMinProjectValue: breakdown.guardrails.some((g) => g.code === 'BELOW_MIN_PROJECT_VALUE'),
        exceedsCustomShare: breakdown.guardrails.some((g) => g.code === 'EXCEEDS_CUSTOM_SHARE'),
        belowMinMargin: breakdown.guardrails.some((g) => g.code === 'BELOW_MIN_MARGIN'),
        guardrailNotes: stringifyJson(
          breakdown.guardrails.filter((g) => g.blocking).map((g) => g.internalMessage),
        ),
        timeSpentSeconds: 380 + (spec.seed % 7) * 95,
        trafficSource: ['organik', 'google-ads', 'referral', 'linkedin'][spec.seed % 4],
        submittedAt: isDraftLead ? submittedAt : submittedAt,
        createdAt: daysAgo(spec.lead.createdDaysAgo + 1),
        items: {
          create: selectedFeatures.map((feature, index) => {
            const line = breakdown.lines.find((l) => l.id === feature.id);
            return {
              featureId: feature.id,
              origin: feature.type === 'CORE' ? 'CORE_AUTO' : 'PRESET',
              nameSnapshot: feature.name,
              typeSnapshot: feature.type,
              manDayMin: feature.manDayMin,
              manDayMax: feature.manDayMax,
              unitPriceMin: line?.priceMin ?? 0,
              unitPriceMax: line?.priceMax ?? 0,
              effortManDay: line?.effortManDayMax ?? 0,
              sortOrder: index,
            };
          }),
        },
        addOns: {
          create: addOns.map((a) => ({
            addOnId: a.id,
            nameSnapshot: a.name,
            kindSnapshot: a.kind,
            priceMin: a.priceMin,
            priceMax: a.priceMax,
            isRecurring: a.isRecurring,
            manDayMin: a.manDayMin,
            manDayMax: a.manDayMax,
          })),
        },
        priceSnapshots: {
          create: {
            pricingRuleId,
            reason: 'SUBMIT',
            payload: stringifyJson(breakdown),
            totalMin: breakdown.totalMin,
            totalMax: breakdown.totalMax,
          },
        },
        revisions: {
          create: [
            {
              version: 1,
              action: 'PRESET_APPLIED',
              summary: `Preset ${preset?.name ?? 'bawaan'} diterapkan`,
              detail: stringifyJson({ preset: preset?.slug }),
              totalMin: breakdown.totalMin,
              totalMax: breakdown.totalMax,
            },
            {
              version: 2,
              action: 'SUBMITTED',
              summary: 'Konfigurasi dikirim',
              detail: stringifyJson({}),
              totalMin: breakdown.totalMin,
              totalMax: breakdown.totalMax,
            },
          ],
        },
      },
    });

    for (const [index, request] of (spec.customRequests ?? []).entries()) {
      await db.customFeatureRequest.create({
        data: {
          configurationId: configuration.id,
          name: request.name,
          problem: request.problem,
          userRoles: request.userRoles,
          flowSteps: stringifyJson(request.flowSteps),
          priority: request.priority,
          status: request.status,
          manDayMin: request.manDayMin ?? null,
          manDayMax: request.manDayMax ?? null,
          unitPriceMin: request.manDayMin
            ? Math.round(request.manDayMin * rule.referenceRatePerManDay * rule.multiplierCustom)
            : null,
          unitPriceMax: request.manDayMax
            ? Math.round(request.manDayMax * rule.referenceRatePerManDay * rule.multiplierCustom)
            : null,
          riskLevel: request.riskLevel ?? null,
          internalNote: request.internalNote ?? null,
          clarificationQuestion: request.clarificationQuestion ?? null,
          reviewerId:
            request.status === 'PENDING' ? null : consultantId,
          slaDueAt: hoursFromNow(request.slaHoursFromNow),
          estimatedAt: request.status === 'ESTIMATED' ? daysAgo(1) : null,
          createdAt: daysAgo(spec.lead.createdDaysAgo, index),
        },
      });
    }

    const ownerId = spec.lead.ownerRole === 'SALES' ? salesId : consultantId;
    const year = submittedAt.getFullYear();
    const lead = await db.lead.create({
      data: {
        quoteNumber: `RKT-${year}-${String(created + 1).padStart(4, '0')}`,
        configurationId: configuration.id,
        contactName: spec.lead.contactName,
        company: spec.lead.company,
        email: spec.lead.email,
        whatsapp: spec.lead.whatsapp,
        budgetBand: spec.lead.budgetBand,
        note: spec.lead.note ?? null,
        stage: spec.lead.stage,
        ownerId,
        lostReason: spec.lead.lostReason ?? null,
        lostNote: spec.lead.lostNote ?? null,
        needsDeepDiscovery: breakdown.guardrails.some((g) => g.code === 'EXCEEDS_CUSTOM_SHARE'),
        validUntil: new Date(submittedAt.getTime() + rule.quoteValidityDays * 86_400_000),
        discoveryCallAt:
          spec.lead.stage === 'DISCOVERY_SCHEDULED' ? hoursFromNow(52) : null,
        trafficSource: ['organik', 'google-ads', 'referral', 'linkedin'][spec.seed % 4],
        marketingConsent: spec.seed % 2 === 0,
        createdAt: submittedAt,
        activities: {
          create: [
            {
              kind: 'SYSTEM',
              body:
                `Konfigurasi dikirim dari konfigurator. Nilai Rp ${Math.round(breakdown.totalMin / 1e6)} – ` +
                `${Math.round(breakdown.totalMax / 1e6)} juta, proyeksi gross margin ` +
                `${(breakdown.internal.grossMarginPct * 100).toFixed(1)}%.`,
              createdAt: submittedAt,
            },
            ...(spec.lead.activities ?? []).map((activity) => ({
              kind: activity.kind,
              body: activity.body,
              userId: ownerId,
              createdAt: daysAgo(activity.daysAgo),
            })),
          ],
        },
      },
    });

    if (spec.becomesProject) {
      await createDemoProject(db, {
        spec,
        configurationId: configuration.id,
        leadId: lead.id,
        clientId,
        pmId,
        selectedFeatures,
        totalValue: breakdown.totalMax,
      });
    }

    await seedDemoEvents(db, spec, configuration.id, breakdown.totalMin, breakdown.totalMax);
    created += 1;
  }

  await seedFunnelNoise(db);
  await seedConsultations(db);

  console.log(`✓ ${created} konfigurasi contoh, lead, proyek, dan jejak analitik dibuat.`);
}

async function createDemoProject(
  db: PrismaClient,
  args: {
    spec: DemoConfigSpec;
    configurationId: string;
    leadId: string;
    clientId: string;
    pmId: string;
    selectedFeatures: Array<{
      id: string;
      name: string;
      manDayMin: number;
      manDayMax: number;
      type: string;
    }>;
    totalValue: number;
  },
): Promise<void> {
  const { spec, selectedFeatures } = args;
  const info = spec.becomesProject!;
  const startDate = daysAgo(info.startedDaysAgo);
  const targetEndDate = new Date(startDate.getTime() + info.durationWeeks * 7 * 86_400_000);

  const project = await db.project.create({
    data: {
      code: info.code,
      name: info.name,
      configurationId: args.configurationId,
      leadId: args.leadId,
      clientId: args.clientId,
      managerId: args.pmId,
      status: info.status,
      startDate,
      targetEndDate,
      contractValue: args.totalValue,
      stagingUrl: 'https://staging.rakit.id/sumber-rejeki',
      demoUrl: 'https://demo.rakit.id/sumber-rejeki',
    },
  });

  // Satu fitur = satu item pekerjaan (P1).
  const phases = ['Fase 1 — Fondasi', 'Fase 2 — Operasional', 'Fase 3 — Laporan & Integrasi'];
  const statuses = ['DONE', 'DONE', 'APPROVED', 'READY_FOR_REVIEW', 'IN_PROGRESS', 'QUEUED'];

  for (const [index, feature] of selectedFeatures.entries()) {
    const phase = phases[Math.min(phases.length - 1, Math.floor(index / Math.ceil(selectedFeatures.length / 3)))];
    const status = statuses[Math.min(statuses.length - 1, Math.floor((index / selectedFeatures.length) * statuses.length))];
    const estimate = (feature.manDayMin + feature.manDayMax) / 2;

    // Man-day aktual hanya diisi untuk pekerjaan yang sudah selesai, dengan
    // deviasi yang bervariasi agar laporan varians (P5) punya isi nyata.
    const isFinished = status === 'DONE' || status === 'APPROVED';
    const deviation = [0.92, 1.05, 1.18, 0.98, 1.35, 1.02][index % 6];

    await db.projectTask.create({
      data: {
        projectId: project.id,
        featureId: feature.id,
        title: feature.name,
        status,
        phase,
        assigneeId: args.pmId,
        estimateManDayMin: feature.manDayMin,
        estimateManDayMax: feature.manDayMax,
        actualManDay: isFinished ? Number((estimate * deviation * 0.3).toFixed(2)) : null,
        targetDate: new Date(startDate.getTime() + (index + 1) * 2 * 86_400_000),
        completedAt: isFinished ? daysAgo(info.startedDaysAgo - index) : null,
        approvedAt: status === 'APPROVED' ? daysAgo(info.startedDaysAgo - index - 1) : null,
        sortOrder: index,
      },
    });
  }

  // Termin pembayaran mengikuti milestone (H4).
  const milestones = [
    { name: 'Kickoff & Uang Muka', percentage: 30, status: 'APPROVED', offsetDays: 0 },
    { name: 'Serah Terima Fase 1', percentage: 40, status: 'AWAITING_APPROVAL', offsetDays: 28 },
    { name: 'Go-Live & Serah Terima Akhir', percentage: 30, status: 'PENDING', offsetDays: 56 },
  ];

  for (const [index, milestone] of milestones.entries()) {
    const amount = Math.round((args.totalValue * milestone.percentage) / 100);
    const created = await db.milestone.create({
      data: {
        projectId: project.id,
        name: milestone.name,
        description:
          index === 0
            ? 'Penyelarasan proses, penetapan kriteria penerimaan, dan pembayaran uang muka.'
            : index === 1
              ? 'Modul master data, penerimaan, dan penyimpanan siap diuji di lingkungan staging.'
              : 'Seluruh modul berjalan di lingkungan produksi dan tim Anda sudah dilatih.',
        sortOrder: index,
        percentage: milestone.percentage,
        amount,
        dueDate: new Date(startDate.getTime() + milestone.offsetDays * 86_400_000),
        status: milestone.status,
        approvedAt: milestone.status === 'APPROVED' ? daysAgo(info.startedDaysAgo - 1) : null,
      },
    });

    const invoiceStatus = index === 0 ? 'PAID' : index === 1 ? 'SENT' : 'DRAFT';
    const taxAmount = Math.round(amount * 0.11);
    const invoice = await db.invoice.create({
      data: {
        number: `INV-${startDate.getFullYear()}-${String(index + 1).padStart(4, '0')}`,
        projectId: project.id,
        milestoneId: created.id,
        kind: index === 0 ? 'DOWN_PAYMENT' : 'MILESTONE',
        status: invoiceStatus,
        subtotal: amount,
        taxPct: 11,
        taxAmount,
        total: amount + taxAmount,
        paidAmount: invoiceStatus === 'PAID' ? amount + taxAmount : 0,
        issuedAt: new Date(startDate.getTime() + milestone.offsetDays * 86_400_000),
        dueAt: new Date(startDate.getTime() + (milestone.offsetDays + 14) * 86_400_000),
        paidAt: invoiceStatus === 'PAID' ? daysAgo(info.startedDaysAgo - 2) : null,
      },
    });

    if (invoiceStatus === 'PAID') {
      await db.payment.create({
        data: {
          invoiceId: invoice.id,
          amount: amount + taxAmount,
          method: 'MANUAL_TRANSFER',
          status: 'SETTLED',
          reference: 'TRF/2026/00381',
          paidAt: daysAgo(info.startedDaysAgo - 2),
          verifiedAt: daysAgo(info.startedDaysAgo - 2),
        },
      });
    }
  }

  await db.projectDocument.createMany({
    data: [
      { projectId: project.id, name: 'Kontrak Kerja Sama.pdf', kind: 'CONTRACT', url: '#', sizeLabel: '412 KB' },
      { projectId: project.id, name: 'Scope of Work.pdf', kind: 'SOW', url: '#', sizeLabel: '286 KB' },
      { projectId: project.id, name: 'Penawaran RKT-2026-0001.pdf', kind: 'PROPOSAL', url: '#', sizeLabel: '198 KB' },
      { projectId: project.id, name: 'Panduan Pengguna Gudang.pdf', kind: 'MANUAL', url: '#', sizeLabel: '1,2 MB' },
    ],
  });

  // Diskusi menempel pada item pekerjaan, bukan tercecer di WhatsApp (J6).
  const firstTask = await db.projectTask.findFirst({
    where: { projectId: project.id, status: 'READY_FOR_REVIEW' },
  });
  if (firstTask) {
    await db.discussionMessage.createMany({
      data: [
        {
          taskId: firstTask.id,
          authorLabel: 'Aldi Rahmatullah (PM)',
          body: 'Fitur ini sudah bisa dicoba di staging. Mohon cek alur pencetakan surat jalannya.',
          createdAt: daysAgo(3),
        },
        {
          taskId: firstTask.id,
          authorLabel: 'Budi Santoso (Klien)',
          body: 'Sudah dicoba. Nomor surat jalan bagus, tapi kolom nama sopir belum ada. Bisa ditambahkan?',
          createdAt: daysAgo(2),
        },
        {
          taskId: firstTask.id,
          authorLabel: 'Aldi Rahmatullah (PM)',
          body: 'Bisa, itu masih di dalam ruang lingkup. Kami tambahkan besok dan kabari lagi.',
          createdAt: daysAgo(2),
        },
      ],
    });
  }

  // Progres keseluruhan dihitung dari bobot status tiap pekerjaan.
  const tasks = await db.projectTask.findMany({
    where: { projectId: project.id },
    select: { status: true },
  });
  const weights: Record<string, number> = {
    QUEUED: 0, IN_PROGRESS: 0.4, READY_FOR_REVIEW: 0.75, APPROVED: 0.95, DONE: 1,
  };
  const progress =
    tasks.length > 0
      ? (tasks.reduce((sum, t) => sum + (weights[t.status] ?? 0), 0) / tasks.length) * 100
      : 0;

  await db.project.update({
    where: { id: project.id },
    data: { progressPct: Number(progress.toFixed(1)) },
  });
}

async function seedDemoEvents(
  db: PrismaClient,
  spec: DemoConfigSpec,
  configurationId: string,
  totalMin: number,
  totalMax: number,
): Promise<void> {
  const sessionId = `demo-${spec.seed}`;
  const base = spec.lead.createdDaysAgo + 1;
  const events: Array<{ name: string; payload: Record<string, unknown>; minutesOffset: number }> = [
    { name: 'page_view_landing', payload: {}, minutesOffset: 0 },
    { name: 'category_selected', payload: { category: spec.categorySlug }, minutesOffset: 1 },
    {
      name: 'configurator_opened',
      payload: { category: spec.categorySlug, source: 'preset' },
      minutesOffset: 2,
    },
    { name: 'price_explainer_opened', payload: {}, minutesOffset: 4 },
    {
      name: 'summary_viewed',
      payload: { total_min: totalMin, total_max: totalMax, feature_count: 20 },
      minutesOffset: 9,
    },
    { name: 'lead_form_started', payload: { total_min: totalMin, total_max: totalMax }, minutesOffset: 10 },
    {
      name: 'configuration_submitted',
      payload: {
        total_min: totalMin,
        total_max: totalMax,
        feature_count: 20,
        custom_count: spec.customRequests?.length ?? 0,
      },
      minutesOffset: 12,
    },
  ];

  if (spec.lead.stage === 'DISCOVERY_SCHEDULED' || spec.lead.stage === 'WON') {
    events.push({ name: 'call_scheduled', payload: {}, minutesOffset: 14 });
  }
  events.push({ name: 'proposal_downloaded', payload: {}, minutesOffset: 13 });

  await db.analyticsEvent.createMany({
    data: events.map((event) => ({
      name: event.name,
      sessionId,
      configurationId,
      payload: stringifyJson(event.payload),
      path: '/rakit',
      createdAt: new Date(daysAgo(base).getTime() + event.minutesOffset * 60_000),
    })),
  });
}

/**
 * Jejak pengunjung yang tidak sampai mengirim konfigurasi.
 *
 * Tanpa data ini corong konversi tampak sempurna 100% di setiap tahap, yang
 * justru menyembunyikan gunanya papan analitik.
 */
async function seedFunnelNoise(db: PrismaClient): Promise<void> {
  const rows: Array<{
    name: string;
    sessionId: string;
    payload: string;
    path: string;
    createdAt: Date;
  }> = [];

  const categories = ['wms', 'crm', 'pos'];
  const abandonSteps = ['konfigurator', 'konfigurasi-proyek', 'ringkasan', 'formulir-kontak'];

  for (let i = 0; i < 220; i += 1) {
    const sessionId = `visit-${i}`;
    const day = i % 28;
    const at = (minutes: number) => new Date(daysAgo(day).getTime() + minutes * 60_000);

    rows.push({
      name: 'page_view_landing',
      sessionId,
      payload: stringifyJson({}),
      path: '/',
      createdAt: at(0),
    });

    // ~42% memilih kategori.
    if (i % 100 >= 58) continue;
    const category = categories[i % 3];
    rows.push({
      name: 'category_selected',
      sessionId,
      payload: stringifyJson({ category }),
      path: '/aplikasi',
      createdAt: at(1),
    });

    // ~68% dari itu masuk konfigurator.
    if (i % 100 >= 40) continue;
    rows.push({
      name: 'configurator_opened',
      sessionId,
      payload: stringifyJson({ category, source: i % 3 === 0 ? 'wizard' : 'preset' }),
      path: '/rakit',
      createdAt: at(2),
    });

    // Sebagian besar berhenti di sini — inilah yang harus terlihat di papan.
    if (i % 100 >= 16) {
      const step = abandonSteps[i % abandonSteps.length];
      const cartValue = [28_000_000, 64_000_000, 112_000_000, 186_000_000, 340_000_000][i % 5];
      rows.push({
        name: 'configuration_abandoned',
        sessionId,
        payload: stringifyJson({
          last_step: step,
          cart_total_min: cartValue,
          time_spent: 180 + (i % 11) * 90,
        }),
        path: '/rakit',
        createdAt: at(3 + (i % 9)),
      });
      continue;
    }

    rows.push({
      name: 'summary_viewed',
      sessionId,
      payload: stringifyJson({
        total_min: 90_000_000,
        total_max: 132_000_000,
        feature_count: 22,
      }),
      path: '/rakit',
      createdAt: at(8),
    });
  }

  await db.analyticsEvent.createMany({ data: rows });
}

async function seedConsultations(db: PrismaClient): Promise<void> {
  await db.consultationRequest.createMany({
    data: [
      {
        name: 'Hendra Gunawan',
        company: 'PT Karya Bangun Sentosa',
        email: 'hendra@karyabangun.co.id',
        whatsapp: '0815-2233-4455',
        topic: 'OTHER_APP',
        message:
          'Kami butuh aplikasi manajemen proyek konstruksi: progres per item pekerjaan, opname lapangan, dan penagihan termin. Apakah bisa dibuatkan?',
        status: 'NEW',
        createdAt: daysAgo(2),
      },
      {
        name: 'Lina Marlina',
        company: 'Toko Bangunan Jaya Abadi',
        email: 'lina@jayaabadi.id',
        whatsapp: '0819-7788-9900',
        topic: 'UNSURE',
        message:
          'Toko material bangunan, tiga cabang. Belum tahu butuh kasir atau sistem gudang. Bisa dibantu memilih?',
        status: 'CONTACTED',
        createdAt: daysAgo(6),
      },
      {
        name: 'Fajar Ramadhan',
        company: 'Bengkel Motor Sahabat',
        email: 'fajar@bengkelsahabat.id',
        whatsapp: '0822-3344-5566',
        topic: 'BELOW_MIN_VALUE',
        message:
          'Rakitan saya keluar di bawah proyek minimum. Apakah ada opsi yang lebih terjangkau untuk usaha kecil?',
        status: 'NEW',
        createdAt: daysAgo(1),
      },
    ],
  });
}
