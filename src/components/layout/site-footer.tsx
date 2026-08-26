import Link from 'next/link';
import { site } from '@/lib/site';
import { Logo } from './logo';

const COLUMNS = [
  {
    title: 'Produk',
    links: [
      { href: '/aplikasi', label: 'Katalog aplikasi' },
      { href: '/cara-kerja', label: 'Cara kerja' },
      { href: '/harga', label: 'Struktur harga' },
      { href: '/fitur', label: 'Jelajahi fitur' },
    ],
  },
  {
    title: 'Jenis aplikasi',
    links: [
      { href: '/aplikasi/wms', label: 'Sistem gudang (WMS)' },
      { href: '/aplikasi/crm', label: 'Manajemen pelanggan (CRM)' },
      { href: '/aplikasi/pos', label: 'Aplikasi kasir (POS)' },
      { href: '/konsultasi', label: 'Aplikasi lain' },
    ],
  },
  {
    title: 'Perusahaan',
    links: [
      { href: '/konsultasi', label: 'Hubungi kami' },
      { href: '/masuk', label: 'Portal klien' },
      { href: '/kebijakan-privasi', label: 'Kebijakan privasi' },
      { href: '/syarat-layanan', label: 'Syarat layanan' },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface-sunken/40">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="flex flex-col gap-3">
            <Logo />
            <p className="max-w-xs text-sm leading-relaxed text-fg-muted">
              Kami menjual jasa pembuatan aplikasi dengan harga yang bisa Anda lihat sendiri,
              sebelum bicara dengan siapa pun.
            </p>
            <div className="mt-1 flex flex-col gap-1 text-sm text-fg-muted">
              <a href={`mailto:${site.email}`} className="hover:text-fg">
                {site.email}
              </a>
              <a href={`tel:${site.phone.replace(/\s/g, '')}`} className="hover:text-fg">
                {site.phone}
              </a>
            </div>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.title} className="flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
                {column.title}
              </p>
              <ul className="flex flex-col gap-2">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-fg-muted hover:text-fg">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-border pt-6 text-xs text-fg-subtle sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {site.legalName}. Seluruh hak cipta dilindungi.
          </p>
          <p>{site.address}</p>
        </div>
      </div>
    </footer>
  );
}
