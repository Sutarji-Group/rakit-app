'use client';

import { useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  EmptyState,
  Field,
  Input,
  Select,
  Switch,
  Tabs,
  Textarea,
} from '@/components/ui';
import {
  WIZARD_INPUT_TYPES,
  type FeatureType,
  type PublishStatus,
  type WizardInputType,
} from '@/lib/domain/enums';
import {
  deleteWizardMapping,
  deleteWizardOption,
  deleteWizardQuestion,
  saveWizardMapping,
  saveWizardOption,
  saveWizardQuestion,
} from '@/app/admin/katalog/wizard/actions';
import { MAX_WIZARD_QUESTIONS, WIZARD_INPUT_TYPE_LABEL } from './shared';
import { fieldError, useCatalogAction } from './use-action';

export interface WizardFeatureItem {
  id: string;
  name: string;
  groupName: string;
  type: FeatureType;
  status: PublishStatus;
}

export interface WizardMappingItem {
  id: string;
  featureId: string;
  featureName: string;
  reason: string;
}

export interface WizardOptionItem {
  id: string;
  slug: string;
  label: string;
  description: string;
  icon: string;
  sortOrder: number;
  suggestPresetSlug: string;
  mappings: WizardMappingItem[];
}

export interface WizardQuestionItem {
  id: string;
  categoryId: string;
  slug: string;
  question: string;
  helpText: string;
  inputType: WizardInputType;
  sortOrder: number;
  isActive: boolean;
  options: WizardOptionItem[];
}

interface QuestionFormState {
  id?: string;
  slug: string;
  question: string;
  helpText: string;
  inputType: WizardInputType;
  sortOrder: string;
  isActive: boolean;
}

interface OptionFormState {
  id?: string;
  questionId: string;
  slug: string;
  label: string;
  description: string;
  icon: string;
  sortOrder: string;
  suggestPresetSlug: string;
}

interface MappingFormState {
  optionId: string;
  featureId: string;
  reason: string;
}

/**
 * Editor aturan pemetaan wizard (L5).
 *
 * Wizard adalah jalur bagi klien yang belum tahu apa yang dibutuhkannya (B).
 * Setiap pemetaan wajib membawa alasan karena itulah yang membuat rekomendasi
 * terasa seperti saran konsultan, bukan daftar fitur acak (B4).
 */
