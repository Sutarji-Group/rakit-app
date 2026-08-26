'use client';

import { useState } from 'react';
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  FeatureTypeBadge,
  Input,
  Progress,
  Select,
  Table,
  TableWrapper,
  Td,
  Th,
  Tr,
} from '@/components/ui';
import { TASK_STATUSES, TASK_STATUS_LABEL, USER_ROLE_LABEL } from '@/lib/domain/enums';
import { formatManDay, formatPercent } from '@/lib/format';
import { saveActualManDay, saveTaskAssignment, setTaskStatus } from '@/app/admin/proyek/actions';
import { useProjectAction } from './use-project-action';
import {
  TASK_STATUS_TONE,
  deviationTone,
  formatManDayRange,
  type AssigneeOption,
  type PhaseBlock,
  type TaskRow,
} from './shared';

/**
 * Papan pekerjaan proyek (P2–P4).
 *
 * Satu baris = satu fitur dari konfigurasi yang dimenangkan. Status, penanggung
 * jawab, target tanggal, dan man-day aktual semuanya dapat diubah langsung di
 * baris ini: setiap langkah tambahan yang memisahkan tim dari pencatatan
 * man-day aktual adalah data kalibrasi yang hilang selamanya (P4).
 */
export function TaskBoard({
  phases,
  assignees,
}: {
  phases: PhaseBlock[];
  assignees: AssigneeOption[];
}) {
  return (
    <div className="flex flex-col gap-5">
      {phases.map((block) => {
        const done = block.tasks.filter((task) => task.status === 'DONE').length;
        return (
          <Card key={block.phase}>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle>{block.phase}</CardTitle>
                <span className="tabular text-xs text-fg-muted">
                  {done}/{block.tasks.length} selesai · {block.progressPct}%
                </span>
              </div>
              <Progress
                value={block.progressPct}
                tone={block.progressPct === 100 ? 'success' : 'brand'}
              />
            </CardHeader>
            <CardContent>
              <TableWrapper>
                <Table>
                  <thead>
                    <tr>
                      <Th className="min-w-56">Item pekerjaan</Th>
                      <Th className="min-w-40">Status</Th>
                      <Th className="min-w-44">Penanggung jawab</Th>
                      <Th className="min-w-36">Target selesai</Th>
                      <Th className="min-w-28 text-right">Estimasi</Th>
                      <Th className="min-w-40 text-right">Man-day aktual</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {block.tasks.map((task) => (
                      <TaskLine key={task.id} task={task} assignees={assignees} />
                    ))}
                  </tbody>
                </Table>
              </TableWrapper>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

/**
 * Menyelaraskan isian dengan nilai dari server setelah router.refresh().
 *
 * Tanpa ini, nilai yang diubah rekan lain tidak pernah terlihat karena state
 * lokal baris tidak pernah dibuat ulang.
 */
function useSyncedValue(external: string): [string, (next: string) => void] {
  const [value, setValue] = useState(external);
  const [previous, setPrevious] = useState(external);
  if (previous !== external) {
    setPrevious(external);
    setValue(external);
  }
  return [value, setValue];
}

function TaskLine({ task, assignees }: { task: TaskRow; assignees: AssigneeOption[] }) {
  const { pending, run } = useProjectAction();
  const [assigneeId, setAssigneeId] = useSyncedValue(task.assigneeId ?? '');
  const [targetDate, setTargetDate] = useSyncedValue(task.targetDate ?? '');
  const [actual, setActual] = useSyncedValue(
    task.actualManDay === null ? '' : String(task.actualManDay),
  );

  const savedActual = task.actualManDay === null ? '' : String(task.actualManDay);

  const commitAssignment = (nextAssignee: string, nextTarget: string) => {
    run(() =>
      saveTaskAssignment({
        taskId: task.id,
        assigneeId: nextAssignee || null,
        targetDate: nextTarget || null,
      }),
    );
  };

  const commitActual = () => {
    if (actual.trim() === savedActual) return;
    run(() => saveActualManDay({ taskId: task.id, actualManDay: actual.trim() || null }));
  };

  return (
    <Tr>
      <Td>
        <div className="flex flex-col gap-1">
          <span className="font-medium leading-snug text-fg">{task.title}</span>
          <span className="flex flex-wrap items-center gap-1.5">
            <FeatureTypeBadge type={task.featureType} />
            {task.discussionCount > 0 && (
              <Badge variant="outline">{task.discussionCount} diskusi</Badge>
            )}
            {task.isLate && <Badge variant="danger">Lewat target</Badge>}
          </span>
        </div>
      </Td>

      <Td>
        <div className="flex flex-col gap-1.5">
          <Select
            aria-label={`Status pekerjaan ${task.title}`}
            value={task.status}
            disabled={pending}
            className="h-9"
            onChange={(event) =>
              run(() =>
                setTaskStatus({
                  taskId: task.id,
                  status: event.target.value as TaskRow['status'],
                }),
              )
            }
          >
            {TASK_STATUSES.map((status) => (
              <option key={status} value={status}>
                {TASK_STATUS_LABEL[status]}
              </option>
            ))}
          </Select>
          <Badge variant={TASK_STATUS_TONE[task.status]} className="self-start">
            {TASK_STATUS_LABEL[task.status]}
          </Badge>
        </div>
      </Td>

      <Td>
        <Select
          aria-label={`Penanggung jawab ${task.title}`}
          value={assigneeId}
          disabled={pending}
          className="h-9"
          onChange={(event) => {
            setAssigneeId(event.target.value);
            commitAssignment(event.target.value, targetDate);
          }}
        >
          <option value="">Belum ditugaskan</option>
          {assignees.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name} — {USER_ROLE_LABEL[person.role]}
            </option>
          ))}
        </Select>
      </Td>

      <Td>
        <Input
          type="date"
          aria-label={`Target selesai ${task.title}`}
          value={targetDate}
          disabled={pending}
          className={`h-9 ${task.isLate ? 'border-danger' : ''}`}
          onChange={(event) => setTargetDate(event.target.value)}
          onBlur={() => {
            if ((task.targetDate ?? '') !== targetDate) commitAssignment(assigneeId, targetDate);
          }}
        />
      </Td>

      <Td className="tabular text-right text-fg-muted">
        {formatManDayRange(task.estimateManDayMin, task.estimateManDayMax)}
      </Td>

      <Td>
        <div className="flex items-center justify-end gap-2">
          {task.deviationPct !== null && (
            <Badge variant={deviationTone(task.deviationPct)} title="Selisih terhadap estimasi">
              <span className="tabular">
                {task.deviationPct > 0 ? '+' : ''}
                {formatPercent(task.deviationPct, 0)}
              </span>
            </Badge>
          )}
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            step={0.5}
            placeholder="—"
            aria-label={`Man-day aktual ${task.title}`}
            value={actual}
            disabled={pending}
            className="tabular h-9 w-24 text-right"
            onChange={(event) => setActual(event.target.value)}
            onBlur={commitActual}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur();
            }}
          />
        </div>
        {task.actualManDay !== null && (
          <p className="mt-1 text-right text-[11px] text-fg-subtle">
            tercatat {formatManDay(task.actualManDay)}
          </p>
        )}
      </Td>
    </Tr>
  );
}
