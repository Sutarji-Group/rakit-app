import type { Metadata } from 'next';
import { site } from '@/lib/site';

/**
 * Menyusun kolom `title` metadata dari judul SEO katalog.
 *
 * Template global menambahkan "· Rakit" di belakang setiap judul halaman.
 * Sebagian judul SEO yang ditulis tim katalog sudah memuat nama merek
 * ("… | RAKIT"), sehingga bila ikut template merek akan tertulis dua kali di
 * hasil pencarian. Judul semacam itu dipakai apa adanya.
 */
export function toMetadataTitle(title: string): NonNullable<Metadata['title']> {
  return title.toLowerCase().includes(site.name.toLowerCase()) ? { absolute: title } : title;
}

/**
 * Memotong deskripsi meta di batas kata.
 *
 * Google memotong sekitar 160 karakter; memotong sendiri di batas kata jauh
 * lebih enak dibaca daripada kalimat yang terputus di tengah.
 */
export function toMetaDescription(text: string, limit = 160): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= limit) return clean;
  const cut = clean.slice(0, limit - 3);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > limit * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
