'use client';

import { useState } from 'react';
import { Field, Select } from '@/components/ui';
import { LEAD_STAGE_LABEL, type LeadStage, type LostReason } from '@/lib/domain/enums';
import { moveStage } from '@/app/admin/pipeline/actions';
import { LostReasonDialog } from './lost-reason-dialog';
import { usePipelineAction } from './use-pipeline-action';

/** Pemindah tahap pada halaman detail lead (O1, O5). */
export function StageControl({
  leadId,
  contactName,
  stage,
  stages,
}: {
  leadId: string;
  contactName: string;
  stage: LeadStage;
  stages: LeadStage[];
}) {
  const { pending, run } = usePipelineAction();
  const [lostOpen, setLostOpen] = useState(false);

  const handleChange = (next: LeadStage) => {
    if (next === stage) return;
    if (next === 'LOST') {
      setLostOpen(true);
      return;
    }
    run(() => moveStage({ leadId, stage: next }));
  };

  const confirmLost = (reason: LostReason, note: string) => {
    run(() => moveStage({ leadId, stage: 'LOST', lostReason: reason, lostNote: note }), {
      onSuccess: () => setLostOpen(false),
    });
  };

  return (
    <>
      <Field label="Tahap" htmlFor="tahap-lead" className="w-56">
        <Select
          id="tahap-lead"
          value={stage}
          disabled={pending}
          onChange={(event) => handleChange(event.target.value as LeadStage)}
        >
          {stages.map((value) => (
            <option key={value} value={value}>
              {LEAD_STAGE_LABEL[value]}
            </option>
          ))}
        </Select>
      </Field>

      <LostReasonDialog
        open={lostOpen}
        leadName={contactName}
        pending={pending}
        onClose={() => setLostOpen(false)}
        onConfirm={confirmLost}
      />
    </>
  );
}
