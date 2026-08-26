'use client';

import { useState } from 'react';
import { Button, Field, Select } from '@/components/ui';
import { USER_ROLE_LABEL } from '@/lib/domain/enums';
import { assignOwner } from '@/app/admin/pipeline/actions';
import { usePipelineAction } from './use-pipeline-action';
import type { OwnerOption } from './shared';

/** Penugasan lead ke sales atau consultant (O3). */
export function AssignOwner({
  leadId,
  currentOwnerId,
  owners,
}: {
  leadId: string;
  currentOwnerId: string | null;
  owners: OwnerOption[];
}) {
  const { pending, run } = usePipelineAction();
  const [selected, setSelected] = useState(currentOwnerId ?? '');

  const changed = selected !== (currentOwnerId ?? '');

  return (
    <div className="flex flex-col gap-3">
      <Field
        label="Penanggung jawab"
        htmlFor="penanggung-jawab"
        hint="Lead tanpa penanggung jawab adalah lead yang tidak ditindaklanjuti siapa pun."
      >
        <Select
          id="penanggung-jawab"
          value={selected}
          disabled={pending || owners.length === 0}
          onChange={(event) => setSelected(event.target.value)}
        >
          <option value="">Belum ditugaskan</option>
          {owners.map((owner) => (
            <option key={owner.id} value={owner.id}>
              {owner.name} — {USER_ROLE_LABEL[owner.role]}
            </option>
          ))}
        </Select>
      </Field>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="self-start"
        isLoading={pending}
        disabled={pending || !changed || !selected}
        onClick={() => run(() => assignOwner({ leadId, ownerId: selected }))}
      >
        Simpan penugasan
      </Button>
    </div>
  );
}
