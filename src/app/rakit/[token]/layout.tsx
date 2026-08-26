import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Rakit aplikasi Anda',
  // Halaman rakitan bersifat pribadi bagi pemilik tautannya dan tidak boleh
  // muncul di hasil pencarian (NFR Keamanan: proteksi scraping katalog).
  robots: { index: false, follow: false },
};

export default function RakitLayout({ children }: { children: React.ReactNode }) {
  return children;
}
