'use server';

import { revalidatePath } from 'next/cache';
import { requireArea } from '@/lib/auth/guards';
import {
  recordPayment,
  sendInvoice,
  verifyPayment,
  type BillingResult,
} from '@/lib/services/billing';
import { coerceEnum, PAYMENT_METHODS } from '@/lib/domain/enums';

export async function sendInvoiceAction(invoiceId: string): Promise<BillingResult> {
  const user = await requireArea('projects');
  const result = await sendInvoice(invoiceId, user.id);
  revalidatePath('/admin/tagihan');
  revalidatePath(`/admin/tagihan/${invoiceId}`);
  return result;
}

export async function recordPaymentAction(input: {
  invoiceId: string;
  amount: number;
  method: string;
  reference?: string;
  proofUrl?: string;
  verified: boolean;
}): Promise<BillingResult> {
  const user = await requireArea('projects');
  const result = await recordPayment({
    invoiceId: input.invoiceId,
    amount: input.amount,
    method: coerceEnum(input.method, PAYMENT_METHODS, 'MANUAL_TRANSFER'),
    reference: input.reference,
    proofUrl: input.proofUrl,
    verified: input.verified,
    actorId: user.id,
  });
  revalidatePath('/admin/tagihan');
  revalidatePath(`/admin/tagihan/${input.invoiceId}`);
  return result;
}

export async function verifyPaymentAction(
  paymentId: string,
  invoiceId: string,
  approve: boolean,
): Promise<BillingResult> {
  const user = await requireArea('projects');
  const result = await verifyPayment(paymentId, user.id, approve);
  revalidatePath('/admin/tagihan');
  revalidatePath(`/admin/tagihan/${invoiceId}`);
  return result;
}
