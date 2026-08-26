'use server';

import { revalidatePath } from 'next/cache';
import {
  actionFail,
  actionOk,
  type CatalogActionResult,
  type CsvPreview,
} from '@/components/admin/catalog/shared';
import { requireArea } from '@/lib/auth/guards';
import { recordCatalogAudit } from '../_lib/audit';
import { commitCatalogImport, resolveCatalogImport } from '../_lib/import';

/** Batas ukuran berkas CSV yang diterima — katalog terbesar pun jauh di bawah ini. */
const MAX_CSV_CHARS = 2_000_000;

/**
 * Pratinjau perubahan sebelum benar-benar disimpan (L6).
 *
 * Impor katalog adalah operasi paling berbahaya di modul ini: satu berkas dapat
 * mengubah ratusan baris harga sekaligus. Karena itu alurnya dipaksa dua
 * langkah — lihat dampaknya dulu, baru simpan.
 */
export async function previewCatalogImport(text: string): Promise<CsvPreview> {
  await requireArea('catalog');

  if (text.length > MAX_CSV_CHARS) {
    return {
      rows: [],
      counts: { NEW: 0, CHANGED: 0, UNCHANGED: 0, INVALID: 0 },
      fatalError: 'Berkas CSV terlalu besar untuk diproses.',
    };
  }

  const { preview } = await resolveCatalogImport(text);
  return preview;
}

/** Menyimpan baris baru dan baris berubah dari CSV yang sudah dipratinjau. */
export async function applyCatalogImport(text: string): Promise<CatalogActionResult> {
  const actor = await requireArea('catalog');

  if (text.length > MAX_CSV_CHARS) {
    return actionFail('Berkas CSV terlalu besar untuk diproses.');
  }

  // Berkas diproses ulang dari nol, bukan memakai hasil pratinjau yang dikirim
  // browser: katalog bisa saja berubah oleh admin lain di antara dua langkah.
  const { preview, payloads } = await resolveCatalogImport(text);
  if (preview.fatalError) return actionFail(preview.fatalError);
  if (payloads.length === 0) {
    return actionFail(
      preview.counts.INVALID > 0
        ? `Tidak ada baris yang dapat disimpan. ${preview.counts.INVALID} baris bermasalah — perbaiki lebih dulu.`
        : 'Tidak ada perubahan untuk disimpan. Seluruh baris sudah sama dengan katalog.',
    );
  }

  const outcome = await commitCatalogImport(payloads);

  await recordCatalogAudit({
    actor,
    entity: 'CatalogImport',
    entityId: outcome.categorySlugs.join(',') || 'impor',
    action: 'IMPORT',
    summary:
      `Impor CSV katalog: ${outcome.created} fitur baru, ${outcome.updated} fitur diperbarui, ` +
      `${outcome.groupsCreated} kelompok dibuat, ${preview.counts.INVALID} baris bermasalah dilewati.`,
    after: {
      counts: preview.counts,
      created: outcome.created,
      updated: outcome.updated,
      groupsCreated: outcome.groupsCreated,
      categories: outcome.categorySlugs,
    },
  });

  revalidatePath('/admin/katalog');
  revalidatePath('/admin/katalog/impor');
  revalidatePath('/admin/katalog/preset');
  for (const slug of outcome.categorySlugs) {
    revalidatePath(`/admin/katalog/${slug}`);
    revalidatePath(`/admin/katalog/${slug}/dependensi`);
  }
  revalidatePath('/');

  const warnings: string[] = [];
  if (preview.counts.INVALID > 0) {
    warnings.push(
      `${preview.counts.INVALID} baris bermasalah dilewati dan tidak ikut tersimpan.`,
    );
  }
  if (outcome.groupsCreated > 0) {
    warnings.push(
      `${outcome.groupsCreated} kelompok fitur baru dibuat otomatis — periksa nama dan urutannya.`,
    );
  }

  return actionOk(
    `${outcome.created} fitur baru dan ${outcome.updated} fitur diperbarui.`,
    { warnings },
  );
}
