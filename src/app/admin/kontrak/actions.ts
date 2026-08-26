'use server';

import { revalidatePath } from 'next/cache';
import { requireArea } from '@/lib/auth/guards';
import {
  generateContract,
  signContract,
  updateContractStatus,
  type ContractResult,
} from '@/lib/services/contract';
import { coerceEnum, CONTRACT_STATUSES } from '@/lib/domain/enums';

export async function generateContractAction(leadId: string): Promise<ContractResult> {
  const user = await requireArea('leads');
  const result = await generateContract(leadId, user.id);
  revalidatePath('/admin/kontrak');
  revalidatePath(`/admin/pipeline/${leadId}`);
  return result;
}

export async function updateContractStatusAction(
  contractId: string,
  status: string,
): Promise<ContractResult> {
  const user = await requireArea('leads');
  const result = await updateContractStatus(
    contractId,
    coerceEnum(status, CONTRACT_STATUSES, 'DRAFT'),
    user.id,
  );
  revalidatePath('/admin/kontrak');
  revalidatePath(`/admin/kontrak/${contractId}`);
  return result;
}

export async function signContractAction(
  contractId: string,
  signerName: string,
  signerEmail: string,
): Promise<ContractResult> {
  const user = await requireArea('leads');
  const result = await signContract({
    contractId,
    signerName: signerName.trim(),
    signerEmail: signerEmail.trim().toLowerCase(),
    actorId: user.id,
  });
  revalidatePath('/admin/kontrak');
  revalidatePath(`/admin/kontrak/${contractId}`);
  return result;
}
