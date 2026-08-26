'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Dialog,
  Field,
  Input,
  Select,
  Textarea,
} from '@/components/ui';
import { REQUEST_PRIORITY_LABEL, REQUEST_PRIORITIES } from '@/lib/domain/enums';
import { track } from '@/lib/analytics/track';
import type { CustomRequestDTO } from '@/lib/services/configuration';

const MAX_CUSTOM = 5;
const MIN_STEPS = 1;
const MAX_STEPS = 8;

/**
 * Formulir pengajuan fitur custom (PRD D).
 *
 * Sengaja TERSTRUKTUR, bukan textarea kosong (D2). Textarea kosong menghasilkan
 * permintaan yang tidak bisa diestimasi, dan itulah yang membuat SLA 1×24 jam
 * mustahil dipenuhi. Setiap field di sini menjawab satu pertanyaan yang pasti
 * ditanyakan reviewer: masalahnya apa, siapa penggunanya, dan alurnya bagaimana.
 */
export function CustomFeatureDialog({
  open,
  onClose,
  token,
  groupId,
  existingCount,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  token: string;
  groupId: string | null;
  existingCount: number;
  onCreated: (request: CustomRequestDTO) => void;
}) {
  const [name, setName] = useState('');
  const [problem, setProblem] = useState('');
  const [userRoles, setUserRoles] = useState('');
  const [steps, setSteps] = useState<string[]>(['', '', '']);
  const [priority, setPriority] = useState<(typeof REQUEST_PRIORITIES)[number]>('MUST_HAVE');
  const [reference, setReference] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [redirectConsult, setRedirectConsult] = useState(false);

  const atLimit = existingCount >= MAX_CUSTOM;

  function reset() {
    setName('');
    setProblem('');
    setUserRoles('');
    setSteps(['', '', '']);
    setPriority('MUST_HAVE');
    setReference('');
    setErrors({});
    setGlobalError(null);
    setRedirectConsult(false);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setErrors({});
    setGlobalError(null);

    const filledSteps = steps.map((s) => s.trim()).filter(Boolean);

    try {
      const response = await fetch(`/api/configurations/${token}/custom`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId,
          name,
          problem,
          userRoles,
          flowSteps: filledSteps,
          priority,
          referenceLinks: reference.trim() ? [reference.trim()] : [],
        }),
      });

      const body = (await response.json().catch(() => ({}))) as {
        requestId?: string;
        error?: string;
        fields?: Record<string, string>;
        code?: string;
      };

      if (!response.ok) {
        if (body.fields) setErrors(body.fields);
        if (body.code === 'REDIRECT_CONSULTATION') setRedirectConsult(true);
        setGlobalError(body.error ?? 'Pengajuan gagal dikirim.');
        return;
      }

      track('custom_feature_submitted', { name, category: '', priority }, token);

      onCreated({
        id: body.requestId!,
        name,
        problem,
        userRoles,
        flowSteps: filledSteps,
        priority,
        status: 'PENDING',
        manDayMin: null,
        manDayMax: null,
        riskLevel: null,
        clarificationQuestion: null,
        rejectReason: null,
        slaDueAt: new Date(Date.now() + 86_400_000).toISOString(),
        createdAt: new Date().toISOString(),
      });

      reset();
      onClose();
    } catch {
      setGlobalError('Koneksi terputus. Coba kirim ulang sebentar lagi.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      size="lg"
      title="Fitur yang saya butuhkan tidak ada di sini"
      description="Ceritakan kebutuhannya. Tim kami memberi estimasi dalam 1×24 jam kerja."
      footer={
        redirectConsult ? (
          <Button asChild>
            <Link href={`/konsultasi?dari=${token}&topik=TOO_MANY_CUSTOM`}>
              Jadwalkan konsultasi
            </Link>
          </Button>
        ) : (
          <>
            <span className="mr-auto text-xs text-fg-subtle">
              {existingCount} dari {MAX_CUSTOM} fitur khusus terpakai
            </span>
            <Button
              variant="secondary"
              onClick={() => {
                reset();
                onClose();
              }}
            >
              Batal
            </Button>
            <Button onClick={handleSubmit} isLoading={submitting} disabled={atLimit}>
              Ajukan fitur ini
            </Button>
          </>
        )
      }
    >
      {atLimit ? (
        <Alert tone="warning" title="Batas fitur khusus tercapai">
          Anda sudah mengajukan {MAX_CUSTOM} fitur khusus pada rakitan ini. Kebutuhan sebanyak ini
          lebih baik dibahas langsung — konfigurator bukan alat yang tepat untuk proyek yang
          mayoritasnya custom. Mari jadwalkan sesi konsultasi.
        </Alert>
      ) : (
        <div className="flex flex-col gap-5">
          <Alert tone="info" title="Fitur khusus tidak masuk hitungan harga dulu">
            Kami tidak pernah menampilkan angka yang belum diperiksa manusia. Fitur ini akan muncul
            di rakitan dengan tanda “menunggu estimasi”, dan totalnya diperbarui setelah tim kami
            selesai menilai.
          </Alert>

          <Field
            label="Nama fitur"
            hint="Singkat saja, seperti Anda menyebutnya sehari-hari."
            required
            htmlFor="cf-name"
            error={errors.name}
          >
            <Input
              id="cf-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Rekap komisi sales per bulan"
              invalid={Boolean(errors.name)}
              maxLength={160}
            />
          </Field>

          <Field
            label="Masalah apa yang ingin diselesaikan?"
            hint="Ceritakan kondisi hari ini dan apa yang merepotkan. Ini bagian yang paling membantu kami."
            required
            htmlFor="cf-problem"
            error={errors.problem}
          >
            <Textarea
              id="cf-problem"
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              placeholder="Contoh: Komisi sales sekarang dihitung manual di Excel tiap awal bulan. Sering salah karena aturannya berbeda per produk, dan sales sering protes karena tidak bisa mengecek sendiri."
              rows={4}
              invalid={Boolean(errors.problem)}
            />
          </Field>

          <Field
            label="Siapa yang akan memakai fitur ini?"
            hint="Sebutkan perannya, bukan namanya."
            required
            htmlFor="cf-roles"
            error={errors.userRoles}
          >
            <Input
              id="cf-roles"
              value={userRoles}
              onChange={(e) => setUserRoles(e.target.value)}
              placeholder="Contoh: Admin keuangan dan setiap sales"
              invalid={Boolean(errors.userRoles)}
            />
          </Field>

          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-2">
              <label className="text-sm font-medium text-fg">
                Bagaimana alur idealnya?
                <span className="ml-0.5 text-danger">*</span>
              </label>
              <span className="text-xs text-fg-subtle">Langkah demi langkah</span>
            </div>
            {errors.flowSteps && (
              <p className="text-xs text-danger" role="alert">
                {errors.flowSteps}
              </p>
            )}
            <div className="flex flex-col gap-2">
              {steps.map((step, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-xs font-semibold text-fg-subtle">
                    {index + 1}
                  </span>
                  <Input
                    value={step}
                    onChange={(e) => {
                      const next = [...steps];
                      next[index] = e.target.value;
                      setSteps(next);
                    }}
                    placeholder={
                      index === 0
                        ? 'Admin membuka menu Komisi lalu memilih bulan'
                        : index === 1
                          ? 'Sistem menghitung komisi tiap sales dari transaksi bulan itu'
                          : 'Admin memeriksa hasilnya lalu menguncinya'
                    }
                    maxLength={400}
                  />
                  {steps.length > MIN_STEPS && (
                    <button
                      type="button"
                      onClick={() => setSteps(steps.filter((_, i) => i !== index))}
                      aria-label={`Hapus langkah ${index + 1}`}
                      className="shrink-0 rounded-md p-1.5 text-fg-subtle hover:bg-surface-sunken hover:text-fg"
                    >
                      <svg viewBox="0 0 14 14" className="size-3.5" fill="none" aria-hidden="true">
                        <path d="m4 4 6 6M10 4l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
            {steps.length < MAX_STEPS && (
              <button
                type="button"
                onClick={() => setSteps([...steps, ''])}
                className="self-start text-xs font-medium text-brand underline-offset-2 hover:underline"
              >
                + Tambah langkah
              </button>
            )}
          </div>

          <Field label="Seberapa penting fitur ini?" htmlFor="cf-priority" required>
            <Select
              id="cf-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as typeof priority)}
            >
              {REQUEST_PRIORITIES.map((value) => (
                <option key={value} value={value}>
                  {REQUEST_PRIORITY_LABEL[value]}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Referensi (opsional)"
            hint="Tautan ke aplikasi lain yang sudah punya fitur serupa, bila ada."
            htmlFor="cf-reference"
            error={errors['referenceLinks.0']}
          >
            <Input
              id="cf-reference"
              type="url"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="https://..."
              invalid={Boolean(errors['referenceLinks.0'])}
            />
          </Field>

          {globalError && (
            <Alert tone="danger" title="Pengajuan belum terkirim">
              {globalError}
            </Alert>
          )}
        </div>
      )}
    </Dialog>
  );
}

/** Ringkas satu fitur custom di daftar rakitan. */
export function CustomRequestRow({
  request,
  onRemove,
  disabled,
}: {
  request: CustomRequestDTO;
  onRemove?: (id: string) => void;
  disabled?: boolean;
}) {
  const statusBadge = {
    PENDING: { label: 'Menunggu estimasi', variant: 'warning' as const },
    IN_REVIEW: { label: 'Sedang direview', variant: 'info' as const },
    NEEDS_CLARIFICATION: { label: 'Perlu klarifikasi', variant: 'warning' as const },
    ESTIMATED: { label: 'Sudah diestimasi', variant: 'success' as const },
    REJECTED: { label: 'Tidak dapat dikerjakan', variant: 'danger' as const },
    CONSULT_REQUIRED: { label: 'Perlu konsultasi', variant: 'info' as const },
    PROMOTED: { label: 'Masuk katalog', variant: 'success' as const },
  }[request.status];

  return (
    <div className="rounded-lg border border-type-custom/25 bg-type-custom-soft/40 p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-fg">{request.name}</p>
          <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-fg-muted">
            {request.problem}
          </p>
        </div>
        {onRemove && !disabled && request.status === 'PENDING' && (
          <button
            type="button"
            onClick={() => onRemove(request.id)}
            aria-label={`Hapus pengajuan ${request.name}`}
            className="shrink-0 rounded-md p-1 text-fg-subtle hover:bg-surface-sunken hover:text-fg"
          >
            <svg viewBox="0 0 14 14" className="size-3.5" fill="none" aria-hidden="true">
              <path d="m4 4 6 6M10 4l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
        <Badge variant="outline">{REQUEST_PRIORITY_LABEL[request.priority as 'MUST_HAVE']}</Badge>
      </div>
      {request.clarificationQuestion && (
        <p className="mt-2 rounded-md bg-warning-soft px-2.5 py-2 text-xs leading-relaxed text-warning-soft-fg">
          <strong className="font-semibold">Tim kami bertanya:</strong>{' '}
          {request.clarificationQuestion}
        </p>
      )}
      {request.rejectReason && (
        <p className="mt-2 rounded-md bg-danger-soft px-2.5 py-2 text-xs leading-relaxed text-danger-soft-fg">
          {request.rejectReason}
        </p>
      )}
    </div>
  );
}
