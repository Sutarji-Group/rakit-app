/**
 * Pengujian mesin dependensi terhadap PRD C.3 dan Lampiran B.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildDependencyGraph,
  collectRecommendations,
  detectRequiresCycle,
  enforceSelection,
  resolveAdd,
  resolveRemove,
  validateMinimumViable,
  wouldCreateCycle,
  type DependencyEdge,
  type DependencyFeature,
} from '../src/lib/configurator/dependency';

/** Katalog WMS ringkas sesuai Lampiran A & B. */
const FEATURES: DependencyFeature[] = [
  { id: 'master-barang', name: 'Master Barang & SKU', type: 'CORE', groupId: 'master', isEssential: false },
  { id: 'master-gudang', name: 'Master Gudang', type: 'CORE', groupId: 'master', isEssential: false },
  { id: 'master-lokasi', name: 'Master Lokasi Rak', type: 'STANDARD', groupId: 'master', isEssential: true },
  { id: 'penerimaan', name: 'Penerimaan Barang (GRN)', type: 'STANDARD', groupId: 'terima', isEssential: true },
  { id: 'putaway-manual', name: 'Putaway Manual', type: 'STANDARD', groupId: 'simpan', isEssential: false },
  { id: 'putaway-otomatis', name: 'Putaway Otomatis', type: 'CONFIGURABLE', groupId: 'simpan', isEssential: false },
  { id: 'batch-lot', name: 'Manajemen Batch/Lot', type: 'CONFIGURABLE', groupId: 'simpan', isEssential: false },
  { id: 'fefo', name: 'Manajemen Kedaluwarsa (FEFO)', type: 'CONFIGURABLE', groupId: 'simpan', isEssential: false },
  { id: 'sales-order', name: 'Sales Order', type: 'STANDARD', groupId: 'keluar', isEssential: false },
  { id: 'picking-list', name: 'Picking List', type: 'STANDARD', groupId: 'keluar', isEssential: false },
  { id: 'strategi-picking', name: 'Strategi Picking', type: 'CONFIGURABLE', groupId: 'keluar', isEssential: false },
  { id: 'kartu-stok', name: 'Kartu Stok', type: 'STANDARD', groupId: 'laporan', isEssential: true },
  { id: 'aging-stock', name: 'Aging Stock', type: 'STANDARD', groupId: 'laporan', isEssential: false },
  { id: 'analisis-abc', name: 'Analisis ABC', type: 'CONFIGURABLE', groupId: 'laporan', isEssential: false },
  { id: 'scanner-mobile', name: 'Scanner Mobile', type: 'STANDARD', groupId: 'sistem', isEssential: false },
  { id: 'cycle-counting', name: 'Cycle Counting', type: 'STANDARD', groupId: 'opname', isEssential: false },
];

const EDGES: DependencyEdge[] = [
  { featureId: 'putaway-otomatis', targetFeatureId: 'master-lokasi', kind: 'REQUIRES' },
  { featureId: 'putaway-otomatis', targetFeatureId: 'penerimaan', kind: 'REQUIRES' },
  { featureId: 'putaway-otomatis', targetFeatureId: 'putaway-manual', kind: 'CONFLICTS_WITH' },
  { featureId: 'putaway-otomatis', targetFeatureId: 'scanner-mobile', kind: 'RECOMMENDS' },
  { featureId: 'fefo', targetFeatureId: 'batch-lot', kind: 'REQUIRES' },
  { featureId: 'fefo', targetFeatureId: 'aging-stock', kind: 'RECOMMENDS' },
  { featureId: 'picking-list', targetFeatureId: 'sales-order', kind: 'REQUIRES' },
  { featureId: 'picking-list', targetFeatureId: 'master-lokasi', kind: 'REQUIRES' },
  { featureId: 'picking-list', targetFeatureId: 'strategi-picking', kind: 'RECOMMENDS' },
  { featureId: 'aging-stock', targetFeatureId: 'penerimaan', kind: 'REQUIRES' },
  { featureId: 'aging-stock', targetFeatureId: 'kartu-stok', kind: 'REQUIRES' },
  { featureId: 'aging-stock', targetFeatureId: 'analisis-abc', kind: 'RECOMMENDS' },
  { featureId: 'cycle-counting', targetFeatureId: 'master-lokasi', kind: 'REQUIRES' },
  { featureId: 'cycle-counting', targetFeatureId: 'scanner-mobile', kind: 'RECOMMENDS' },
];

