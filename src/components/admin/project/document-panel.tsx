'use client';

import { useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
  Field,
  Input,
  Select,
} from '@/components/ui';
import { DOCUMENT_KINDS, DOCUMENT_KIND_LABEL, type DocumentKind } from '@/lib/domain/enums';
import { formatDate } from '@/lib/format';
import { addDocument } from '@/app/admin/proyek/actions';
import { useProjectAction } from './use-project-action';
import type { DocumentRow } from './shared';

/**
 * Repositori dokumen proyek (J7).
 *
 * Dokumen disimpan sebagai tautan, bukan unggahan biner: kontrak, berita acara,
 * dan materi pelatihan umumnya sudah hidup di penyimpanan berkas masing-masing
 * tim, dan yang dibutuhkan klien hanyalah satu pintu untuk menemukannya.
 */
export function DocumentPanel({
  projectId,
  documents,
}: {
  projectId: string;
  documents: DocumentRow[];
}) {
  const { pending, error, run } = useProjectAction();
  const [name, setName] = useState('');
  const [kind, setKind] = useState<DocumentKind>('OTHER');
  const [url, setUrl] = useState('');

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    run(() => addDocument({ projectId, name, kind, url }), {
      onSuccess: () => {
        setName('');
        setKind('OTHER');
        setUrl('');
      },
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {documents.length === 0 ? (
        <EmptyState
          title="Belum ada dokumen"
          description="Kontrak, Scope of Work, berita acara, dan manual pengguna yang ditautkan di sini akan terlihat oleh klien di portalnya."
        />
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {documents.map((document) => (
            <li key={document.id}>
              <Card className="h-full">
                <CardContent className="flex items-start justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <a
                      href={document.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-medium text-brand hover:underline"
                    >
                      {document.name}
                    </a>
                    <p className="mt-1 text-xs text-fg-subtle">
                      Ditambahkan {formatDate(document.createdAt)}
                      {document.sizeLabel && ` · ${document.sizeLabel}`}
                    </p>
                  </div>
                  <Badge variant="outline">{DOCUMENT_KIND_LABEL[document.kind]}</Badge>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={submit} className="flex flex-col gap-3 rounded-xl border border-border bg-surface-sunken p-4">
        {error && <Alert tone="danger">{error}</Alert>}
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Nama dokumen" htmlFor="document-name" required>
            <Input
              id="document-name"
              value={name}
              maxLength={160}
              placeholder="Berita Acara Serah Terima Fase 1"
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          <Field label="Jenis" htmlFor="document-kind">
            <Select
              id="document-kind"
              value={kind}
              onChange={(event) => setKind(event.target.value as DocumentKind)}
            >
              {DOCUMENT_KINDS.map((value) => (
                <option key={value} value={value}>
                  {DOCUMENT_KIND_LABEL[value]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Tautan" htmlFor="document-url" required>
            <Input
              id="document-url"
              type="url"
              value={url}
              placeholder="https://"
              onChange={(event) => setUrl(event.target.value)}
            />
          </Field>
        </div>
        <Button
          type="submit"
          variant="secondary"
          size="sm"
          className="self-start"
          isLoading={pending}
          disabled={pending || name.trim().length < 3 || url.trim().length === 0}
        >
          Tautkan dokumen
        </Button>
      </form>
    </div>
  );
}
