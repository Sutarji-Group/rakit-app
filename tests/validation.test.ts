/** Pengujian normalisasi masukan formulir. */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { normalizeIndonesianPhone } from '../src/lib/api/schemas';

describe('Normalisasi nomor WhatsApp Indonesia', () => {
  const valid: Array<[string, string]> = [
    ['0812-3456-7890', '081234567890'],
    ['0812 3456 7890', '081234567890'],
    ['081234567890', '081234567890'],
    ['+62 812 3456 7890', '081234567890'],
    ['+6281234567890', '081234567890'],
    ['62812-3456-7890', '081234567890'],
    ['(0812) 3456-7890', '081234567890'],
    ['0857 1122 3344', '085711223344'],
    ['08123456789', '08123456789'],
    ['811 1000 200', '08111000200'],
  ];

  for (const [input, expected] of valid) {
    it(`menerima "${input}"`, () => {
      assert.equal(normalizeIndonesianPhone(input), expected);
    });
  }

  const invalid = ['0212345678', '12345', '0812345', 'bukan nomor', '', '021-555-1234'];
  for (const input of invalid) {
    it(`menolak "${input}"`, () => {
      assert.equal(normalizeIndonesianPhone(input), null);
    });
  }
});
