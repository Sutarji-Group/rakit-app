'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth/guards';
import {
  approveChangeRequest,
  approveMilestone,
  cancelChangeRequest,
  createChangeRequest,
  postDiscussionMessage,
  requestMilestoneRevision,
  type PortalActionResult,
} from '@/lib/services/portal';

/**
 * Server Action portal klien.
 *
 * Lapisan ini hanya mengurus tiga hal: memastikan ada pengguna yang masuk,
 * meneruskan ke service, dan menyegarkan halaman. Seluruh pemeriksaan
 * kepemilikan proyek tetap berada di src/lib/services/portal.ts supaya tidak
 * ada jalur yang bisa melewatinya.
 */

function refreshProject(projectId: string): void {
  revalidatePath(`/portal/${projectId}`);
  revalidatePath(`/portal/${projectId}/perubahan`);
  revalidatePath('/portal');
  revalidatePath('/akun');
}

export async function approveMilestoneAction(
  projectId: string,
  milestoneId: string,
): Promise<PortalActionResult> {
  const user = await requireUser(`/portal/${projectId}`);
  const result = await approveMilestone(milestoneId, user.id);
  if (result.ok) refreshProject(projectId);
  return result;
}

export async function requestMilestoneRevisionAction(
  projectId: string,
  milestoneId: string,
  note: string,
): Promise<PortalActionResult> {
  const user = await requireUser(`/portal/${projectId}`);
  const result = await requestMilestoneRevision(milestoneId, user.id, note);
  if (result.ok) refreshProject(projectId);
  return result;
}

export async function postDiscussionMessageAction(
  projectId: string,
  taskId: string,
  body: string,
): Promise<PortalActionResult> {
  const user = await requireUser(`/portal/${projectId}`);
  const result = await postDiscussionMessage(taskId, user.id, body);
  if (result.ok) refreshProject(projectId);
  return result;
}

/**
 * K1 — membuat rakitan addendum lalu membuka konfigurator.
 *
 * Redirect dilakukan di server supaya klien tidak pernah melihat token
 * setengah jadi bila pembuatan gagal di tengah jalan.
 */
export async function createChangeRequestAction(projectId: string): Promise<PortalActionResult> {
  const user = await requireUser(`/portal/${projectId}`);
  const result = await createChangeRequest(projectId, user.id);

  if (!result.ok || !result.token) {
    return { ok: false, message: result.message };
  }

  refreshProject(projectId);
  redirect(`/rakit/${result.token}`);
}

export async function approveChangeRequestAction(
  projectId: string,
  changeRequestId: string,
): Promise<PortalActionResult> {
  const user = await requireUser(`/portal/${projectId}`);
  const result = await approveChangeRequest(changeRequestId, user.id);
  if (result.ok) refreshProject(projectId);
  return result;
}

export async function cancelChangeRequestAction(
  projectId: string,
  changeRequestId: string,
): Promise<PortalActionResult> {
  const user = await requireUser(`/portal/${projectId}`);
  const result = await cancelChangeRequest(changeRequestId, user.id);
  if (result.ok) refreshProject(projectId);
  return result;
}
