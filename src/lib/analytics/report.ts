import 'server-only';

import { prisma } from '@/lib/db/prisma';
import { parseJson } from '@/lib/db/json';
import { FUNNEL_STAGES } from './events';

export interface FunnelRow {
  key: string;
  label: string;
  count: number;
  /** Konversi dari tahap sebelumnya. */
  conversionRate: number | null;
  target: number | null;
  targetLabel?: string;
  meetsTarget: boolean | null;
  dropOff: number;
}

function sinceDate(days: number): Date {
  return new Date(Date.now() - days * 86_400_000);
}

/** Corong konversi dengan angka drop-off per tahap (Q1). */
export async function buildFunnel(days = 30): Promise<FunnelRow[]> {
  const since = sinceDate(days);
  const grouped = await prisma.analyticsEvent.groupBy({
    by: ['name'],
    where: { createdAt: { gte: since } },
    _count: { _all: true },
  });

  const counts = new Map(grouped.map((g) => [g.name, g._count._all]));
  const rows: FunnelRow[] = [];
  let previous: number | null = null;

  for (const stage of FUNNEL_STAGES) {
    const count = counts.get(stage.event) ?? 0;
    const conversionRate = previous && previous > 0 ? count / previous : null;
    rows.push({
      key: stage.key,
      label: stage.label,
      count,
      conversionRate,
      target: stage.target,
      targetLabel: 'targetLabel' in stage ? stage.targetLabel : undefined,
      meetsTarget:
        stage.target !== null && conversionRate !== null ? conversionRate >= stage.target : null,
      dropOff: previous !== null ? Math.max(0, previous - count) : 0,
    });
    previous = count;
  }

  return rows;
}

