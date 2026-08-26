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
  EmptyState,
  Field,
  Input,
  Select,
  Textarea,
} from '@/components/ui';
import { ACTIVITY_KIND_LABEL, type ActivityKind } from '@/lib/domain/enums';
import { formatDateTime, formatRelativeDeadline } from '@/lib/format';
import { completeReminder, logActivity } from '@/app/admin/pipeline/actions';
import { usePipelineAction } from './use-pipeline-action';
import { ACTIVITY_TONE, MANUAL_ACTIVITY_KINDS, type LeadActivityItem } from './shared';

/**
 * Catatan aktivitas dan pengingat follow-up (O4).
 *
 * Pengingat yang jatuh tempo diangkat ke atas sebagai peringatan, bukan
 * dibiarkan tenggelam di dalam linimasa — lead yang hilang biasanya hilang
 * karena follow-up yang terlewat, bukan karena harga.
 */
export function ActivityPanel({
  leadId,
  activities,
}: {
  leadId: string;
  activities: LeadActivityItem[];
}) {
  const { pending, run } = usePipelineAction();
  const [kind, setKind] = useState<ActivityKind>('NOTE');
  const [body, setBody] = useState('');
  const [dueAt, setDueAt] = useState('');

  const overdue = activities.filter((activity) => activity.isOverdue);
  const upcoming = activities.filter(
    (activity) => activity.dueAt && !activity.doneAt && !activity.isOverdue,
  );

  const needsDue = kind === 'REMINDER';
  const canSubmit = body.trim().length >= 3 && (!needsDue || dueAt !== '');

  const submit = () => {
    run(
      () =>
        logActivity({
          leadId,
          kind,
          body,
          // Nilai datetime-local adalah waktu lokal peramban; diubah ke ISO di
          // sini agar zona waktu server tidak menggeser jatuh tempo.
          dueAt: dueAt ? new Date(dueAt).toISOString() : null,
        }),
      {
        onSuccess: () => {
          setBody('');
          setDueAt('');
          setKind('NOTE');
        },
      },
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aktivitas & pengingat</CardTitle>
        <CardDescription>
          Seluruh jejak percakapan dengan lead ini, termasuk perubahan tahap dan override harga yang
          dicatat sistem.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {overdue.length > 0 && (
          <Alert tone="danger" title={`${overdue.length} pengingat lewat jatuh tempo`}>
            <ul className="flex flex-col gap-2">
              {overdue.map((activity) => (
                <li key={activity.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    {activity.body}{' '}
                    <span className="tabular whitespace-nowrap font-medium">
                      ({activity.dueAt ? formatRelativeDeadline(activity.dueAt) : ''})
                    </span>
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={pending}
                    onClick={() => run(() => completeReminder({ leadId, activityId: activity.id }))}
                  >
                    Tandai selesai
                  </Button>
                </li>
              ))}
            </ul>
          </Alert>
        )}

        {upcoming.length > 0 && (
          <Alert tone="info" title="Pengingat berikutnya">
            <ul className="flex flex-col gap-1">
              {upcoming.map((activity) => (
                <li key={activity.id} className="tabular">
                  {activity.body} — {activity.dueAt ? formatRelativeDeadline(activity.dueAt) : ''}
                </li>
              ))}
            </ul>
          </Alert>
        )}

        <div className="grid gap-3 rounded-lg border border-border bg-surface-sunken/40 p-4 sm:grid-cols-2">
          <Field label="Jenis" htmlFor="jenis-aktivitas">
            <Select
              id="jenis-aktivitas"
              value={kind}
              disabled={pending}
              onChange={(event) => setKind(event.target.value as ActivityKind)}
            >
              {MANUAL_ACTIVITY_KINDS.map((value) => (
                <option key={value} value={value}>
                  {ACTIVITY_KIND_LABEL[value]}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Jatuh tempo follow-up"
            htmlFor="jatuh-tempo"
            required={needsDue}
            hint={
              needsDue
                ? 'Wajib diisi untuk pengingat.'
                : 'Opsional. Isi bila catatan ini perlu ditindaklanjuti pada waktu tertentu.'
            }
          >
            <Input
              id="jatuh-tempo"
              type="datetime-local"
              value={dueAt}
              disabled={pending}
              invalid={needsDue && !dueAt}
              onChange={(event) => setDueAt(event.target.value)}
            />
          </Field>

          <Field label="Catatan" htmlFor="isi-catatan" required className="sm:col-span-2">
            <Textarea
              id="isi-catatan"
              value={body}
              maxLength={4000}
              disabled={pending}
              placeholder="Hasil telepon, keberatan yang muncul, atau langkah berikutnya."
              onChange={(event) => setBody(event.target.value)}
            />
          </Field>

          <div className="sm:col-span-2">
            <Button type="button" isLoading={pending} disabled={pending || !canSubmit} onClick={submit}>
              Simpan catatan
            </Button>
          </div>
        </div>

        {activities.length === 0 ? (
          <EmptyState
            title="Belum ada aktivitas"
            description="Catatan panggilan, email, dan pengingat follow-up akan tersusun di sini sebagai linimasa."
          />
        ) : (
          <ol className="flex flex-col gap-3">
            {activities.map((activity) => (
              <li key={activity.id} className="flex gap-3">
                <span
                  aria-hidden="true"
                  className="mt-1.5 size-2 shrink-0 rounded-full bg-border-strong"
                />
                <div className="min-w-0 flex-1 border-b border-border pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={ACTIVITY_TONE[activity.kind]}>
                      {ACTIVITY_KIND_LABEL[activity.kind]}
                    </Badge>
                    <span className="tabular text-xs text-fg-subtle">
                      {formatDateTime(activity.createdAt)}
                    </span>
                    <span className="text-xs text-fg-subtle">
                      {activity.userName ?? 'Sistem'}
                    </span>
                    {activity.doneAt && (
                      <Badge variant="success">Selesai {formatDateTime(activity.doneAt)}</Badge>
                    )}
                    {activity.isOverdue && <Badge variant="danger">Lewat jatuh tempo</Badge>}
                  </div>
                  <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-fg">
                    {activity.body}
                  </p>
                  {activity.dueAt && !activity.doneAt && (
                    <p className="tabular mt-1 text-xs text-fg-muted">
                      Jatuh tempo {formatDateTime(activity.dueAt)} ·{' '}
                      {formatRelativeDeadline(activity.dueAt)}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
