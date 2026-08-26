'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  Field,
  Select,
  Table,
  TableWrapper,
  Td,
  Textarea,
  Th,
  Tr,
  useToast,
} from '@/components/ui';
import { applyCatalogImport, previewCatalogImport } from '@/app/admin/katalog/impor/actions';
import {
  CATALOG_CSV_COLUMNS,
  CSV_ROW_STATUSES,
  CSV_ROW_STATUS_LABEL,
  CSV_ROW_STATUS_VARIANT,
  type CsvPreview,
} from './shared';

/**
 * Panel impor & ekspor katalog CSV (L6).
 *
 * Impor selalu dua langkah: pratinjau lebih dulu, simpan belakangan. Satu
 * berkas dapat mengubah ratusan baris man-day sekaligus, dan man-day adalah
 * dasar seluruh harga — kesalahan di sini merambat ke setiap penawaran.
 */
export function CsvImportPanel({
  categories,
}: {
  categories: Array<{ slug: string; name: string }>;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [exportCategory, setExportCategory] = useState('');
  const [fileName, setFileName] = useState('');
  const [text, setText] = useState('');
  const [preview, setPreview] = useState<CsvPreview | null>(null);

  const readFile = async (file: File | undefined) => {
    if (!file) return;
    const content = await file.text();
    setFileName(file.name);
    setText(content);
    setPreview(null);
  };

  const runPreview = () => {
    if (!text.trim()) return;
    startTransition(async () => {
      const result = await previewCatalogImport(text);
      setPreview(result);
      if (result.fatalError) {
        toast({ title: 'Berkas CSV tidak dapat dibaca', description: result.fatalError, tone: 'danger' });
      }
    });
  };

  const runApply = () => {
    startTransition(async () => {
      const outcome = await applyCatalogImport(text);
      toast({
        title: outcome.message,
        description: outcome.warnings?.length ? outcome.warnings.join(' ') : undefined,
        tone: outcome.ok ? (outcome.warnings?.length ? 'warning' : 'success') : 'danger',
        durationMs: outcome.warnings?.length ? 10_000 : 4_500,
      });
      if (outcome.ok) {
        setPreview(null);
        setText('');
        setFileName('');
        router.refresh();
      }
    });
  };

  const applicable = preview ? preview.counts.NEW + preview.counts.CHANGED : 0;

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader>
          <CardTitle>Ekspor katalog</CardTitle>
          <CardDescription>
            Satu baris per fitur, siap dibuka di spreadsheet untuk kalibrasi man-day bersama tim.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <Field label="Kategori" className="min-w-56">
            <Select
              value={exportCategory}
              onChange={(event) => setExportCategory(event.target.value)}
            >
              <option value="">Seluruh kategori</option>
              {categories.map((category) => (
                <option key={category.slug} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </Select>
          </Field>
          <Button asChild>
            <a
              href={
                exportCategory
                  ? `/admin/katalog/impor/ekspor?kategori=${encodeURIComponent(exportCategory)}`
                  : '/admin/katalog/impor/ekspor'
              }
            >
              Unduh CSV
            </a>
          </Button>
          <p className="text-xs text-fg-subtle">
            Kolom: {CATALOG_CSV_COLUMNS.join(', ')}.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Impor katalog</CardTitle>
          <CardDescription>
            Unggah berkas dengan kolom yang sama seperti hasil ekspor. Perubahan baru tersimpan
            setelah Anda menyetujui pratinjaunya.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field label="Berkas CSV" hint={fileName ? `Terbaca: ${fileName}` : undefined}>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => {
                void readFile(event.target.files?.[0]);
              }}
              className="block w-full cursor-pointer rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg file:mr-3 file:rounded-md file:border-0 file:bg-surface-sunken file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-fg"
            />
          </Field>

          <Field label="Atau tempel isi CSV di sini">
            <Textarea
              value={text}
              onChange={(event) => {
                setText(event.target.value);
                setPreview(null);
              }}
              className="font-mono text-xs"
              placeholder={`${CATALOG_CSV_COLUMNS.join(',')}\nwms,penerimaan,terima-barang,Terima barang masuk,Catat barang yang turun dari truk,STANDARD,3,4,ya,PUBLISHED`}
            />
          </Field>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" isLoading={pending} disabled={!text.trim()} onClick={runPreview}>
              Pratinjau perubahan
            </Button>
            <Button
              isLoading={pending}
              disabled={!preview || Boolean(preview.fatalError) || applicable === 0}
              onClick={runApply}
            >
              Simpan {applicable} baris
            </Button>
          </div>
        </CardContent>
      </Card>

      {preview && !preview.fatalError && (
        <Card>
          <CardHeader>
            <CardTitle>Pratinjau perubahan</CardTitle>
            <CardDescription>
              Baris tidak berubah tidak ditulis ulang, dan baris bermasalah dilewati.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              {CSV_ROW_STATUSES.map((status) => (
                <Badge key={status} variant={CSV_ROW_STATUS_VARIANT[status]} size="md">
                  {CSV_ROW_STATUS_LABEL[status]}:{' '}
                  <span className="tabular">{preview.counts[status]}</span>
                </Badge>
              ))}
            </div>

            {preview.counts.INVALID > 0 && (
              <Alert tone="danger" title="Ada baris yang tidak dapat disimpan">
                Baris bermasalah dilewati sepenuhnya. Perbaiki di berkas sumber lalu unggah ulang
                agar tidak ada fitur yang tertinggal.
              </Alert>
            )}

            {preview.rows.length === 0 ? (
              <EmptyState
                title="Berkas tidak berisi baris data"
                description="Hanya baris judul yang terbaca. Pastikan berkas berisi minimal satu baris fitur di bawah judul kolom."
              />
            ) : (
              <TableWrapper>
                <Table>
                  <thead>
                    <tr>
                      <Th className="w-16 text-right">Baris</Th>
                      <Th>Status</Th>
                      <Th>Fitur</Th>
                      <Th>Perubahan</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((row) => (
                      <Tr key={`${row.lineNumber}-${row.featureSlug}`}>
                        <Td className="tabular text-right text-xs text-fg-subtle">
                          {row.lineNumber}
                        </Td>
                        <Td>
                          <Badge variant={CSV_ROW_STATUS_VARIANT[row.status]}>
                            {CSV_ROW_STATUS_LABEL[row.status]}
                          </Badge>
                        </Td>
                        <Td>
                          <p className="text-sm text-fg">{row.name || row.featureSlug}</p>
                          <p className="text-xs text-fg-subtle">
                            {row.categorySlug || '—'} / {row.groupSlug || '—'} / {row.featureSlug}
                          </p>
                        </Td>
                        <Td>
                          {row.problems.length > 0 && (
                            <ul className="list-disc pl-4 text-xs text-danger">
                              {row.problems.map((problem) => (
                                <li key={problem}>{problem}</li>
                              ))}
                            </ul>
                          )}
                          {row.changes.length > 0 && (
                            <ul className="list-disc pl-4 text-xs text-fg-muted">
                              {row.changes.map((change) => (
                                <li key={change}>{change}</li>
                              ))}
                            </ul>
                          )}
                          {row.notes.length > 0 && (
                            <ul className="list-disc pl-4 text-xs text-warning-soft-fg">
                              {row.notes.map((note) => (
                                <li key={note}>{note}</li>
                              ))}
                            </ul>
                          )}
                          {row.problems.length === 0 &&
                            row.changes.length === 0 &&
                            row.notes.length === 0 && (
                              <span className="text-xs text-fg-subtle">Sama dengan katalog</span>
                            )}
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              </TableWrapper>
            )}
          </CardContent>
        </Card>
      )}

      {preview?.fatalError && <Alert tone="danger">{preview.fatalError}</Alert>}
    </div>
  );
}
