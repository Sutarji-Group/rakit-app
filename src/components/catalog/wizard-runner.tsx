'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Badge, Button, Card, FeatureTypeBadge, Progress } from '@/components/ui';
import { track } from '@/lib/analytics/track';
import { cn } from '@/lib/utils';
import { CatalogIcon } from './icon';
import { StartConfigurationButton } from './start-configuration-button';
import type { WizardFeatureView, WizardPresetView, WizardQuestionView } from './types';

interface WizardRunnerProps {
  categorySlug: string;
  categoryName: string;
  questions: WizardQuestionView[];
  presets: WizardPresetView[];
}

/** Fitur rekomendasi setelah digabung dari beberapa jawaban. */
interface RecommendedFeature extends Omit<WizardFeatureView, 'reason'> {
  /** Satu jawaban bisa menghasilkan alasan berbeda untuk fitur yang sama. */
  reasons: string[];
}

/**
 * Wizard rekomendasi fitur (Modul B).
 *
 * Persona Budi — pemilik UKM yang masih memakai Excel dan WhatsApp — tidak
 * tahu nama fitur yang dia butuhkan. Wizard ini menanyakan kondisi bisnisnya
 * (B2), lalu menerjemahkan jawaban menjadi daftar fitur (B3). Sebelum pindah
 * ke konfigurator, seluruh rekomendasi ditampilkan lengkap dengan alasannya
 * (B4) — bagian inilah yang membuat hasilnya dipercaya, bukan terasa ditebak.
 */
