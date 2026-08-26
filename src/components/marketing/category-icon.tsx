import {
  Boxes,
  Building2,
  ClipboardList,
  CreditCard,
  Factory,
  Handshake,
  LayoutGrid,
  Package,
  ShoppingCart,
  Store,
  Truck,
  Users,
  Warehouse,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

/**
 * Katalog menyimpan nama ikon sebagai teks (mis. “Warehouse”).
 *
 * Pemetaan ini sengaja statis dan terbatas: memuat seluruh pustaka ikon hanya
 * untuk empat kategori akan memberatkan halaman pertama yang dibuka pengunjung,
 * dan halaman ini dijaga tetap ringan untuk koneksi seluler.
 */
const ICONS: Record<string, LucideIcon> = {
  Warehouse,
  Boxes,
  Package,
  Truck,
  Factory,
  Building2,
  Handshake,
  Users,
  Store,
  ShoppingCart,
  CreditCard,
  ClipboardList,
  Wrench,
};

export function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? LayoutGrid;
  return <Icon className={className} strokeWidth={1.6} aria-hidden="true" />;
}
