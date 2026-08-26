/**
 * Mesin dependensi konfigurator (PRD C.3).
 *
 * Prinsip Produk #2: "Keranjang yang mustahil dibangun tidak boleh bisa dibuat."
 * Mesin ini karena itu bersifat wajib, bukan opsional, dan dijalankan identik
 * di klien (untuk umpan balik instan) maupun di server (sebagai penjaga
 * kebenaran sebelum data disimpan).
 *
 * Tiga relasi yang ditangani:
 *   REQUIRES        — prasyarat, ditambahkan otomatis secara transitif (C3.1)
 *   CONFLICTS_WITH  — saling meniadakan, yang lama dilepas (C3.2)
 *   RECOMMENDS      — saran halus, tidak pernah otomatis (C3.3)
 */

import type { DependencyKind, FeatureType } from '@/lib/domain/enums';

export interface DependencyEdge {
  featureId: string;
  targetFeatureId: string;
  kind: DependencyKind;
  note?: string | null;
}

export interface DependencyFeature {
  id: string;
  name: string;
  type: FeatureType;
  groupId: string;
  isEssential: boolean;
}

/** Graf dependensi yang sudah diindeks untuk penelusuran cepat. */
export interface DependencyGraph {
  features: Map<string, DependencyFeature>;
  /** featureId → daftar prasyarat yang dibutuhkannya. */
  requires: Map<string, string[]>;
  /** featureId → daftar fitur yang membutuhkannya (arah terbalik). */
  requiredBy: Map<string, string[]>;
  /** Konflik bersifat dua arah. */
  conflicts: Map<string, string[]>;
  recommends: Map<string, string[]>;
  notes: Map<string, string>;
}

function pushTo(map: Map<string, string[]>, key: string, value: string): void {
  const existing = map.get(key);
  if (existing) {
    if (!existing.includes(value)) existing.push(value);
  } else {
    map.set(key, [value]);
  }
}

function edgeKey(from: string, to: string, kind: DependencyKind): string {
  return `${kind}:${from}->${to}`;
}

export function buildDependencyGraph(
  features: DependencyFeature[],
  edges: DependencyEdge[],
): DependencyGraph {
  const graph: DependencyGraph = {
    features: new Map(features.map((f) => [f.id, f])),
    requires: new Map(),
    requiredBy: new Map(),
    conflicts: new Map(),
    recommends: new Map(),
    notes: new Map(),
  };

  for (const edge of edges) {
    // Abaikan sisi yang menunjuk ke fitur di luar katalog aktif.
    if (!graph.features.has(edge.featureId) || !graph.features.has(edge.targetFeatureId)) {
      continue;
    }
    if (edge.note) {
      graph.notes.set(edgeKey(edge.featureId, edge.targetFeatureId, edge.kind), edge.note);
    }
    switch (edge.kind) {
      case 'REQUIRES':
        pushTo(graph.requires, edge.featureId, edge.targetFeatureId);
        pushTo(graph.requiredBy, edge.targetFeatureId, edge.featureId);
        break;
      case 'CONFLICTS_WITH':
        // Konflik selalu simetris walau hanya didefinisikan satu arah.
        pushTo(graph.conflicts, edge.featureId, edge.targetFeatureId);
        pushTo(graph.conflicts, edge.targetFeatureId, edge.featureId);
        break;
      case 'RECOMMENDS':
        pushTo(graph.recommends, edge.featureId, edge.targetFeatureId);
        break;
    }
  }

  return graph;
}

// ---------------------------------------------------------------------------
// Deteksi dependensi melingkar (kriteria penerimaan modul L)
// ---------------------------------------------------------------------------

export interface CycleResult {
  hasCycle: boolean;
  /** Rantai fitur yang membentuk lingkaran, untuk pesan error yang jelas. */
  cycle: string[];
}

/**
 * Mendeteksi lingkaran pada relasi REQUIRES lewat DFS dengan pewarnaan.
 * Relasi melingkar membuat keranjang mustahil diselesaikan, sehingga sistem
 * wajib menolaknya saat admin menyimpan dependensi.
 */