const GRAPH = buildDependencyGraph(FEATURES, EDGES);

describe('C3.1 — relasi requires ditambahkan otomatis', () => {
  it('memilih Putaway Otomatis menarik masuk prasyaratnya', () => {
    const result = resolveAdd(GRAPH, [], 'putaway-otomatis');
    assert.ok(result.selected.has('master-lokasi'));
    assert.ok(result.selected.has('penerimaan'));
  });

  it('memberi penjelasan yang bisa dibaca klien', () => {
    const result = resolveAdd(GRAPH, [], 'putaway-otomatis');
    const note = result.added.find((a) => a.featureId === 'master-lokasi');
    assert.ok(note);
    assert.match(
      note!.reason,
      /Kami menambahkan “Master Lokasi Rak” karena “Putaway Otomatis” membutuhkannya\./,
    );
  });

  it('menelusuri prasyarat secara transitif', () => {
    // Aging Stock → Penerimaan + Kartu Stok; keduanya harus ikut.
    const result = resolveAdd(GRAPH, [], 'aging-stock');
    assert.ok(result.selected.has('penerimaan'));
    assert.ok(result.selected.has('kartu-stok'));
    assert.equal(result.added.length, 2);
  });

  it('menghormati catatan khusus yang ditulis admin', () => {
    const graph = buildDependencyGraph(FEATURES, [
      {
        featureId: 'fefo',
        targetFeatureId: 'batch-lot',
        kind: 'REQUIRES',
        note: 'FEFO memerlukan pencatatan batch agar tanggal kedaluwarsa bisa dilacak.',
      },
    ]);
    const result = resolveAdd(graph, [], 'fefo');
    assert.equal(
      result.added[0].reason,
      'FEFO memerlukan pencatatan batch agar tanggal kedaluwarsa bisa dilacak.',
    );
  });
});

describe('C3.2 — relasi conflicts_with', () => {
  it('memilih Putaway Otomatis melepas Putaway Manual', () => {
    const result = resolveAdd(GRAPH, ['putaway-manual'], 'putaway-otomatis');
    assert.equal(result.selected.has('putaway-manual'), false);
    assert.equal(result.removed[0].featureId, 'putaway-manual');
    assert.match(result.removed[0].reason, /tidak dapat berjalan bersama/);
  });

  it('konflik bersifat dua arah walau hanya didefinisikan satu arah', () => {
    const result = resolveAdd(GRAPH, ['putaway-otomatis'], 'putaway-manual');
    assert.equal(result.selected.has('putaway-otomatis'), false);
  });

  it('tidak pernah melepas fitur Core (BR-01)', () => {
    const graph = buildDependencyGraph(FEATURES, [
      { featureId: 'putaway-otomatis', targetFeatureId: 'master-barang', kind: 'CONFLICTS_WITH' },
    ]);
    const result = resolveAdd(graph, ['master-barang'], 'putaway-otomatis');
    assert.ok(result.selected.has('master-barang'));
  });
});

describe('C3.3 — relasi recommends bersifat saran, tidak otomatis', () => {
  it('tidak menambahkan fitur yang hanya direkomendasikan', () => {
    const result = resolveAdd(GRAPH, [], 'putaway-otomatis');
    assert.equal(result.selected.has('scanner-mobile'), false);
  });

  it('menyusun daftar saran dari fitur yang sudah dipilih', () => {
    const recs = collectRecommendations(GRAPH, ['putaway-otomatis', 'picking-list']);
    const ids = recs.map((r) => r.featureId);
    assert.ok(ids.includes('scanner-mobile'));
    assert.ok(ids.includes('strategi-picking'));
  });

  it('tidak menyarankan fitur yang sudah ada di keranjang', () => {
    const recs = collectRecommendations(GRAPH, ['putaway-otomatis', 'scanner-mobile']);
    assert.equal(recs.some((r) => r.featureId === 'scanner-mobile'), false);
  });

  it('memakai kalimat "klien yang memilih ini biasanya juga memilih"', () => {
    const recs = collectRecommendations(GRAPH, ['cycle-counting']);
    assert.match(recs[0].reason, /biasanya juga memilih/);
  });
});

