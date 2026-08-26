import 'server-only';

import type { CurrentUser } from '@/lib/auth/session';
import { stringifyJson } from '@/lib/db/json';
import { prisma } from '@/lib/db/prisma';
import { USER_ROLE_LABEL } from '@/lib/domain/enums';

export type CatalogAuditEntity =
  | 'ApplicationCategory'
  | 'FeatureGroup'
  | 'Feature'
  | 'FeatureDependency'
  | 'Preset'
  | 'WizardQuestion'
  | 'WizardOption'
  | 'WizardOptionFeature'
  | 'CatalogImport';

interface AuditInput {
  actor: CurrentUser;
  entity: CatalogAuditEntity;
  entityId: string;
  action: string;
  summary: string;
  before?: unknown;
  after?: unknown;
}

/**
 * Mencatat satu perubahan katalog ke AuditLog.
 *
 * Persyaratan non-fungsional "Audit": setiap perubahan katalog dan harga harus
 * dapat ditelusuri beserta pelakunya. Pelaku disimpan dua kali — sebagai
 * relasi userId (untuk kueri) dan sebagai actorLabel teks (agar jejak tetap
 * terbaca walau akun pengguna kelak dinonaktifkan atau dihapus).
 */
export async function recordCatalogAudit(input: AuditInput): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: input.actor.id,
      actorLabel: `${input.actor.name} · ${USER_ROLE_LABEL[input.actor.role]}`,
      entity: input.entity,
      entityId: input.entityId,
      action: input.action,
      summary: input.summary,
      before: stringifyJson(input.before ?? {}),
      after: stringifyJson(input.after ?? {}),
    },
  });
}

/** Riwayat audit terakhir untuk satu entitas katalog. */
export async function listRecentCatalogAudit(limit = 8) {
  return prisma.auditLog.findMany({
    where: {
      entity: {
        in: [
          'ApplicationCategory',
          'FeatureGroup',
          'Feature',
          'FeatureDependency',
          'Preset',
          'WizardQuestion',
          'WizardOption',
          'WizardOptionFeature',
          'CatalogImport',
        ],
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}
