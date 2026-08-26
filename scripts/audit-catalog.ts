/**
 * Audit kualitas katalog.
 *
 * Memeriksa hal-hal yang tidak tertangkap oleh typecheck maupun validasi seed:
 * apakah teks yang dilihat klien masih berbau bahasa developer (Prinsip Produk
 * #4), apakah setiap aturan dependensi punya kalimat penjelas untuk klien, dan
 * apakah rasio lebar rentang agregat tiap preset masih di bawah target 1,35
 * (metrik kesehatan produk PRD 4.3).
 *
 * Rasio agregat penting diperiksa terpisah: seluruh fitur bisa saja lolos batas
 * per tipe, tetapi campuran yang terlalu banyak Configurable tetap menghasilkan
 * rentang total yang terbaca sebagai keraguan.
 *
 * Jalankan: npm run audit:katalog
 */
import { WMS_CATALOG } from '@/lib/seed/catalog-wms';
import { CRM_CATALOG } from '@/lib/seed/catalog-crm';
import { POS_CATALOG } from '@/lib/seed/catalog-pos';
import { BASELINE_PRICING_RULE as R, computePrice, validateRangeWidth } from '@/lib/pricing';
import type { CatalogDefinition } from '@/lib/seed/types';

// Istilah developer yang tidak boleh muncul di teks yang dilihat klien
// (Prinsip Produk #4). Istilah bisnis Indonesia yang lazim tidak masuk daftar.
const JARGON = ['module','engine','service','endpoint','backend','frontend','database','query',
  'webhook','middleware','deploy','api gateway','microservice','schema','sinkronisasi api',
  'crud','rest api','payload','cache','repository','framework'];

const catalogs: CatalogDefinition[] = [WMS_CATALOG, CRM_CATALOG, POS_CATALOG];
let problems = 0;

for (const c of catalogs) {
  const feats = c.groups.flatMap(g => g.features);
  const byType = (t: string) => feats.filter(f => f.type === t).length;

  console.log(`\n=== ${c.shortName} — ${feats.length} fitur di ${c.groups.length} kelompok ===`);
  console.log(`  Core ${byType('CORE')} · Standard ${byType('STANDARD')} · Configurable ${byType('CONFIGURABLE')}`);
  console.log(`  esensial: ${feats.filter(f => f.isEssential).length} · dependensi: ${c.dependencies.length}`);
  const kinds = c.dependencies.reduce<Record<string, number>>((a, d) => ({...a, [d.kind]: (a[d.kind]??0)+1}), {});
  console.log(`  ${Object.entries(kinds).map(([k,v]) => `${k} ${v}`).join(' · ')}`);
  console.log(`  dependensi dengan catatan penjelas: ${c.dependencies.filter(d => d.note).length}/${c.dependencies.length}`);

  // Lebar rentang per fitur
  const wide = feats.filter(f => !validateRangeWidth(R, f.type, f.manDayMin, f.manDayMax).valid);
  if (wide.length) { console.log(`  ✗ ${wide.length} fitur melanggar batas lebar rentang`); problems += wide.length; }

  // Jargon developer
  const jargonHits = feats.filter(f => {
    const t = `${f.name} ${f.clientDescription}`.toLowerCase();
    return JARGON.some(j => t.includes(j));
  });
  if (jargonHits.length) {
    console.log(`  ✗ ${jargonHits.length} fitur memuat istilah developer:`);
    jargonHits.slice(0,5).forEach(f => console.log(`      ${f.slug}: ${f.name}`));
    problems += jargonHits.length;
  }

  // Panjang deskripsi
  const tooShort = feats.filter(f => f.clientDescription.length < 60);
  if (tooShort.length) { console.log(`  ! ${tooShort.length} deskripsi sangat pendek (<60 karakter)`); }

  // Rasio lebar rentang agregat per preset (metrik 4.3, target <= 1,35)
  const bySlug = new Map(feats.map(f => [f.slug, f]));
  for (const p of c.presets) {
    const fs = p.features.map(s => bySlug.get(s)!).filter(Boolean).map(f => ({
      id: f.slug, name: f.name, type: f.type, manDayMin: f.manDayMin, manDayMax: f.manDayMax,
    }));
    const b = computePrice({ rule: R, features: fs, platform: 'WEB', deployment: 'OUR_CLOUD', userTier: 'T50' });
    const flag = b.rangeWidthRatio <= 1.35 ? 'OK ' : '✗  ';
    console.log(`  ${flag} ${p.name.padEnd(18)} rasio rentang ${b.rangeWidthRatio.toFixed(3)} · GM ${(b.internal.grossMarginPct*100).toFixed(1)}%`);
    if (b.rangeWidthRatio > 1.35) problems++;
  }

  // Kelengkapan wizard
  console.log(`  wizard: ${c.wizard.length} pertanyaan, ${c.wizard.reduce((s,q)=>s+q.options.length,0)} opsi, ` +
    `${c.wizard.reduce((s,q)=>s+q.options.reduce((t,o)=>t+o.maps.length,0),0)} pemetaan fitur`);
  const noReason = c.wizard.flatMap(q=>q.options).flatMap(o=>o.maps).filter(m => !m.reason || m.reason.length < 15);
  if (noReason.length) { console.log(`  ✗ ${noReason.length} pemetaan wizard tanpa alasan memadai`); problems += noReason.length; }

  // SEO
  console.log(`  fitur ber-SEO: ${feats.filter(f => f.seoTitle).length}`);
}

console.log(`\n${problems === 0 ? '✓ Tidak ada masalah ditemukan.' : `✗ ${problems} masalah perlu diperbaiki.`}`);
