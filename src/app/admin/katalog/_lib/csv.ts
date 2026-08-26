/**
 * Pembaca & penulis CSV katalog (L6).
 *
 * Ditulis sendiri, bukan lewat pustaka: formatnya sempit (sepuluh kolom, satu
 * baris per fitur) dan menambah dependensi npm hanya untuk ini tidak sebanding
 * dengan ongkos pemeliharaannya.
 */

import { CATALOG_CSV_COLUMNS, type CatalogCsvColumn } from '@/components/admin/catalog/shared';

export interface CsvParseResult {
  header: string[];
  /** Baris data beserta nomor barisnya di berkas asli (untuk pesan error). */
  rows: Array<{ lineNumber: number; cells: string[] }>;
  error: string | null;
}

/**
 * Memecah teks CSV mengikuti RFC 4180: tanda kutip ganda membungkus sel yang
 * mengandung koma atau baris baru, dan "" di dalamnya berarti satu tanda kutip.
 */
export function parseCsv(text: string): CsvParseResult {
  const normalized = text.replace(/^﻿/, '');
  const records: string[][] = [];
  const lineNumbers: number[] = [];

  let cells: string[] = [];
  let current = '';
  let inQuotes = false;
  let line = 1;
  let recordStartLine = 1;
  let touched = false;

  const endCell = () => {
    cells.push(current);
    current = '';
  };
  const endRecord = () => {
    endCell();
    records.push(cells);
    lineNumbers.push(recordStartLine);
    cells = [];
    recordStartLine = line;
    touched = false;
  };

  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];

    if (inQuotes) {
      if (char === '"') {
        if (normalized[index + 1] === '"') {
          current += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        if (char === '\n') line += 1;
        current += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      touched = true;
      continue;
    }
    if (char === ',') {
      endCell();
      touched = true;
      continue;
    }
    if (char === '\r') continue;
    if (char === '\n') {
      line += 1;
      if (touched || current.length > 0 || cells.length > 0) endRecord();
      else recordStartLine = line;
      continue;
    }
    current += char;
    touched = true;
  }

  if (inQuotes) {
    return { header: [], rows: [], error: 'Tanda kutip pada berkas CSV tidak tertutup.' };
  }
  if (touched || current.length > 0 || cells.length > 0) endRecord();

  const nonEmpty = records
    .map((cellList, index) => ({ cells: cellList, lineNumber: lineNumbers[index] }))
    .filter((record) => record.cells.some((cell) => cell.trim().length > 0));

  if (nonEmpty.length === 0) {
    return { header: [], rows: [], error: 'Berkas CSV kosong.' };
  }

  const [headerRecord, ...dataRecords] = nonEmpty;
  const header = headerRecord.cells.map((cell) => cell.trim().toLowerCase());

  const missing = CATALOG_CSV_COLUMNS.filter((column) => !header.includes(column));
  if (missing.length > 0) {
    return {
      header,
      rows: [],
      error: `Kolom wajib belum ada di baris judul: ${missing.join(', ')}.`,
    };
  }

  return { header, rows: dataRecords, error: null };
}

/** Mengambil satu sel berdasarkan nama kolom, apa pun urutan kolom di berkas. */
export function cellOf(
  header: string[],
  cells: string[],
  column: CatalogCsvColumn,
): string {
  const index = header.indexOf(column);
  if (index < 0) return '';
  return (cells[index] ?? '').trim();
}

function escapeCell(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Merangkai baris menjadi teks CSV berkolom tetap CATALOG_CSV_COLUMNS. */
export function toCatalogCsv(rows: Array<Record<CatalogCsvColumn, string>>): string {
  const lines = [CATALOG_CSV_COLUMNS.join(',')];
  for (const row of rows) {
    lines.push(CATALOG_CSV_COLUMNS.map((column) => escapeCell(row[column] ?? '')).join(','));
  }
  // Diakhiri baris baru agar rapi saat dibuka di editor teks maupun Excel.
  return `${lines.join('\n')}\n`;
}

/** Angka desimal boleh ditulis dengan koma (kebiasaan lokal) maupun titik. */
export function parseDecimal(raw: string): number | null {
  if (!raw) return null;
  const value = Number(raw.replace(',', '.'));
  return Number.isFinite(value) ? value : null;
}

export function parseBooleanCell(raw: string): boolean {
  return ['1', 'true', 'ya', 'y', 'yes'].includes(raw.trim().toLowerCase());
}