export function WizardManager({
  categories,
  questions,
  featuresByCategory,
  presetsByCategory,
}: {
  categories: Array<{ id: string; slug: string; name: string; status: PublishStatus }>;
  questions: WizardQuestionItem[];
  featuresByCategory: Record<string, WizardFeatureItem[]>;
  presetsByCategory: Record<string, Array<{ slug: string; name: string }>>;
}) {
  const { pending, result, run, reset } = useCatalogAction();
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '');
  const [questionForm, setQuestionForm] = useState<QuestionFormState | null>(null);
  const [optionForm, setOptionForm] = useState<OptionFormState | null>(null);
  const [mappingForm, setMappingForm] = useState<MappingFormState | null>(null);

  if (categories.length === 0) {
    return (
      <EmptyState
        title="Belum ada kategori aplikasi"
        description="Aturan wizard selalu melekat pada satu kategori. Buat kategori beserta fiturnya lebih dulu, lalu susun pertanyaan yang mengantar klien ke rakitan yang tepat."
      />
    );
  }

  const categoryQuestions = questions
    .filter((question) => question.categoryId === categoryId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const features = featuresByCategory[categoryId] ?? [];
  const presets = presetsByCategory[categoryId] ?? [];
  const quotaReached = categoryQuestions.length >= MAX_WIZARD_QUESTIONS;

  const openQuestion = (question?: WizardQuestionItem) => {
    reset();
    setQuestionForm(
      question
        ? {
            id: question.id,
            slug: question.slug,
            question: question.question,
            helpText: question.helpText,
            inputType: question.inputType,
            sortOrder: String(question.sortOrder),
            isActive: question.isActive,
          }
        : {
            slug: '',
            question: '',
            helpText: '',
            inputType: 'SINGLE',
            sortOrder: String(categoryQuestions.length + 1),
            isActive: true,
          },
    );
  };

  const openOption = (questionId: string, option?: WizardOptionItem) => {
    reset();
    setOptionForm(
      option
        ? {
            id: option.id,
            questionId,
            slug: option.slug,
            label: option.label,
            description: option.description,
            icon: option.icon,
            sortOrder: String(option.sortOrder),
            suggestPresetSlug: option.suggestPresetSlug,
          }
        : {
            questionId,
            slug: '',
            label: '',
            description: '',
            icon: 'Circle',
            sortOrder: '1',
            suggestPresetSlug: '',
          },
    );
  };

  return (
    <div className="flex flex-col gap-5">
      <Tabs
        items={categories.map((category) => ({
          value: category.id,
          label: category.name,
          count: questions.filter((question) => question.categoryId === category.id).length,
        }))}
        value={categoryId}
        onChange={setCategoryId}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-fg-muted">
          <span className="tabular">{categoryQuestions.length}</span> dari maksimal{' '}
          <span className="tabular">{MAX_WIZARD_QUESTIONS}</span> pertanyaan. Wizard yang terlalu
          panjang membuat klien berhenti sebelum sampai ke konfigurator (B1).
        </p>
        <Button onClick={() => openQuestion()} disabled={quotaReached}>
          Tambah pertanyaan
        </Button>
      </div>

      {quotaReached && (
        <Alert tone="warning" title="Kuota pertanyaan sudah penuh">
          Gabungkan atau hapus pertanyaan lain lebih dulu bila ingin menambah yang baru.
        </Alert>
      )}

      {categoryQuestions.length === 0 ? (
        <EmptyState
          title="Belum ada pertanyaan wizard di kategori ini"
          description="Wizard menanyakan cara kerja klien, lalu menerjemahkannya menjadi rekomendasi fitur beserta alasannya. Mulai dari satu pertanyaan yang paling menentukan bentuk aplikasinya."
          action={<Button onClick={() => openQuestion()}>Tambah pertanyaan</Button>}
        />
      ) : (
        <div className="flex flex-col gap-4">
          {categoryQuestions.map((question, index) => (
            <Card key={question.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="neutral">
                    <span className="tabular">Pertanyaan {index + 1}</span>
                  </Badge>
                  <CardTitle>{question.question}</CardTitle>
                  <Badge variant={question.isActive ? 'success' : 'neutral'}>
                    {question.isActive ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                  <Badge variant="info">{WIZARD_INPUT_TYPE_LABEL[question.inputType]}</Badge>
                </div>
                <CardDescription>
                  {question.helpText || 'Belum ada teks bantuan untuk klien.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="secondary" onClick={() => openQuestion(question)}>
                    Ubah pertanyaan
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => openOption(question.id)}>
                    Tambah opsi jawaban
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-danger"
                    disabled={pending}
                    onClick={() => run(() => deleteWizardQuestion(question.id))}
                  >
                    Hapus pertanyaan
                  </Button>
                </div>

                {question.options.length === 0 ? (
                  <p className="text-sm text-fg-muted">
                    Belum ada opsi jawaban. Pertanyaan tanpa opsi tidak akan muncul di wizard.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {question.options.map((option) => (
                      <li key={option.id} className="rounded-lg border border-border p-3.5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-fg">{option.label}</p>
                            <p className="text-xs text-fg-subtle">/{option.slug}</p>
                            {option.description && (
                              <p className="mt-0.5 max-w-xl text-xs leading-snug text-fg-muted">
                                {option.description}
                              </p>
                            )}
                            {option.suggestPresetSlug && (
                              <Badge variant="brand" className="mt-1.5">
                                Menyarankan preset {option.suggestPresetSlug}
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openOption(question.id, option)}
                            >
                              Ubah
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                reset();
                                setMappingForm({
                                  optionId: option.id,
                                  featureId: features[0]?.id ?? '',
                                  reason: '',
                                });
                              }}
                              disabled={features.length === 0}
                            >
                              Petakan fitur
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-danger"
                              disabled={pending}
                              onClick={() => run(() => deleteWizardOption(option.id))}
                            >
                              Hapus
                            </Button>
                          </div>
                        </div>

                        {option.mappings.length === 0 ? (
                          <p className="mt-3 text-xs text-fg-subtle">
                            Opsi ini belum memetakan fitur apa pun, jadi memilihnya tidak mengubah
                            rekomendasi.
                          </p>
                        ) : (
                          <ul className="mt-3 flex flex-col divide-y divide-border">
                            {option.mappings.map((mapping) => (
                              <li
                                key={mapping.id}
                                className="flex flex-wrap items-start gap-3 py-2 first:pt-0"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm text-fg">{mapping.featureName}</p>
                                  <p className="text-xs leading-snug text-fg-muted">
                                    {mapping.reason}
                                  </p>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-danger"
                                  disabled={pending}
                                  onClick={() => run(() => deleteWizardMapping(mapping.id))}
                                >
                                  Lepas
                                </Button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {questionForm && (
        <Dialog
          open
          onClose={() => setQuestionForm(null)}
          title={questionForm.id ? 'Ubah pertanyaan wizard' : 'Pertanyaan wizard baru'}
          description="Tanyakan cara kerja klien, bukan fitur yang diinginkannya."
          footer={
            <>
              <Button variant="ghost" onClick={() => setQuestionForm(null)}>
                Batal
              </Button>
              <Button
                isLoading={pending}
                onClick={() =>
                  run(
                    () =>
                      saveWizardQuestion({
                        id: questionForm.id,
                        categoryId,
                        slug: questionForm.slug,
                        question: questionForm.question,
                        helpText: questionForm.helpText,
                        inputType: questionForm.inputType,
                        sortOrder: Number(questionForm.sortOrder) || 0,
                        isActive: questionForm.isActive,
                      }),
                    { onSuccess: () => setQuestionForm(null) },
                  )
                }
              >
                Simpan pertanyaan
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            {result && !result.ok && <Alert tone="danger">{result.message}</Alert>}
            <Field label="Pertanyaan" required error={fieldError(result, 'question')}>
              <Textarea
                value={questionForm.question}
                onChange={(event) =>
                  setQuestionForm({ ...questionForm, question: event.target.value })
                }
                placeholder="Berapa lokasi gudang yang Anda kelola?"
              />
            </Field>
            <Field label="Teks bantuan" hint="Kalimat penjelas di bawah pertanyaan.">
              <Input
                value={questionForm.helpText}
                onChange={(event) =>
                  setQuestionForm({ ...questionForm, helpText: event.target.value })
                }
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Slug" error={fieldError(result, 'slug')}>
                <Input
                  value={questionForm.slug}
                  onChange={(event) =>
                    setQuestionForm({ ...questionForm, slug: event.target.value })
                  }
                />
              </Field>
              <Field label="Jenis jawaban">
                <Select
                  value={questionForm.inputType}
                  onChange={(event) =>
                    setQuestionForm({
                      ...questionForm,
                      inputType: event.target.value as WizardInputType,
                    })
                  }
                >
                  {WIZARD_INPUT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {WIZARD_INPUT_TYPE_LABEL[type]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Urutan">
                <Input
                  type="number"
                  value={questionForm.sortOrder}
                  onChange={(event) =>
                    setQuestionForm({ ...questionForm, sortOrder: event.target.value })
                  }
                />
              </Field>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={questionForm.isActive}
                onCheckedChange={(next) =>
                  setQuestionForm({ ...questionForm, isActive: next })
                }
                label="Aktifkan pertanyaan"
                size="sm"
              />
              <span className="text-sm text-fg-muted">
                Pertanyaan nonaktif dilewati wizard tanpa dihapus.
              </span>
            </div>
          </div>
        </Dialog>
      )}

      {optionForm && (
        <Dialog
          open
          onClose={() => setOptionForm(null)}
          title={optionForm.id ? 'Ubah opsi jawaban' : 'Opsi jawaban baru'}
          footer={
            <>
              <Button variant="ghost" onClick={() => setOptionForm(null)}>
                Batal
              </Button>
              <Button
                isLoading={pending}
                onClick={() =>
                  run(
                    () =>
                      saveWizardOption({
                        id: optionForm.id,
                        questionId: optionForm.questionId,
                        slug: optionForm.slug,
                        label: optionForm.label,
                        description: optionForm.description,
                        icon: optionForm.icon,
                        sortOrder: Number(optionForm.sortOrder) || 0,
                        suggestPresetSlug: optionForm.suggestPresetSlug,
                      }),
                    { onSuccess: () => setOptionForm(null) },
                  )
                }
              >
                Simpan opsi
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            {result && !result.ok && <Alert tone="danger">{result.message}</Alert>}
            <Field label="Label opsi" required error={fieldError(result, 'label')}>
              <Input
                value={optionForm.label}
                onChange={(event) => setOptionForm({ ...optionForm, label: event.target.value })}
                placeholder="Lebih dari satu gudang"
              />
            </Field>
            <Field label="Deskripsi singkat">
              <Input
                value={optionForm.description}
                onChange={(event) =>
                  setOptionForm({ ...optionForm, description: event.target.value })
                }
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Slug" error={fieldError(result, 'slug')}>
                <Input
                  value={optionForm.slug}
                  onChange={(event) => setOptionForm({ ...optionForm, slug: event.target.value })}
                />
              </Field>
              <Field label="Ikon" hint="Nama ikon lucide.">
                <Input
                  value={optionForm.icon}
                  onChange={(event) => setOptionForm({ ...optionForm, icon: event.target.value })}
                />
              </Field>
              <Field label="Urutan">
                <Input
                  type="number"
                  value={optionForm.sortOrder}
                  onChange={(event) =>
                    setOptionForm({ ...optionForm, sortOrder: event.target.value })
                  }
                />
              </Field>
            </div>
            <Field
              label="Preset yang disarankan"
              hint="Opsional. Bila diisi, memilih opsi ini menjadikan preset tersebut basis rakitan."
              error={fieldError(result, 'suggestPresetSlug')}
            >
              <Select
                value={optionForm.suggestPresetSlug}
                onChange={(event) =>
                  setOptionForm({ ...optionForm, suggestPresetSlug: event.target.value })
                }
              >
                <option value="">Tanpa preset</option>
                {presets.map((preset) => (
                  <option key={preset.slug} value={preset.slug}>
                    {preset.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </Dialog>
      )}

      {mappingForm && (
        <Dialog
          open
          onClose={() => setMappingForm(null)}
          title="Petakan opsi ke fitur"
          description="Alasan wajib diisi — kalimat inilah yang dibaca klien sebagai penjelasan rekomendasi (B4)."
          footer={
            <>
              <Button variant="ghost" onClick={() => setMappingForm(null)}>
                Batal
              </Button>
              <Button
                isLoading={pending}
                onClick={() =>
                  run(
                    () =>
                      saveWizardMapping({
                        optionId: mappingForm.optionId,
                        featureId: mappingForm.featureId,
                        reason: mappingForm.reason,
                      }),
                    { onSuccess: () => setMappingForm(null) },
                  )
                }
              >
                Simpan pemetaan
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            {result && !result.ok && <Alert tone="danger">{result.message}</Alert>}
            <Field label="Fitur" required>
              <Select
                value={mappingForm.featureId}
                onChange={(event) =>
                  setMappingForm({ ...mappingForm, featureId: event.target.value })
                }
              >
                {features.map((feature) => (
                  <option key={feature.id} value={feature.id}>
                    {feature.groupName} — {feature.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Alasan rekomendasi" required error={fieldError(result, 'reason')}>
              <Textarea
                value={mappingForm.reason}
                onChange={(event) =>
                  setMappingForm({ ...mappingForm, reason: event.target.value })
                }
                placeholder="Karena Anda mengelola lebih dari satu gudang, perpindahan stok antar lokasi perlu tercatat sendiri."
              />
            </Field>
          </div>
        </Dialog>
      )}
    </div>
  );
}
