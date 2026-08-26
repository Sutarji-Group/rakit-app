import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { FolderKanban, LineChart, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui';
import { Section } from '@/components/marketing/section';
import { getCurrentUser, isInternal } from '@/lib/auth/session';
import { LoginForm, type DemoAccount } from './login-form';

export const metadata: Metadata = {
  title: 'Masuk',
  description:
    'Masuk ke akun Rakit untuk membuka rakitan tersimpan, membandingkan pilihan, dan memantau ' +
    'proyek Anda lewat portal klien.',
  alternates: { canonical: '/masuk' },
  robots: { index: false, follow: true },
};

/** Alasan orang perlu masuk — ditulis sebagai manfaat, bukan fitur. */
const BENEFITS = [
  {
    icon: FolderKanban,
    title: 'Semua rakitan Anda ada di satu tempat',
    body: 'Lanjutkan dari tempat Anda berhenti, tanpa perlu menyimpan tautan sendiri.',
  },
  {
    icon: LineChart,
    title: 'Pantau proyek yang sedang berjalan',
    body: 'Lihat fitur mana yang sedang dikerjakan, mana yang menunggu persetujuan Anda.',
  },
  {
    icon: ShieldCheck,
    title: 'Riwayat harga yang tercatat',
    body: 'Setiap perubahan rakitan tersimpan lengkap dengan pergerakan angkanya.',
  },
];

/**
 * Akun contoh (hanya di luar produksi).
 *
 * Aplikasi ini dinilai lewat percobaan langsung; tanpa akun contoh, seluruh
 * area akun dan portal tidak dapat dibuka oleh orang yang baru memasangnya.
 */
const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    label: 'Klien contoh',
    description: 'Portal klien: progres proyek, milestone, invoice, dan diskusi.',
    email: 'klien@contoh.id',
    password: 'rakit2026',
  },
  {
    label: 'Admin',
    description: 'Area admin: katalog, mesin harga, pipeline, dan proyek.',
    email: 'admin@rakit.id',
    password: 'rakit2026',
  },
];

/** Hanya jalur internal yang boleh dipakai sebagai tujuan setelah masuk. */
function safeNextPath(value: string | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith('/') || value.startsWith('//')) return null;
  if (value.length > 300) return null;
  return value;
}

export default async function MasukPage({
  searchParams,
}: {
  searchParams: Promise<{ lanjut?: string }>;
}) {
  const query = await searchParams;
  const nextPath = safeNextPath(query.lanjut);

  // Orang yang sudah masuk tidak perlu melihat formulir ini lagi.
  const user = await getCurrentUser();
  if (user) redirect(nextPath ?? (isInternal(user.role) ? '/admin' : '/akun'));

  const showDemo = process.env.NODE_ENV !== 'production';

  return (
    <Section size="lg">
      <div className="mx-auto grid w-full max-w-5xl gap-10 lg:grid-cols-[1fr_1fr] lg:items-start lg:gap-16">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-3">
            <h1 className="text-balance text-2xl font-semibold leading-tight tracking-[-0.02em] text-fg sm:text-3xl">
              Masuk ke akun Anda
            </h1>
            <p className="max-w-md text-[15px] leading-relaxed text-fg-muted">
              Rakitan, penawaran, dan proyek Anda tersimpan di satu akun. Tidak ada biaya untuk
              membuat maupun menggunakannya.
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
          {nextPath && (
            <p className="mb-4 rounded-lg bg-brand-soft px-3 py-2.5 text-sm leading-relaxed text-brand-soft-fg">
              Masuk dulu untuk melanjutkan ke halaman yang Anda tuju.
            </p>
          )}
          <LoginForm nextPath={nextPath} demoAccounts={showDemo ? DEMO_ACCOUNTS : []} />
          <p className="mt-5 border-t border-border pt-4 text-xs leading-relaxed text-fg-subtle">
            Dengan masuk, Anda menyetujui{' '}
            <Link href="/syarat-layanan" className="underline underline-offset-2 hover:text-fg-muted">
              Syarat Layanan
            </Link>{' '}
            dan{' '}
            <Link href="/kebijakan-privasi" className="underline underline-offset-2 hover:text-fg-muted">
              Kebijakan Privasi
            </Link>{' '}
            kami.
          </p>
        </Card>
      </div>
    </Section>
  );
}