describe('C3.4 — cascade saat penghapusan', () => {
  it('menghapus prasyarat memunculkan daftar fitur yang ikut terhapus', () => {
    const selected = ['master-lokasi', 'penerimaan', 'putaway-otomatis', 'sales-order', 'picking-list'];
    const result = resolveRemove(GRAPH, selected, 'master-lokasi');
    const ids = result.cascade.map((c) => c.featureId);
    assert.ok(ids.includes('putaway-otomatis'));
    assert.ok(ids.includes('picking-list'));
    assert.equal(result.selected.has('master-lokasi'), false);
  });

  it('cascade bersifat transitif', () => {
    const selected = ['penerimaan', 'kartu-stok', 'aging-stock', 'batch-lot', 'fefo'];
    const result = resolveRemove(GRAPH, selected, 'batch-lot');
    assert.ok(result.cascade.some((c) => c.featureId === 'fefo'));
  });

  it('BR-01: fitur Core tidak dapat dihapus', () => {
    const result = resolveRemove(GRAPH, ['master-barang'], 'master-barang');
    assert.ok(result.blockedReason);
    assert.match(result.blockedReason!, /tidak dapat dihapus/);
    assert.ok(result.selected.has('master-barang'));
  });

  it('menghapus fitur tanpa dependen tidak memicu cascade', () => {
    const result = resolveRemove(GRAPH, ['scanner-mobile', 'master-lokasi'], 'scanner-mobile');
    assert.equal(result.cascade.length, 0);
    assert.equal(result.blockedReason, null);
  });
});

describe('Deteksi dependensi melingkar (kriteria penerimaan modul L)', () => {
  it('katalog sehat tidak memiliki lingkaran', () => {
    assert.equal(detectRequiresCycle(GRAPH).hasCycle, false);
  });

  it('mendeteksi lingkaran langsung A → B → A', () => {
    const graph = buildDependencyGraph(FEATURES, [
      { featureId: 'aging-stock', targetFeatureId: 'kartu-stok', kind: 'REQUIRES' },
      { featureId: 'kartu-stok', targetFeatureId: 'aging-stock', kind: 'REQUIRES' },
    ]);
    const result = detectRequiresCycle(graph);
    assert.equal(result.hasCycle, true);
    assert.ok(result.cycle.length >= 2);
  });

  it('mendeteksi lingkaran tidak langsung A → B → C → A', () => {
    const graph = buildDependencyGraph(FEATURES, [
      { featureId: 'aging-stock', targetFeatureId: 'kartu-stok', kind: 'REQUIRES' },
      { featureId: 'kartu-stok', targetFeatureId: 'penerimaan', kind: 'REQUIRES' },
      { featureId: 'penerimaan', targetFeatureId: 'aging-stock', kind: 'REQUIRES' },
    ]);
    assert.equal(detectRequiresCycle(graph).hasCycle, true);
  });

  it('menolak sisi baru yang akan membentuk lingkaran sebelum disimpan', () => {
    // aging-stock sudah membutuhkan kartu-stok; kebalikannya akan melingkar.
    assert.equal(wouldCreateCycle(GRAPH, 'kartu-stok', 'aging-stock'), true);
    assert.equal(wouldCreateCycle(GRAPH, 'analisis-abc', 'kartu-stok'), false);
  });

  it('menolak fitur yang membutuhkan dirinya sendiri', () => {
    assert.equal(wouldCreateCycle(GRAPH, 'kartu-stok', 'kartu-stok'), true);
  });
});