/** Fitur paling sering dipilih dan paling sering dihapus (Q2). */
export async function featureMovement(days = 30, limit = 10) {
  const since = sinceDate(days);
  const events = await prisma.analyticsEvent.findMany({
    where: { name: { in: ['feature_added', 'feature_removed'] }, createdAt: { gte: since } },
    select: { name: true, payload: true },
  });

  const added = new Map<string, number>();
  const removed = new Map<string, number>();

  for (const event of events) {
    const payload = parseJson<{ feature_id?: string; reason?: string }>(event.payload, {});
    if (!payload.feature_id) continue;
    const target = event.name === 'feature_added' ? added : removed;
    // Penghapusan akibat cascade bukan penilaian klien atas nilai fitur.
    if (event.name === 'feature_removed' && payload.reason && payload.reason !== 'manual') continue;
    target.set(payload.feature_id, (target.get(payload.feature_id) ?? 0) + 1);
  }

  const ids = [...new Set([...added.keys(), ...removed.keys()])];
  const features = await prisma.feature.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, type: true, category: { select: { shortName: true } } },
  });
  const index = new Map(features.map((f) => [f.id, f] as const));

  const toRows = (map: Map<string, number>) =>
    [...map.entries()]
      .map(([id, count]) => ({
        featureId: id,
        name: index.get(id)?.name ?? '(fitur dihapus dari katalog)',
        type: index.get(id)?.type ?? 'STANDARD',
        category: index.get(id)?.category.shortName ?? '—',
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

  return { mostAdded: toRows(added), mostRemoved: toRows(removed) };
}

/** Titik pengabaian di konfigurator: di harga berapa klien pergi (Q6). */
export async function abandonmentPoints(days = 30) {
  const since = sinceDate(days);
  const events = await prisma.analyticsEvent.findMany({
    where: { name: 'configuration_abandoned', createdAt: { gte: since } },
    select: { payload: true },
  });

  const byStep = new Map<string, { count: number; totalValue: number; totalTime: number }>();
  const buckets = [
    { label: '< Rp 35 jt', max: 35_000_000, count: 0 },
    { label: 'Rp 35 – 75 jt', max: 75_000_000, count: 0 },
    { label: 'Rp 75 – 150 jt', max: 150_000_000, count: 0 },
    { label: 'Rp 150 – 300 jt', max: 300_000_000, count: 0 },
    { label: '> Rp 300 jt', max: Infinity, count: 0 },
  ];

  for (const event of events) {
    const payload = parseJson<{
      last_step?: string;
      cart_total_min?: number;
      time_spent?: number;
    }>(event.payload, {});
    const step = payload.last_step ?? 'tidak diketahui';
    const entry = byStep.get(step) ?? { count: 0, totalValue: 0, totalTime: 0 };
    entry.count += 1;
    entry.totalValue += payload.cart_total_min ?? 0;
    entry.totalTime += payload.time_spent ?? 0;
    byStep.set(step, entry);

    const value = payload.cart_total_min ?? 0;
    const bucket = buckets.find((b) => value < b.max);
    if (bucket) bucket.count += 1;
  }

  return {
    total: events.length,
    bySteps: [...byStep.entries()]
      .map(([step, data]) => ({
        step,
        count: data.count,
        avgValue: data.count > 0 ? Math.round(data.totalValue / data.count) : 0,
        avgTimeSeconds: data.count > 0 ? Math.round(data.totalTime / data.count) : 0,
      }))
      .sort((a, b) => b.count - a.count),
    byValueBucket: buckets,
  };
}

/** Distribusi nilai konfigurasi (Q4). */
export async function configurationValueDistribution() {
  const configurations = await prisma.configuration.findMany({
    where: { status: { not: 'DRAFT' } },
    select: { totalMax: true, grossMarginPct: true, customSharePct: true },
  });

  const buckets = [
    { label: '< Rp 50 jt', min: 0, max: 50_000_000, count: 0 },
    { label: 'Rp 50 – 100 jt', min: 50_000_000, max: 100_000_000, count: 0 },
    { label: 'Rp 100 – 200 jt', min: 100_000_000, max: 200_000_000, count: 0 },
    { label: 'Rp 200 – 400 jt', min: 200_000_000, max: 400_000_000, count: 0 },
    { label: '> Rp 400 jt', min: 400_000_000, max: Infinity, count: 0 },
  ];

  for (const config of configurations) {
    const bucket = buckets.find((b) => config.totalMax >= b.min && config.totalMax < b.max);
    if (bucket) bucket.count += 1;
  }

  const total = configurations.length;
  const avgMargin =
    total > 0 ? configurations.reduce((sum, c) => sum + c.grossMarginPct, 0) / total : 0;
  const avgCustomShare =
    total > 0 ? configurations.reduce((sum, c) => sum + c.customSharePct, 0) / total : 0;

  return { buckets, total, avgMargin, avgCustomShare };
}

/**
 * Metrik kesehatan produk (PRD 4.3) — dipakai sebagai baris teratas dashboard
 * agar tim melihat sinyal masalah sebelum tersembunyi di balik angka corong.
 */
export async function healthMetrics(days = 30) {
  const since = sinceDate(days);

  const [submitted, withCustom, allConfigs, customRequests, projects] = await Promise.all([
    prisma.configuration.findMany({
      where: { submittedAt: { gte: since } },
      select: {
        timeSpentSeconds: true,
        totalMin: true,
        totalMax: true,
        grossMarginPct: true,
        customSharePct: true,
        _count: { select: { items: true, customRequests: true } },
      },
    }),
    prisma.configuration.count({
      where: { submittedAt: { gte: since }, customRequests: { some: {} } },
    }),
    prisma.configuration.count({ where: { createdAt: { gte: since } } }),
    prisma.customFeatureRequest.findMany({
      where: { createdAt: { gte: since } },
      select: { slaDueAt: true, estimatedAt: true, status: true },
    }),
    prisma.projectTask.findMany({
      where: { actualManDay: { not: null } },
      select: { estimateManDayMin: true, estimateManDayMax: true, actualManDay: true },
    }),
  ]);

  const submittedCount = submitted.length;

  const avgTimeToSubmit =
    submittedCount > 0
      ? submitted.reduce((sum, c) => sum + c.timeSpentSeconds, 0) / submittedCount
      : 0;

  const avgRangeRatio =
    submittedCount > 0
      ? submitted.reduce((sum, c) => sum + (c.totalMin > 0 ? c.totalMax / c.totalMin : 1), 0) /
        submittedCount
      : 1;

  const avgMargin =
    submittedCount > 0
      ? submitted.reduce((sum, c) => sum + c.grossMarginPct, 0) / submittedCount
      : 0;

  const avgCustomShare =
    submittedCount > 0
      ? submitted.reduce((sum, c) => sum + c.customSharePct, 0) / submittedCount
      : 0;

  const avgFeatureCount =
    submittedCount > 0
      ? submitted.reduce((sum, c) => sum + c._count.items, 0) / submittedCount
      : 0;

  const resolvedRequests = customRequests.filter((r) => r.estimatedAt !== null);
  const slaMet = resolvedRequests.filter((r) => r.estimatedAt! <= r.slaDueAt).length;

  const varianceSamples = projects.filter((t) => t.actualManDay !== null);
  const avgDeviation =
    varianceSamples.length > 0
      ? varianceSamples.reduce((sum, task) => {
          const estimate = (task.estimateManDayMin + task.estimateManDayMax) / 2;
          if (estimate <= 0) return sum;
          return sum + Math.abs(task.actualManDay! - estimate) / estimate;
        }, 0) / varianceSamples.length
      : null;

  return {
    // Target ≤ 12 menit — friksi di konfigurator.
    avgTimeToSubmitSeconds: Math.round(avgTimeToSubmit),
    avgTimeTarget: 12 * 60,
    // Target ≤ 40% — kelengkapan katalog.
    customConfigShare: submittedCount > 0 ? withCustom / submittedCount : 0,
    customConfigShareTarget: 0.4,
    // Target ≤ 1,35 — kualitas estimasi.
    avgRangeRatio,
    avgRangeRatioTarget: 1.35,
    // Target 50–55% — kesehatan harga.
    avgMargin,
    marginTargetMin: 0.5,
    marginTargetMax: 0.55,
    // Target ≤ 40% — risiko margin dan kapasitas tim.
    avgCustomShare,
    avgCustomShareTarget: 0.4,
    // Target ≥ 95% — kapasitas tim.
    slaComplianceRate: resolvedRequests.length > 0 ? slaMet / resolvedRequests.length : null,
    slaTarget: 0.95,
    // Target ≤ 70% — sticker shock / kebingungan.
    abandonmentRate: allConfigs > 0 ? 1 - submittedCount / allConfigs : 0,
    abandonmentTarget: 0.7,
    // Diharapkan naik dari waktu ke waktu — efektivitas preset & rekomendasi.
    avgFeatureCount,
    // Target ≤ 15% — kalibrasi katalog.
    avgEstimateDeviation: avgDeviation,
    avgEstimateDeviationTarget: 0.15,
    submittedCount,
    createdCount: allConfigs,
  };
}

/**
 * North Star Metric (PRD 4.1): jumlah konfigurasi terkualifikasi per bulan —
 * dikirim dengan kontak valid dan nilai estimasi ≥ Rp 25 juta.
 */
export async function northStarMetric(months = 6) {
  const since = new Date();
  since.setMonth(since.getMonth() - months);

  const leads = await prisma.lead.findMany({
    where: { createdAt: { gte: since } },
    select: {
      createdAt: true,
      email: true,
      configuration: { select: { totalMin: true, totalMax: true } },
    },
  });

  const byMonth = new Map<string, { qualified: number; total: number; value: number }>();

  for (const lead of leads) {
    const key = `${lead.createdAt.getFullYear()}-${String(lead.createdAt.getMonth() + 1).padStart(2, '0')}`;
    const entry = byMonth.get(key) ?? { qualified: 0, total: 0, value: 0 };
    entry.total += 1;
    const hasValidContact = /.+@.+\..+/.test(lead.email);
    if (hasValidContact && lead.configuration.totalMax >= 25_000_000) {
      entry.qualified += 1;
      entry.value += lead.configuration.totalMax;
    }
    byMonth.set(key, entry);
  }

  return [...byMonth.entries()]
    .map(([month, data]) => ({ month, ...data }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

/** Fitur custom paling sering diminta — antrean kandidat modul baru (Q3). */
export async function customDemandReport(days = 90) {
  const since = sinceDate(days);
  const requests = await prisma.customFeatureRequest.findMany({
    where: { createdAt: { gte: since } },
    select: {
      name: true,
      status: true,
      manDayMax: true,
      configuration: { select: { category: { select: { shortName: true } } } },
    },
  });

  const buckets = new Map<
    string,
    { label: string; category: string; count: number; promoted: number; avgManDay: number }
  >();

  for (const request of requests) {
    const key = request.name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const entry = buckets.get(key) ?? {
      label: request.name,
      category: request.configuration.category.shortName,
      count: 0,
      promoted: 0,
      avgManDay: 0,
    };
    entry.count += 1;
    if (request.status === 'PROMOTED') entry.promoted += 1;
    if (request.manDayMax) entry.avgManDay += request.manDayMax;
    buckets.set(key, entry);
  }

  return [...buckets.values()]
    .map((b) => ({ ...b, avgManDay: b.count > 0 ? Number((b.avgManDay / b.count).toFixed(1)) : 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);
}

/**
 * Laporan kalibrasi man-day referensi vs aktual per fitur (M9, P5, Q5).
 *
 * Setelah sekitar sepuluh proyek, data ini menjadi keunggulan estimasi yang
 * tidak dapat disalin kompetitor.
 */
export async function calibrationReport() {
  const tasks = await prisma.projectTask.findMany({
    where: { actualManDay: { not: null }, featureId: { not: null } },
    select: {
      featureId: true,
      actualManDay: true,
      estimateManDayMin: true,
      estimateManDayMax: true,
      feature: {
        select: {
          name: true,
          type: true,
          manDayMin: true,
          manDayMax: true,
          category: { select: { shortName: true } },
        },
      },
    },
  });

  const buckets = new Map<
    string,
    {
      featureId: string;
      name: string;
      type: string;
      category: string;
      refManDay: number;
      actualTotal: number;
      samples: number;
    }
  >();

  for (const task of tasks) {
    if (!task.featureId || !task.feature) continue;
    const entry = buckets.get(task.featureId) ?? {
      featureId: task.featureId,
      name: task.feature.name,
      type: task.feature.type,
      category: task.feature.category.shortName,
      refManDay: (task.feature.manDayMin + task.feature.manDayMax) / 2,
      actualTotal: 0,
      samples: 0,
    };
    entry.actualTotal += task.actualManDay!;
    entry.samples += 1;
    buckets.set(task.featureId, entry);
  }

  return [...buckets.values()]
    .map((b) => {
      const actualAvg = b.actualTotal / b.samples;
      const deviation = b.refManDay > 0 ? (actualAvg - b.refManDay) / b.refManDay : 0;
      return {
        featureId: b.featureId,
        name: b.name,
        type: b.type,
        category: b.category,
        refManDay: Number(b.refManDay.toFixed(1)),
        actualManDay: Number(actualAvg.toFixed(1)),
        deviationPct: Number(deviation.toFixed(3)),
        samples: b.samples,
        /** Ditandai bila konsisten meleset lebih dari 15% (metrik 4.3). */
        needsRecalibration: Math.abs(deviation) > 0.15 && b.samples >= 2,
      };
    })
    .sort((a, b) => Math.abs(b.deviationPct) - Math.abs(a.deviationPct));
}
