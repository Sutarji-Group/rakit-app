import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { GitCompareArrows, PackageOpen, Radar } from 'lucide-react';
import { Card } from '@/components/ui';
import { Section } from '@/components/marketing/section';
import { getCurrentUser, isInternal } from '@/lib/auth/session';
import { RegisterForm } from './register-form';

export const metadata: Metadata = {
  title: 'Daftar',
  description:
    'Buat akun Rakit gratis untuk menyimpan beberapa rakitan, membandingkannya berdampingan, ' +
    'dan memantau proyek Anda lewat portal klien.',
  alternates: { canonical: '/daftar' },
  robots: { index: false, follow: true },
};

/** Manfaat mendaftar, ditulis dari sudut pandang pemilik usaha. */
const BENEFITS = [
  {
    icon: PackageOpen,
    title: 'Simpan beberapa rakitan sekaligus',
    body:
      'Satu untuk kebutuhan minimum, satu lagi untuk versi lengkap. Keduanya tersimpan dan bisa ' +
      'dilanjutkan kapan saja dari perangkat mana pun.',
  },
  {
    icon: GitCompareArrows,
    title: 'Bandingkan berdampingan',
    body:
      'Lihat selisih fitur, selisih harga, dan selisih waktu pengerjaan antara dua rakitan dalam ' +
      'satu layar sebelum memutuskan.',
  },
  {
    icon: Radar,
    title: 'Ikuti proyek lewat portal',
    body:
      'Setelah proyek berjalan, Anda melihat sendiri fitur mana yang sedang dikerjakan, tagihan ' +
      'mana yang jatuh tempo, dan apa yang menunggu persetujuan Anda.',
  },
];

/** Token rakitan hanya diterima bila bentuknya masuk akal. */
function safeToken(value: string | undefined): string | null {
  if (!value) return null;
  return /^[a-z0-9]{6,40}$/i.test(value) ? value : null;
}

export default async function DaftarPage({
  searchParams,
}: {
  searchParams: Promise<{ rakitan?: string }>;
}) {
  const query = await searchParams;
  const claimToken = safeToken(query.rakitan);

  const user = await getCurrentUser();
  if (user) redirect(isInternal(user.role) ? '/admin' : '/akun');

  return (
    <Section size="lg">
      <div className="mx-auto grid w-full max-w-5xl gap-10 lg:grid-cols-[1fr_1fr] lg:items-start lg:gap-16">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-3">
            <h1 className="text-balance text-2xl font-semibold leading-tight tracking-[-0.02em] text-fg sm:text-3xl">
              Buat akun gratis
            </h1>
            <p className="max-w-md text-[15px] leading-relaxed text-fg-muted">
              Akun dibutuhkan untuk menyimpan rakitan lebih dari satu, membandingkannya, dan
              mengikuti perkembangan proyek Anda. Tidak ada biaya dan tidak ada kewajiban apa pun.
            </p>
          </div>

          <ul className="flex flex-col gap-5">
            {BENEFITS.map((benefit) => (
              <li key={benefit.title} className="flex gap-3.5">
                <span
                  className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-soft-fg"
                  aria-hidden="true"
                >
                  <benefit.icon className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-fg">{benefit.title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-fg-muted">{benefit.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <Card className="p-5 sm:p-6">
          {claimToken && (
            <p className="mb-4 rounded-lg bg-brand-soft px-3 py-2.5 text-sm leading-relaxed text-brand-soft-fg">
              Rakitan yang sedang Anda susun akan langsung dipindahkan ke akun baru ini, lengkap
              dengan fitur dan estimasi harganya.
            </p>
          )}
          <RegisterForm claimToken={claimToken} />
          <p className="mt-5 border-t border-border pt-4 text-xs leading-relaxed text-fg-subtle">
            Dengan mendaftar, Anda menyetujui{' '}
            <Link href="/syarat-layanan" className="underline underline-offset-2 hover:text-fg-muted">
              Syarat Layanan
            </Link>{' '}
            dan{' '}
            <Link href="/kebijakan-privasi" className="underline underline-offset-2 hover:text-fg-muted">
              Kebijakan Privasi
            </Link>
            . Kami tidak pernah membagikan data Anda ke pihak ketiga.
          </p>
        </Card>
      </div>
    </Section>
  );
}
