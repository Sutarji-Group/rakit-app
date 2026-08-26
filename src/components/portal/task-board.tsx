'use client';

import { useState } from 'react';
import { CalendarDays, MessageSquare, Send } from 'lucide-react';
import { Alert, Badge, Button, Dialog, Field, Textarea } from '@/components/ui';
import { TASK_STATUSES, TASK_STATUS_LABEL } from '@/lib/domain/enums';
import { formatDate, formatDateTime } from '@/lib/format';
import { postDiscussionMessageAction } from '@/app/portal/actions';
import { TASK_STATUS_TONE } from './status';
import { portalFieldError, usePortalAction } from './use-portal-action';
import type { PortalTask } from '@/lib/services/portal';

/**
 * Papan status per fitur (J1) sekaligus ruang diskusinya (J6).
 *
 * Kolom disusun menurun di ponsel dan berdampingan di layar lebar; papan yang
 * menggulir ke samping di layar 390px membuat separuh kolomnya tidak pernah
 * terlihat. Diskusi dibuka lewat dialog agar percakapan tetap menempel pada
 * satu item pekerjaan, bukan tercecer di WhatsApp.
 */
export function TaskBoard({ projectId, tasks }: { projectId: string; tasks: PortalTask[] }) {
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const openTask = tasks.find((task) => task.id === openTaskId) ?? null;

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-5">
        {TASK_STATUSES.map((status) => {
          const column = tasks.filter((task) => task.status === status);
          return (
            <section key={status} className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
                <h3 className="text-sm font-semibold text-fg">{TASK_STATUS_LABEL[status]}</h3>
                <span className="tabular rounded bg-surface-sunken px-1.5 py-0.5 text-[11px] font-semibold text-fg-subtle">
                  {column.length}
                </span>
              </div>

              {column.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-fg-subtle">
                  Kosong
                </p>
              ) : (
                <ul className="flex flex-col gap-2.5">
                  {column.map((task) => (
                    <li key={task.id}>
                      <TaskCard task={task} onOpen={() => setOpenTaskId(task.id)} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <TaskDialog
        projectId={projectId}
        task={openTask}
        onClose={() => setOpenTaskId(null)}
      />
    </>
  );
}

function TaskCard({ task, onOpen }: { task: PortalTask; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full flex-col gap-2 rounded-lg border border-border bg-surface p-3 text-left shadow-xs transition-[border-color,box-shadow] hover:border-border-strong hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <span className="text-sm font-medium leading-snug text-fg">{task.title}</span>
      <span className="text-xs text-fg-subtle">{task.phase}</span>
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted">
        {task.targetDate && (
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="size-3.5" aria-hidden="true" />
            {formatDate(task.targetDate)}
          </span>
        )}
        <span className="inline-flex items-center gap-1">
          <MessageSquare className="size-3.5" aria-hidden="true" />
          {task.messages.length} pesan
        </span>
      </span>
    </button>
  );
}

function TaskDialog({
  projectId,
  task,
  onClose,
}: {
  projectId: string;
  task: PortalTask | null;
  onClose: () => void;
}) {
  const { pending, result, run, reset } = usePortalAction();
  const [body, setBody] = useState('');

  function send() {
    if (!task) return;
    run(() => postDiscussionMessageAction(projectId, task.id, body), () => setBody(''));
  }

  function close() {
    reset();
    setBody('');
    onClose();
  }

  return (
    <Dialog
      open={Boolean(task)}
      onClose={close}
      size="lg"
      title={task?.title ?? 'Item pekerjaan'}
      description={task ? `${task.phase} · ${TASK_STATUS_LABEL[task.status]}` : undefined}
    >
      {task && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={TASK_STATUS_TONE[task.status]} size="md">
              {TASK_STATUS_LABEL[task.status]}
            </Badge>
            {task.targetDate && (
              <span className="text-sm text-fg-muted">
                Target {formatDate(task.targetDate)}
              </span>
            )}
            {task.completedAt && (
              <span className="text-sm text-success">Selesai {formatDate(task.completedAt)}</span>
            )}
          </div>

          {task.clientNote && (
            <Alert tone="warning" title="Catatan Anda pada pekerjaan ini">
              {task.clientNote}
            </Alert>
          )}

          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-fg">Diskusi</h3>
            {task.messages.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-3 py-5 text-center text-sm text-fg-subtle">
                Belum ada pesan. Pertanyaan yang ditulis di sini akan terbaca oleh tim pengerjaan
                beserta konteks fiturnya.
              </p>
            ) : (
              <ol className="flex flex-col gap-3">
                {task.messages.map((message) => (
                  <li
                    key={message.id}
                    className={
                      message.isMine
                        ? 'rounded-lg border border-brand/25 bg-brand-soft p-3'
                        : 'rounded-lg border border-border bg-surface-sunken p-3'
                    }
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-sm font-medium text-fg">{message.authorLabel}</span>
                      <span className="text-xs text-fg-subtle">
                        {formatDateTime(message.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-fg">
                      {message.body}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <Field
            label="Tulis pesan"
            htmlFor="pesan-diskusi"
            error={portalFieldError(result, 'body')}
            hint="Pesan Anda melekat pada item pekerjaan ini dan terbaca oleh tim yang mengerjakannya."
          >
            <Textarea
              id="pesan-diskusi"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Contoh: kolom nama sopir belum ada di form surat jalan."
              rows={3}
              invalid={Boolean(portalFieldError(result, 'body'))}
            />
          </Field>

          <div className="flex justify-end">
            <Button
              onClick={send}
              isLoading={pending}
              disabled={body.trim().length === 0}
              leadingIcon={<Send className="size-4" aria-hidden="true" />}
            >
              Kirim pesan
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
