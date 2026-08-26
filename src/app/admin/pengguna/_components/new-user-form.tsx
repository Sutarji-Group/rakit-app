'use client';

import { useState } from 'react';

import { Alert, Button, Dialog, Field, Input, Select } from '@/components/ui';
import { USER_ROLE_LABEL, type UserRole } from '@/lib/domain/enums';
import { createInternalUser } from '../actions';
import { ASSIGNABLE_ROLES, ROLE_SCOPE } from '../_lib/shared';
import { fieldError, useUserAction } from './use-user-action';

const EMPTY = {
  name: '',
  email: '',
  phone: '',
  password: '',
};

/**
 * Form penambahan pengguna internal.
 *
 * Kata sandi awal diketik manusia dan hanya sekali ini terlihat: server
 * langsung meng-hash-nya dan tidak pernah mengembalikannya. Karena itu
 * pengingat untuk menyampaikannya lewat kanal terpisah ditempel di form,
 * bukan disimpan sebagai pengetahuan lisan.
 */
export function NewUserForm() {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<UserRole>('SALES');
  const [form, setForm] = useState(EMPTY);
  const { pending, result, run, reset } = useUserAction();

  const close = () => {
    setOpen(false);
    reset();
  };

  const submit = () => {
    run(
      () =>
        createInternalUser({
          name: form.name,
          email: form.email,
          role,
          password: form.password,
          phone: form.phone,
        }),
      () => {
        setForm(EMPTY);
        setRole('SALES');
        setOpen(false);
      },
    );
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>Tambah pengguna</Button>

      <Dialog
        open={open}
        onClose={close}
        title="Tambah pengguna internal"
        description="Akun langsung aktif dan dapat masuk ke area admin sesuai perannya."
        footer={
          <>
            <Button variant="ghost" onClick={close} disabled={pending}>
              Batal
            </Button>
            <Button onClick={submit} isLoading={pending}>
              Simpan akun
            </Button>
          </>
        }
      >
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          {result && !result.ok && !result.fieldErrors && (
            <Alert tone="danger">{result.message}</Alert>
          )}

          <Field label="Nama lengkap" required error={fieldError(result, 'name')}>
            <Input
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Mis. Rina Kusuma"
              autoComplete="off"
              required
            />
          </Field>

          <Field
            label="Email kantor"
            required
            error={fieldError(result, 'email')}
            hint="Dipakai sebagai nama pengguna saat masuk."
          >
            <Input
              type="email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              placeholder="nama@rakit.id"
              autoComplete="off"
              required
            />
          </Field>

          <Field label="Peran" required error={fieldError(result, 'role')} hint={ROLE_SCOPE[role]}>
            <Select value={role} onChange={(event) => setRole(event.target.value as UserRole)}>
              {ASSIGNABLE_ROLES.map((option) => (
                <option key={option} value={option}>
                  {USER_ROLE_LABEL[option]}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Nomor telepon" hint="Opsional — memudahkan koordinasi cepat.">
            <Input
              value={form.phone}
              onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
              placeholder="08xx xxxx xxxx"
              autoComplete="off"
            />
          </Field>

          <Field
            label="Kata sandi awal"
            required
            error={fieldError(result, 'password')}
            hint="Minimal 8 karakter, memuat huruf dan angka."
          >
            <Input
              type="text"
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              placeholder="Ketik kata sandi sementara"
              autoComplete="off"
              required
            />
          </Field>

          <Alert tone="warning" title="Kata sandi ini hanya terlihat sekarang">
            Setelah disimpan, sistem hanya menyimpan hash-nya. Sampaikan kata sandi awal lewat
            kanal terpisah dan minta pemiliknya segera menggantinya.
          </Alert>

          {/* Tombol tersembunyi supaya menekan Enter di dalam form ikut menyimpan. */}
          <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
        </form>
      </Dialog>
    </>
  );
}