describe('C3.5 / BR-08 — validasi keranjang minimum', () => {
  it('menandai rakitan yang belum layak dan menyebut fitur yang kurang', () => {
    const result = validateMinimumViable(GRAPH, ['master-barang', 'sales-order'], 8, 'WMS');
    assert.equal(result.isViable, false);
    assert.ok(result.message?.includes('belum bisa berjalan sebagai WMS yang utuh'));
    assert.ok(result.missingEssentials.length > 0);
  });

  it('meloloskan rakitan yang sudah lengkap', () => {
    const selected = [
      'master-barang', 'master-gudang', 'master-lokasi', 'penerimaan', 'kartu-stok',
      'sales-order', 'picking-list', 'putaway-manual', 'aging-stock', 'scanner-mobile',
    ];
    const result = validateMinimumViable(GRAPH, selected, 8, 'WMS');
    assert.equal(result.isViable, true);
    assert.equal(result.message, null);
  });

  it('fitur Core tidak dihitung sebagai fitur berbayar', () => {
    const result = validateMinimumViable(GRAPH, ['master-barang', 'master-gudang'], 8, 'WMS');
    assert.equal(result.paidFeatureCount, 0);
  });
});

describe('Penegakan menyeluruh di sisi server', () => {
  it('BR-01: selalu memasukkan seluruh fitur Core', () => {
    const result = enforceSelection(GRAPH, ['sales-order']);
    assert.ok(result.selected.has('master-barang'));
    assert.ok(result.selected.has('master-gudang'));
  });

  it('melengkapi prasyarat yang hilang dari kiriman klien', () => {
    // Klien mengirim picking-list tanpa sales-order & master-lokasi.
    const result = enforceSelection(GRAPH, ['picking-list']);
    assert.ok(result.selected.has('sales-order'));
    assert.ok(result.selected.has('master-lokasi'));
    assert.equal(result.changed, true);
  });

  it('menyelesaikan konflik yang dikirim bersamaan', () => {
    const result = enforceSelection(GRAPH, ['putaway-manual', 'putaway-otomatis']);
    const hasBoth =
      result.selected.has('putaway-manual') && result.selected.has('putaway-otomatis');
    assert.equal(hasBoth, false, 'dua fitur yang berkonflik tidak boleh lolos bersamaan');
  });

  it('idempoten: menjalankan ulang pada hasilnya tidak mengubah apa pun', () => {
    const first = enforceSelection(GRAPH, ['putaway-otomatis', 'fefo', 'picking-list']);
    const second = enforceSelection(GRAPH, first.selected);
    assert.deepEqual([...second.selected].sort(), [...first.selected].sort());
    assert.equal(second.changed, false);
  });

  it('mengabaikan id fitur yang tidak dikenal', () => {
    const result = enforceSelection(GRAPH, ['fitur-palsu', 'sales-order']);
    assert.equal(result.selected.has('fitur-palsu'), false);
    assert.ok(result.selected.has('sales-order'));
  });

  it('mustahil menghasilkan konfigurasi yang melanggar aturan dependensi', () => {
    // Kriteria penerimaan modul C.
    const attempts: string[][] = [
      ['putaway-otomatis'],
      ['fefo'],
      ['aging-stock'],
      ['picking-list', 'putaway-manual', 'putaway-otomatis'],
      ['cycle-counting', 'analisis-abc'],
    ];
    for (const attempt of attempts) {
      const { selected } = enforceSelection(GRAPH, attempt);
      for (const id of selected) {
        for (const prerequisite of GRAPH.requires.get(id) ?? []) {
          assert.ok(
            selected.has(prerequisite),
            `${id} terpilih tanpa prasyarat ${prerequisite}`,
          );
        }
        for (const conflicting of GRAPH.conflicts.get(id) ?? []) {
          assert.equal(
            selected.has(conflicting),
            false,
            `${id} terpilih bersamaan dengan ${conflicting} yang berkonflik`,
          );
        }
      }
    }
  });
});
