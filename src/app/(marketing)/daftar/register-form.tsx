'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { UserPlus } from 'lucide-react';
import { Alert, Button, Field, Input } from '@/components/ui';

interface RegisterResponse {
  redirectTo?: string;
  error?: string;
  fields?: Record<string, string>;
}

/**
 * Formulir pendaftaran akun klien (G1).
 *
 * Bila orang tiba dari konfigurator, token rakitannya dikirim sebagai
 * claimToken sehingga rakitan anonim yang sudah disusun ikut pindah ke akun
 * baru. Kehilangan rakitan di langkah pendaftaran adalah cara termudah
 * kehilangan calon klien yang sudah hampir selesai.
 */
export function RegisterForm({ claimToken }: { claimToken: string | null }) {
  const router = useRouter();
  const [isSending, setIsSending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSending) return;

    const form = new FormData(event.currentTarget);
    const company = String(form.get('company') ?? '').trim();
    const phone = String(form.get('phone') ?? '').trim();

    setIsSending(true);
    setFormError(null);
    setFieldErrors({});

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: String(form.get('name') ?? '').trim(),
          email: String(form.get('email') ?? '').trim(),
          password: String(form.get('password') ?? ''),
          company: company.length > 0 ? company : undefined,
          phone: phone.length > 0 ? phone : undefined,
          claimToken: claimToken ?? undefined,
        }),
      });

      const data = (await response.json()) as RegisterResponse;

      if (!response.ok) {
        setFormError(data.error ?? 'Pendaftaran gagal. Coba lagi sebentar lagi.');
        setFieldErrors(data.fields ?? {});
        setIsSending(false);
        return;
      }

      // Rakitan yang baru dikaitkan langsung dibuka kembali agar orang melihat
      // pekerjaannya tidak hilang.
      router.replace(claimToken ? `/rakit/${claimToken}` : (data.redirectTo ?? '/akun'));
      router.refresh();
    } catch {
      setFormError('Jaringan sedang bermasalah. Periksa koneksi Anda lalu coba lagi.');
      setIsSending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      {formError && <Alert tone="danger">{formError}</Alert>}

      <Field label="Nama lengkap" htmlFor="name" error={fieldErrors.name} required>
        <Input
          id="name"
          name="name"
          autoComplete="name"
          required
          placeholder="Budi Santoso"
          invalid={Boolean(fieldErrors.name)}
        />
      </Field>

      <Field label="Email kerja" htmlFor="email" error={fieldErrors.email} required>
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder="nama@perusahaan.co.id"
          invalid={Boolean(fieldErrors.email)}
        />
      </Field>

      <Field
        label="Kata sandi"
        htmlFor="password"
        error={fieldErrors.password}
        hint="Minimal 8 karakter, memuat huruf dan angka."
        required
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="Buat kata sandi"
          invalid={Boolean(fieldErrors.password)}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nama usaha" htmlFor="company" error={fieldErrors.company} hint="Opsional">
          <Input
            id="company"
            name="company"
            autoComplete="organization"
            placeholder="CV Sumber Rejeki"
            invalid={Boolean(fieldErrors.company)}
          />
        </Field>

        <Field label="Nomor WhatsApp" htmlFor="phone" error={fieldErrors.phone} hint="Opsional">
          <Input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="0812-3456-7890"
            invalid={Boolean(fieldErrors.phone)}
          />
        </Field>
      </div>

      <Button
        type="submit"
        size="lg"
        isLoading={isSending}
        leadingIcon={<UserPlus className="size-4" aria-hidden="true" />}
      >
        {isSending ? 'Membuat akun…' : 'Buat akun gratis'}
      </Button>

      <p className="text-center text-sm text-fg-muted">
        Sudah punya akun?{' '}
        <Link href="/masuk" className="font-medium text-brand underline-offset-4 hover:underline">
          Masuk di sini
        </Link>
      </p>
    </form>
  );
}
