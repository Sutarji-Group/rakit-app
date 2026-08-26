import { permanentRedirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ categorySlug: string }>;
}

/**
 * /fitur/<kategori> tanpa nama fitur.
 *
 * Alamat ini muncul ketika orang memotong URL halaman fitur di bilah alamat.
 * Daripada memberi halaman 404, pengunjung diarahkan ke halaman kategorinya —
 * di sana seluruh kelompok fitur memang sudah terdaftar. Pengalihan permanen
 * agar mesin pencari menganggap halaman kategori sebagai alamat kanoniknya.
 */
export default async function FiturKategoriPage({ params }: PageProps) {
  const { categorySlug } = await params;
  permanentRedirect(`/aplikasi/${categorySlug}`);
}