export function detectRequiresCycle(graph: DependencyGraph): CycleResult {
  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;
  const color = new Map<string, number>();
  const stack: string[] = [];

  for (const id of graph.features.keys()) color.set(id, WHITE);

  function visit(node: string): string[] | null {
    color.set(node, GRAY);
    stack.push(node);

    for (const next of graph.requires.get(node) ?? []) {
      const state = color.get(next) ?? WHITE;
      if (state === GRAY) {
        const start = stack.indexOf(next);
        return [...stack.slice(start), next];
      }
      if (state === WHITE) {
        const found = visit(next);
        if (found) return found;
      }
    }

    stack.pop();
    color.set(node, BLACK);
    return null;
  }

  for (const id of graph.features.keys()) {
    if ((color.get(id) ?? WHITE) === WHITE) {
      const cycle = visit(id);
      if (cycle) return { hasCycle: true, cycle };
    }
  }

  return { hasCycle: false, cycle: [] };
}

/**
 * Memeriksa apakah menambahkan satu sisi REQUIRES baru akan membuat lingkaran,
 * tanpa harus menyimpannya lebih dulu.
 */
export function wouldCreateCycle(
  graph: DependencyGraph,
  featureId: string,
  targetFeatureId: string,
): boolean {
  if (featureId === targetFeatureId) return true;
  // Lingkaran terbentuk bila target sudah (transitif) membutuhkan featureId.
  const seen = new Set<string>();
  const queue = [targetFeatureId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === featureId) return true;
    if (seen.has(current)) continue;
    seen.add(current);
    queue.push(...(graph.requires.get(current) ?? []));
  }
  return false;
}

// ---------------------------------------------------------------------------
// Resolusi penambahan fitur
// ---------------------------------------------------------------------------

export interface AutoAddedFeature {
  featureId: string;
  featureName: string;
  triggeredBy: string;
  triggeredByName: string;
  reason: string;
}

export interface AutoRemovedFeature {
  featureId: string;
  featureName: string;
  conflictsWith: string;
  conflictsWithName: string;
  reason: string;
}

export interface ResolveAddResult {
  /** Kumpulan id fitur setelah seluruh aturan diterapkan. */
  selected: Set<string>;
  added: AutoAddedFeature[];
  removed: AutoRemovedFeature[];
}

function nameOf(graph: DependencyGraph, id: string): string {
  return graph.features.get(id)?.name ?? id;
}

/**
 * Menambahkan satu fitur beserta seluruh prasyaratnya secara transitif, lalu
 * melepas fitur yang berkonflik.
 *
 * Mengembalikan daftar perubahan otomatis agar UI dapat menjelaskannya dengan
 * kalimat seperti: "Kami menambahkan 'Master Lokasi Rak' karena 'Putaway
 * Otomatis' membutuhkannya." (C3.1)
 */
export function resolveAdd(
  graph: DependencyGraph,
  currentSelected: Iterable<string>,
  featureId: string,
): ResolveAddResult {
  const selected = new Set(currentSelected);
  const added: AutoAddedFeature[] = [];
  const removed: AutoRemovedFeature[] = [];

  if (!graph.features.has(featureId)) {
    return { selected, added, removed };
  }

  // Telusuri prasyarat secara transitif.
  const queue: Array<{ id: string; from: string | null }> = [{ id: featureId, from: null }];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const { id, from } = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);

    if (!selected.has(id)) {
      selected.add(id);
      if (from) {
        const note = graph.notes.get(edgeKey(from, id, 'REQUIRES'));
        added.push({
          featureId: id,
          featureName: nameOf(graph, id),
          triggeredBy: from,
          triggeredByName: nameOf(graph, from),
          reason:
            note ??
            `Kami menambahkan “${nameOf(graph, id)}” karena “${nameOf(graph, from)}” membutuhkannya.`,
        });
      }
    }

    for (const prerequisite of graph.requires.get(id) ?? []) {
      queue.push({ id: prerequisite, from: id });
    }
  }

  // Lepas fitur yang berkonflik dengan apa pun yang baru saja masuk.
  for (const newlyAdded of visited) {
    for (const conflicting of graph.conflicts.get(newlyAdded) ?? []) {
      if (!selected.has(conflicting) || conflicting === newlyAdded) continue;
      // Fitur Core tidak pernah dilepas otomatis (BR-01).
      if (graph.features.get(conflicting)?.type === 'CORE') continue;

      selected.delete(conflicting);
      const note =
        graph.notes.get(edgeKey(newlyAdded, conflicting, 'CONFLICTS_WITH')) ??
        graph.notes.get(edgeKey(conflicting, newlyAdded, 'CONFLICTS_WITH'));
      removed.push({
        featureId: conflicting,
        featureName: nameOf(graph, conflicting),
        conflictsWith: newlyAdded,
        conflictsWithName: nameOf(graph, newlyAdded),
        reason:
          note ??
          `“${nameOf(graph, conflicting)}” dilepas karena tidak dapat berjalan bersama “${nameOf(graph, newlyAdded)}”.`,
      });
    }
  }

  return { selected, added, removed };
}

