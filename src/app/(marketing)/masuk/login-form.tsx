'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { LogIn, Wand2 } from 'lucide-react';
import { Alert, Button, Field, Input } from '@/components/ui';

interface LoginResponse {
  role?: string;
  redirectTo?: string;
  error?: string;
  fields?: Record<string, string>;
}

export interface DemoAccount {
  label: string;
  description: string;
  email: string;
  password: string;
}

/**
 * Formulir masuk (G1).
 *
 * Tujuan setelah berhasil ditentukan dengan urutan: parameter ?lanjut lebih
 * dulu — orang yang tadinya hendak membuka portal atau halaman akun kembali ke
 * sana, bukan terlempar ke beranda — baru redirectTo dari server. Parameter
 * ?lanjut sudah dibersihkan di sisi server sehingga hanya berisi jalur internal.
 */
export function LoginForm({
  nextPath,
  demoAccounts = [],
}: {
  nextPath: string | null;
  demoAccounts?: DemoAccount[];
}) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function fillDemo(account: DemoAccount) {
    setEmail(account.email);
    setPassword(account.password);
    setFormError(null);
    setFieldErrors({});
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSending) return;

    setIsSending(true);
    setFormError(null);
    setFieldErrors({});

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data = (await response.json()) as LoginResponse;

      if (!response.ok) {
        setFormError(data.error ?? 'Gagal masuk. Coba lagi sebentar lagi.');
        setFieldErrors(data.fields ?? {});
        setIsSending(false);
        return;
      }

      // router.refresh() penting: header dan seluruh Server Component perlu
      // dirender ulang agar tahu pengguna sudah masuk.
      router.replace(nextPath ?? data.redirectTo ?? '/akun');
      router.refresh();
    } catch {
      setFormError('Jaringan sedang bermasalah. Periksa koneksi Anda lalu coba lagi.');
      setIsSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        {formError && <Alert tone="danger">{formError}</Alert>}

        <Field label="Email" htmlFor="email" error={fieldErrors.email} required>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="nama@perusahaan.co.id"
            invalid={Boolean(fieldErrors.email)}
          />
        </Field>

        <Field label="Kata sandi" htmlFor="password" error={fieldErrors.password} required>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Kata sandi Anda"
            invalid={Boolean(fieldErrors.password)}
          />
        </Field>

        <Button
          type="submit"
          size="lg"
          isLoading={isSending}
          leadingIcon={<LogIn className="size-4" aria-hidden="true" />}
        >
          {isSending ? 'Memeriksa…' : 'Masuk'}
        </Button>

        <p className="text-center text-sm text-fg-muted">
          Belum punya akun?{' '}
          <Link href="/daftar" className="font-medium text-brand underline-offset-4 hover:underline">
            Daftar gratis
          </Link>
        </p>
      </form>

      {demoAccounts.length > 0 && (
        <div className="rounded-xl border border-dashed border-border bg-surface-sunken/50 p-4">
          <p className="text-sm font-medium text-fg">Akun contoh untuk mencoba</p>
          <p className="mt-1 text-xs leading-relaxed text-fg-muted">
            Hanya muncul di lingkungan pengembangan. Ketuk salah satu untuk mengisi formulir.
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {demoAccounts.map((account) => (
              <li key={account.email}>
                <button
                  type="button"
                  onClick={() => fillDemo(account)}
                  className="flex w-full items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5 text-left transition-colors hover:border-border-strong hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  <Wand2 className="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-fg">{account.label}</span>
                    <span className="block truncate text-xs text-fg-muted">
                      {account.email} · {account.password}
                    </span>
                    <span className="block text-xs text-fg-subtle">{account.description}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