export function WizardRunner({
  categorySlug,
  categoryName,
  questions,
  presets,
}: WizardRunnerProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [showSummary, setShowSummary] = useState(false);
  const started = useRef(false);

  // Event ini menandai awal corong wizard. Ref dipakai agar tidak terkirim
  // dua kali saat React menjalankan efek ulang di mode pengembangan.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    track('wizard_started', { category: categorySlug });
  }, [categorySlug]);

  const total = questions.length;
  const question = questions[Math.min(stepIndex, total - 1)];

  const answeredCount = useMemo(
    () => questions.filter((item) => (answers[item.slug] ?? []).length > 0).length,
    [answers, questions],
  );

  /** Gabungan seluruh fitur yang dipetakan jawaban, beserta alasannya (B3/B4). */
  const recommended = useMemo(() => {
    const merged = new Map<string, RecommendedFeature>();
    for (const item of questions) {
      for (const optionSlug of answers[item.slug] ?? []) {
        const option = item.options.find((candidate) => candidate.slug === optionSlug);
        if (!option) continue;
        for (const feature of option.features) {
          const existing = merged.get(feature.id);
          if (existing) {
            if (!existing.reasons.includes(feature.reason)) existing.reasons.push(feature.reason);
            continue;
          }
          const { reason, ...rest } = feature;
          merged.set(feature.id, { ...rest, reasons: [reason] });
        }
      }
    }
    return [...merged.values()];
  }, [answers, questions]);

  /** Rekomendasi dikelompokkan seperti di konfigurator agar mudah dikenali. */
  const groupedRecommendations = useMemo(() => {
    const groups = new Map<string, RecommendedFeature[]>();
    for (const feature of recommended) {
      const bucket = groups.get(feature.groupName);
      if (bucket) bucket.push(feature);
      else groups.set(feature.groupName, [feature]);
    }
    return [...groups.entries()];
  }, [recommended]);

  /**
   * Preset titik awal.
   *
   * Bila beberapa jawaban menyarankan preset berbeda, dipilih paket paling
   * lengkap di antaranya: mengurangi fitur di konfigurator jauh lebih mudah
   * bagi klien daripada menyadari ada kebutuhan yang tidak pernah muncul.
   */
  const chosenPreset = useMemo(() => {
    const suggested = new Set<string>();
    for (const item of questions) {
      for (const optionSlug of answers[item.slug] ?? []) {
        const option = item.options.find((candidate) => candidate.slug === optionSlug);
        if (option?.suggestPresetSlug) suggested.add(option.suggestPresetSlug);
      }
    }
    const matches = presets
      .filter((preset) => suggested.has(preset.slug))
      .sort((a, b) => b.rank - a.rank);
    return matches[0] ?? presets.find((preset) => preset.isDefault) ?? presets[0] ?? null;
  }, [answers, presets, questions]);

  function choose(optionSlug: string) {
    if (!question) return;
    setAnswers((current) => {
      const picked = current[question.slug] ?? [];
      if (question.inputType === 'MULTI') {
        return {
          ...current,
          [question.slug]: picked.includes(optionSlug)
            ? picked.filter((slug) => slug !== optionSlug)
            : [...picked, optionSlug],
        };
      }
      return { ...current, [question.slug]: [optionSlug] };
    });
  }

  function goNext() {
    if (stepIndex + 1 < total) setStepIndex(stepIndex + 1);
    else setShowSummary(true);
  }

  function goBack() {
    if (showSummary) {
      setShowSummary(false);
      return;
    }
    setStepIndex((current) => Math.max(0, current - 1));
  }

  const skipLink = (
    <StartConfigurationButton
      categorySlug={categorySlug}
      source="direct"
      label="Saya sudah tahu apa yang saya butuhkan"
      variant="link"
      size="sm"
      onBeforeStart={() => track('wizard_skipped', { category: categorySlug })}
    />
  );

  // B5: melewati wizard tetap membuka konfigurator dengan preset bawaan,
  // sehingga katalog tidak pernah tampil kosong.
  if (total === 0 || !question) {
    return (
      <Card className="flex flex-col gap-4 p-5">
        <Alert tone="info" title="Panduan pemilihan belum tersedia untuk kategori ini">
          Anda tetap bisa mulai dari paket bawaan {categoryName}, lalu menambah atau mengurangi
          fitur sendiri. Bila ingin dibantu, tim kami siap menemani lewat sesi konsultasi.
        </Alert>
        <div className="flex flex-col gap-2 sm:flex-row">
          <StartConfigurationButton
            categorySlug={categorySlug}
            source="direct"
            label="Buka konfigurator"
          />
          <Button asChild variant="secondary">
            <Link href="/konsultasi">Minta bantuan tim kami</Link>
          </Button>
        </div>
      </Card>
    );
  }

  const picked = answers[question.slug] ?? [];
  const progressValue = showSummary ? 100 : ((stepIndex + 1) / (total + 1)) * 100;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-fg-muted">
            {showSummary ? 'Ringkasan rekomendasi' : `Langkah ${stepIndex + 1} dari ${total}`}
          </p>
          <p className="text-xs text-fg-subtle">
            {showSummary
              ? `${recommended.length} fitur direkomendasikan`
              : 'Tidak ada isian bebas — cukup pilih yang paling mendekati'}
          </p>
        </div>
        <Progress value={progressValue} />
      </div>

      {showSummary ? (
        <SummaryPanel
          categoryName={categoryName}
          categorySlug={categorySlug}
          groupedRecommendations={groupedRecommendations}
          recommendedCount={recommended.length}
          answers={answers}
          answeredCount={answeredCount}
          presetName={chosenPreset?.name ?? null}
          presetSlug={chosenPreset?.slug ?? null}
          onBack={goBack}
          skipLink={skipLink}
        />
      ) : (
        <Card className="flex flex-col gap-5 p-5">
          <fieldset className="flex flex-col gap-4 border-0 p-0">
            <legend className="flex flex-col gap-1.5 p-0">
              <span className="block text-lg font-semibold leading-snug tracking-[-0.01em] text-fg">
                {question.question}
              </span>
              {question.helpText && (
                <span className="block text-sm leading-relaxed text-fg-muted">
                  {question.helpText}
                </span>
              )}
              <span className="block text-xs text-fg-subtle">
                {question.inputType === 'MULTI'
                  ? 'Boleh pilih lebih dari satu.'
                  : 'Pilih satu jawaban.'}
              </span>
            </legend>

            <div className="grid gap-3 sm:grid-cols-2">
              {question.options.map((option) => {
                const selected = picked.includes(option.slug);
                return (
                  <label
                    key={option.slug}
                    className={cn(
                      'relative block cursor-pointer rounded-xl border p-4 transition-[border-color,background-color]',
                      selected
                        ? 'border-brand bg-brand-soft'
                        : 'border-border bg-surface hover:border-border-strong hover:bg-surface-sunken',
                    )}
                  >
                    <input
                      type={question.inputType === 'MULTI' ? 'checkbox' : 'radio'}
                      name={question.slug}
                      value={option.slug}
                      checked={selected}
                      onChange={() => choose(option.slug)}
                      className="peer sr-only"
                    />
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 rounded-xl peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand"
                    />
                    <span className="flex items-start gap-3">
                      <span
                        className={cn(
                          'inline-flex size-10 shrink-0 items-center justify-center rounded-lg',
                          selected
                            ? 'bg-brand text-brand-fg'
                            : 'bg-surface-sunken text-fg-muted',
                        )}
                      >
                        <CatalogIcon name={option.icon} className="size-5" />
                      </span>
                      <span className="flex min-w-0 flex-col gap-1">
                        <span
                          className={cn(
                            'text-sm font-semibold leading-snug',
                            selected ? 'text-brand-soft-fg' : 'text-fg',
                          )}
                        >
                          {option.label}
                        </span>
                        {option.description && (
                          <span className="text-xs leading-relaxed text-fg-muted">
                            {option.description}
                          </span>
                        )}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="flex flex-col gap-3 border-t border-border pt-4">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={goBack}
                disabled={stepIndex === 0}
                className="shrink-0"
              >
                Kembali
              </Button>
              <Button type="button" onClick={goNext} disabled={picked.length === 0} className="flex-1">
                {stepIndex + 1 < total ? 'Lanjut' : 'Lihat rekomendasi'}
              </Button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={goNext}
                className="rounded-md text-xs font-medium text-fg-muted underline-offset-4 hover:text-fg hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                Lewati pertanyaan ini
              </button>
              {skipLink}
            </div>
          </div>
        </Card>
      )}

      {stepIndex === 0 && !showSummary && (
        <p className="text-center text-xs leading-relaxed text-fg-subtle">
          Jawaban Anda hanya dipakai untuk mencentang fitur awal. Semuanya masih bisa diubah di
          konfigurator.
        </p>
      )}
    </div>
  );
}

/**
 * Halaman ringkasan sebelum berpindah ke konfigurator (B4).
 *
 * Setiap fitur muncul bersama kalimat alasannya, misalnya "Direkomendasikan
 * karena Anda punya lebih dari 1 gudang". Tanpa alasan, daftar hasil wizard
 * terbaca seperti tebakan dan klien kehilangan kepercayaan pada angkanya.
 */
function SummaryPanel({
  categoryName,
  categorySlug,
  groupedRecommendations,
  recommendedCount,
  answers,
  answeredCount,
  presetName,
  presetSlug,
  onBack,
  skipLink,
}: {
  categoryName: string;
  categorySlug: string;
  groupedRecommendations: Array<[string, RecommendedFeature[]]>;
  recommendedCount: number;
  answers: Record<string, string[]>;
  answeredCount: number;
  presetName: string | null;
  presetSlug: string | null;
  onBack: () => void;
  skipLink: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5">
      <Card className="flex flex-col gap-4 p-5">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-lg font-semibold leading-snug tracking-[-0.01em] text-fg">
            Ini yang kami sarankan untuk {categoryName} Anda
          </h2>
          <p className="text-sm leading-relaxed text-fg-muted">
            Daftar di bawah disusun dari {answeredCount} jawaban Anda. Setiap fitur disertai
            alasannya, jadi Anda bisa menilai sendiri mana yang benar-benar dibutuhkan.
          </p>
        </div>

        {presetName && (
          <Alert tone="brand" title={`Titik awal: paket ${presetName}`}>
            Konfigurator akan terbuka dengan paket ini sebagai dasar, ditambah fitur hasil jawaban
            Anda. Tidak ada halaman kosong yang harus Anda isi sendiri dari nol.
          </Alert>
        )}

        {recommendedCount === 0 ? (
          <Alert tone="info" title="Belum ada fitur tambahan dari jawaban Anda">
            Bukan masalah. Anda tetap mulai dari paket bawaan {categoryName}, lalu menambah fitur
            satu per satu sambil melihat harganya bergerak.
          </Alert>
        ) : (
          <div className="flex flex-col gap-5">
            {groupedRecommendations.map(([groupName, features]) => (
              <section key={groupName} className="flex flex-col gap-2.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-fg">{groupName}</h3>
                  <Badge variant="neutral">{features.length}</Badge>
                </div>
                <ul className="flex flex-col gap-2.5">
                  {features.map((feature) => (
                    <li
                      key={feature.id}
                      className="rounded-lg border border-border bg-surface-sunken p-3"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-fg">{feature.name}</span>
                        <FeatureTypeBadge type={feature.type} />
                      </div>
                      <ul className="mt-1.5 flex flex-col gap-1">
                        {feature.reasons.map((reason) => (
                          <li
                            key={reason}
                            className="flex gap-2 text-xs leading-relaxed text-fg-muted"
                          >
                            <span aria-hidden="true" className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent-strong" />
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                      <Link
                        href={`/fitur/${categorySlug}/${feature.slug}`}
                        className="mt-2 inline-block rounded-md text-xs font-medium text-brand underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                      >
                        Pelajari fitur ini
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-border pt-4">
          <StartConfigurationButton
            categorySlug={categorySlug}
            presetSlug={presetSlug}
            wizardAnswers={answers}
            source="wizard"
            label="Buka konfigurator dengan fitur ini"
            size="lg"
            fullWidth
            wizardSummary={{ answeredCount, mappedFeatures: recommendedCount }}
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onBack}>
              Ubah jawaban
            </Button>
            {skipLink}
          </div>
        </div>
      </Card>
    </div>
  );
}
