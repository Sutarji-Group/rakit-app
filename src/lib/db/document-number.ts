import 'server-only';

import { prisma } from '@/lib/db/prisma';
import { buildDocumentNumber } from '@/lib/format';

/**
 * Pemberi nomor dokumen berurutan (RKT, PRJ, INV, KTR, CR).
 *
 * Pola "baca nomor terakhir lalu tambah satu" punya celah yang tidak bisa
 * ditutup dengan mengulang: saat beberapa permintaan berjalan bersamaan,
 * semuanya membaca nomor terakhir yang sama, dan percobaan ulang pun membaca
 * angka yang sama lagi karena belum ada yang commit. Yang dibutuhkan adalah
 * penambahan yang atomik, bukan percobaan ulang.
 *
 * Tabel DocumentSequence menyediakan itu. Satu pernyataan UPDATE ... RETURNING
 * mengunci barisnya selama penambahan, jadi pemanggil bersamaan mengantre dan
 * masing-masing menerima blok nomor yang berbeda.
 *
 * Konsekuensi yang disengaja: nomor terpakai begitu diberikan, walau penulisan
 * sesudahnya gagal. Urutan nomor bisa berlubang — dan itu jauh lebih baik
 * daripada dua dokumen bernomor sama.
 */

export type DocumentPrefix = 'RKT' | 'PRJ' | 'INV' | 'KTR' | 'CR';

/**
 * Nomor tertinggi yang sudah terpakai di tahun berjalan, dibaca dari dokumen
 * aslinya. Hanya dipanggil sekali per awalan per tahun — saat pencacahnya belum
 * ada — agar data hasil seed atau impor tidak tertimpa nomor yang sama.
 */
async function highestExistingSequence(prefix: DocumentPrefix, year: number): Promise<number> {
  const startsWith = `${prefix}-${year}-`;

  const used = await (async (): Promise<string[]> => {
    switch (prefix) {
      case 'RKT': {
        const rows = await prisma.lead.findMany({
          where: { quoteNumber: { startsWith } },
          select: { quoteNumber: true },
        });
        return rows.map((row) => row.quoteNumber);
      }
      case 'PRJ': {
        const rows = await prisma.project.findMany({
          where: { code: { startsWith } },
          select: { code: true },
        });
        return rows.map((row) => row.code);
      }
      case 'INV': {
        const rows = await prisma.invoice.findMany({
          where: { number: { startsWith } },
          select: { number: true },
        });
        return rows.map((row) => row.number);
      }
      case 'KTR': {
        const rows = await prisma.contract.findMany({
          where: { number: { startsWith } },
          select: { number: true },
        });
        return rows.map((row) => row.number);
      }
      case 'CR': {
        const rows = await prisma.changeRequest.findMany({
          where: { number: { startsWith } },
          select: { number: true },
        });
        return rows.map((row) => row.number);
      }
    }
  })();

  return used.reduce((max, value) => {
    const sequence = Number.parseInt(value.slice(startsWith.length), 10);
    return Number.isFinite(sequence) ? Math.max(max, sequence) : max;
  }, 0);
}

/**
 * Memesan `count` nomor berurutan dan mengembalikannya sudah terformat.
 *
 * Nomornya pasti belum pernah diberikan ke pemanggil lain, bahkan bila beberapa
 * permintaan meminta pada saat yang sama.
 */
export async function allocateDocumentNumbers(
  prefix: DocumentPrefix,
  count: number,
): Promise<string[]> {
  if (count < 1) return [];
  const year = new Date().getFullYear();

  // Jalur biasa: satu pernyataan, satu kunci baris, tanpa pembacaan pendahulu.
  const bumped = await prisma.$queryRaw<Array<{ lastValue: number }>>`
    UPDATE "DocumentSequence"
       SET "lastValue" = "lastValue" + ${count}, "updatedAt" = NOW()
     WHERE "prefix" = ${prefix} AND "year" = ${year}
    RETURNING "lastValue"`;

  let lastValue = bumped[0]?.lastValue;

  if (lastValue === undefined) {
    // Dokumen pertama untuk awalan ini di tahun ini. ON CONFLICT menjaga dua
    // permintaan bersamaan tidak sama-sama membuat baris: yang kalah balapan
    // ikut menambah baris milik pemenang, bukan menimpanya.
    const start = await highestExistingSequence(prefix, year);
    const created = await prisma.$queryRaw<Array<{ lastValue: number }>>`
      INSERT INTO "DocumentSequence" ("prefix", "year", "lastValue", "updatedAt")
      VALUES (${prefix}, ${year}, ${start + count}, NOW())
      ON CONFLICT ("prefix", "year")
      DO UPDATE SET "lastValue" = "DocumentSequence"."lastValue" + ${count}, "updatedAt" = NOW()
      RETURNING "lastValue"`;
    lastValue = created[0].lastValue;
  }

  const last = lastValue;
  return Array.from({ length: count }, (_, index) =>
    buildDocumentNumber(prefix, year, last - count + 1 + index),
  );
}