// ---------------------------------------------------------------------------
// Resolusi penghapusan fitur (cascade)
// ---------------------------------------------------------------------------

export interface CascadeImpact {
  featureId: string;
  featureName: string;
  /** Prasyarat yang hilang sehingga fitur ini ikut terhapus. */
  becauseOf: string;
  becauseOfName: string;
}

export interface ResolveRemoveResult {
  /** Alasan penolakan bila fitur tidak boleh dihapus (mis. tipe Core). */
  blockedReason: string | null;
  /** Fitur lain yang ikut terhapus bila penghapusan dilanjutkan (C3.4). */
  cascade: CascadeImpact[];
  /** Hasil akhir seleksi bila pengguna mengonfirmasi. */
  selected: Set<string>;
}

/**
 * Menghitung dampak penghapusan satu fitur.
 *
 * Fitur Core tidak dapat dihapus sama sekali (BR-01). Untuk fitur lain, seluruh
 * fitur yang bergantung padanya — secara transitif — ikut terhapus, dan UI
 * wajib meminta konfirmasi lebih dulu.
 */
export function resolveRemove(
  graph: DependencyGraph,
  currentSelected: Iterable<string>,
  featureId: string,
): ResolveRemoveResult {
  const selected = new Set(currentSelected);
  const feature = graph.features.get(featureId);

  if (!feature) {
    return { blockedReason: 'Fitur tidak ditemukan.', cascade: [], selected };
  }

  if (feature.type === 'CORE') {
    return {
      blockedReason:
        `“${feature.name}” adalah modul fondasi yang selalu termasuk dan tidak dapat dihapus.`,
      cascade: [],
      selected,
    };
  }

  const cascade: CascadeImpact[] = [];
  const toRemove = new Set<string>([featureId]);
  const queue = [featureId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const dependent of graph.requiredBy.get(current) ?? []) {
      if (!selected.has(dependent) || toRemove.has(dependent)) continue;
      // Fitur Core yang bergantung pada fitur ini tidak boleh ikut terhapus;
      // situasi ini seharusnya tidak terjadi pada katalog yang sehat.
      if (graph.features.get(dependent)?.type === 'CORE') continue;

      toRemove.add(dependent);
      cascade.push({
        featureId: dependent,
        featureName: nameOf(graph, dependent),
        becauseOf: current,
        becauseOfName: nameOf(graph, current),
      });
      queue.push(dependent);
    }
  }

  for (const id of toRemove) selected.delete(id);

  return { blockedReason: null, cascade, selected };
}

// ---------------------------------------------------------------------------
// Rekomendasi halus (C3.3)
// ---------------------------------------------------------------------------

export interface Recommendation {
  featureId: string;
  featureName: string;
  /** Fitur terpilih yang memicu saran ini. */
  becauseOf: string;
  becauseOfName: string;
  reason: string;
}

