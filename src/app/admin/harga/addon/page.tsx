import Link from 'next/link';

import { PageBody, PageHeader } from '@/components/admin';
import { AddOnManager } from '@/components/admin/pricing/addon-manager';
import type { AddOnRow } from '@/components/admin/pricing/types';
import { Alert } from '@/components/ui';
import { requireArea } from '@/lib/auth/guards';
import { prisma } from '@/lib/db/prisma';
import { ADDON_KINDS, coerceEnum } from '@/lib/domain/enums';

export const metadata = { title: 'Add-on' };

const SECONDARY_LINK =
  'inline-flex h-9 select-none items-center justify-center rounded-lg border border-border ' +
  'bg-surface-sunken px-4 text-sm font-medium text-fg transition-colors hover:bg-surface-raised ' +
  'hover:border-border-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand';

/**
 * Manajemen add-on tingkat proyek (M5).
 *
 * Add-on adalah pekerjaan di luar fitur katalog — integrasi, migrasi, training,
 * maintenance, hosting — dan sebagian di antaranya berupa biaya berulang yang
 * tidak boleh tercampur ke nilai proyek (BR-12).
 */
export default async function AddOnPage() {
  await requireArea('pricing', '/admin/harga/addon');

  const addOns = await prisma.addOn.findMany({
    orderBy: [{ isRecurring: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { configurations: true } } },
  });

  const rows: AddOnRow[] = addOns.map((addOn) => ({
    id: addOn.id,
    slug: addOn.slug,
    kind: coerceEnum(addOn.kind, ADDON_KINDS, 'OTHER'),
    name: addOn.name,
    description: addOn.description,
    priceMin: addOn.priceMin,
    priceMax: addOn.priceMax,
    manDayMin: addOn.manDayMin,
    manDayMax: addOn.manDayMax,
    isRecurring: addOn.isRecurring,
    optionGroup: addOn.optionGroup ?? '',
    sortOrder: addOn.sortOrder,
    isActive: addOn.isActive,
    isGlobal: addOn.isGlobal,
    usageCount: addOn._count.configurations,
  }));

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Mesin Harga', href: '/admin/harga' }, { label: 'Add-on' }]}
        title="Add-on"
        description="Pekerjaan tambahan di luar fitur katalog yang dapat dipilih klien di konfigurator: integrasi pihak ketiga, migrasi data, pelatihan, maintenance, dan hosting."
        actions={
          <Link href="/admin/harga/simulator" className={SECONDARY_LINK}>
            Uji di simulator
          </Link>
        }
      />

      <PageBody className="flex flex-col gap-5">
        <Alert tone="info" title="Dua jenis biaya yang tidak boleh tercampur">
          Add-on sekali jalan menambah nilai proyek dan membawa effort man-day ke proyeksi COGS.
          Add-on berulang adalah biaya bulanan yang selalu tampil terpisah dan tidak pernah
          dijumlahkan ke nilai kontrak (BR-12) — karena itu add-on berulang tidak boleh membawa
          effort man-day proyek.
        </Alert>

        <AddOnManager rows={rows} />
      </PageBody>
    </>
  );
}