export function collectRecommendations(
  graph: DependencyGraph,
  currentSelected: Iterable<string>,
  limit = 6,
): Recommendation[] {
  const selected = new Set(currentSelected);
  const seen = new Set<string>();
  const result: Recommendation[] = [];

  for (const id of selected) {
    for (const suggestion of graph.recommends.get(id) ?? []) {
      if (selected.has(suggestion) || seen.has(suggestion)) continue;
      if (!graph.features.has(suggestion)) continue;
      seen.add(suggestion);
      const note = graph.notes.get(edgeKey(id, suggestion, 'RECOMMENDS'));
      result.push({
        featureId: suggestion,
        featureName: nameOf(graph, suggestion),
        becauseOf: id,
        becauseOfName: nameOf(graph, id),
        reason:
          note ??
          `Klien yang memilih “${nameOf(graph, id)}” biasanya juga memilih “${nameOf(graph, suggestion)}”.`,
      });
      if (result.length >= limit) return result;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Validasi keranjang minimum (C3.5 / BR-08)
// ---------------------------------------------------------------------------

export interface MinimumViabilityResult {
  isViable: boolean;
  paidFeatureCount: number;
  requiredCount: number;
  /** Fitur esensial yang belum dipilih, sebagai saran konkret. */
  missingEssentials: Array<{ id: string; name: string }>;
  message: string | null;
}

/**
 * Memeriksa apakah rakitan sudah cukup untuk berjalan sebagai aplikasi utuh.
 *
 * Konfigurasi di bawah ambang tetap boleh dilanjutkan klien, tetapi ditandai
 * untuk review internal (BR-08).
 */
export function validateMinimumViable(
  graph: DependencyGraph,
  currentSelected: Iterable<string>,
  minViableFeatureCount: number,
  categoryName: string,
): MinimumViabilityResult {
  const selected = new Set(currentSelected);
  const paidFeatureCount = [...selected].filter(
    (id) => graph.features.get(id)?.type !== 'CORE',
  ).length;

  const missingEssentials = [...graph.features.values()]
    .filter((f) => f.isEssential && !selected.has(f.id))
    .map((f) => ({ id: f.id, name: f.name }));

  const isViable = paidFeatureCount >= minViableFeatureCount && missingEssentials.length === 0;

  if (isViable) {
    return {
      isViable,
      paidFeatureCount,
      requiredCount: minViableFeatureCount,
      missingEssentials: [],
      message: null,
    };
  }

  const suggestions = missingEssentials.slice(0, 4).map((f) => f.name);
  const message =
    suggestions.length > 0
      ? `Konfigurasi ini belum bisa berjalan sebagai ${categoryName} yang utuh. Tambahkan minimal: ${suggestions.join(', ')}.`
      : `Konfigurasi ini belum bisa berjalan sebagai ${categoryName} yang utuh. Tambahkan setidaknya ${minViableFeatureCount - paidFeatureCount} fitur lagi.`;

  return {
    isViable,
    paidFeatureCount,
    requiredCount: minViableFeatureCount,
    missingEssentials,
    message,
  };
}

// ---------------------------------------------------------------------------
// Penegakan menyeluruh (dipakai server sebelum menyimpan)
// ---------------------------------------------------------------------------

export interface EnforcementResult {
  selected: Set<string>;
  added: AutoAddedFeature[];
  removed: AutoRemovedFeature[];
  changed: boolean;
}

/**
 * Menormalkan satu himpunan pilihan agar memenuhi seluruh aturan dependensi:
 * seluruh fitur Core dimasukkan, prasyarat dilengkapi, konflik diselesaikan.
 *
 * Server memanggil fungsi ini pada setiap penyimpanan sehingga konfigurasi
 * yang melanggar aturan tidak mungkin tersimpan, apa pun yang dikirim klien.
 */
export function enforceSelection(
  graph: DependencyGraph,
  requestedSelection: Iterable<string>,
): EnforcementResult {
  const requested = new Set(requestedSelection);
  const before = new Set(requested);

  // BR-01: fitur Core selalu masuk keranjang.
  for (const feature of graph.features.values()) {
    if (feature.type === 'CORE') requested.add(feature.id);
  }

  let selected = new Set([...requested].filter((id) => graph.features.has(id)));
  const added: AutoAddedFeature[] = [];
  const removed: AutoRemovedFeature[] = [];

  // Terapkan resolveAdd untuk setiap pilihan agar prasyarat & konflik beres.
  // Iterasi berulang sampai stabil karena satu penambahan dapat memicu yang lain.
  for (let pass = 0; pass < 8; pass += 1) {
    let mutated = false;
    for (const id of [...selected]) {
      if (!selected.has(id)) continue;
      const result = resolveAdd(graph, selected, id);
      if (result.added.length > 0 || result.removed.length > 0) {
        mutated = true;
        added.push(...result.added);
        removed.push(...result.removed);
        selected = result.selected;
      }
    }
    if (!mutated) break;
  }

  const changed =
    selected.size !== before.size || [...selected].some((id) => !before.has(id));

  return { selected, added, removed, changed };
}
