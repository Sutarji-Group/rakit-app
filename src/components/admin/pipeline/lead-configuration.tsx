import {
  Alert,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DescRow,
  FeatureTypeBadge,
  Table,
  TableWrapper,
  Td,
  Th,
  Tr,
} from '@/components/ui';
import {
  ADDON_KIND_LABEL,
  COUNTED_CUSTOM_STATUSES,
  CUSTOM_REQUEST_STATUS_LABEL,
  PROJECT_DEPLOYMENT_LABEL,
  PROJECT_PLATFORM_LABEL,
  REQUEST_PRIORITY_LABEL,
  USER_TIER_LABEL,
  type ProjectDeployment,
  type ProjectPlatform,
  type UserTier,
} from '@/lib/domain/enums';
import { formatManDay, formatRupiahRange } from '@/lib/format';
import { ITEM_ORIGIN_LABEL, type AddOnItem, type CustomItem, type FeatureGroupBlock } from './shared';

/**
 * Konfigurasi lengkap yang dikirim klien (O2).
 *
 * Tim penjualan perlu melihat keranjang persis seperti yang klien susun —
 * termasuk fitur yang masuk otomatis karena dependensi — agar percakapan
 * discovery tidak dimulai dari tebakan.
 */
export function LeadConfiguration({
  categoryName,
  presetName,
  platform,
  deployment,
  userTier,
  featureGroups,
  addOns,
  customRequests,
}: {
  categoryName: string;
  presetName: string | null;
  platform: ProjectPlatform;
  deployment: ProjectDeployment;
  userTier: UserTier;
  featureGroups: FeatureGroupBlock[];
  addOns: AddOnItem[];
  customRequests: CustomItem[];
}) {
  const featureCount = featureGroups.reduce((sum, group) => sum + group.items.length, 0);
  const oneTimeAddOns = addOns.filter((addOn) => !addOn.isRecurring);
  const recurringAddOns = addOns.filter((addOn) => addOn.isRecurring);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Konfigurasi proyek</CardTitle>
          <CardDescription>Pilihan platform, penempatan, dan skala pengguna (PRD 6.5).</CardDescription>
        </CardHeader>
        <CardContent>
          <dl>
            <DescRow label="Kategori aplikasi" value={categoryName} emphasis />
            <DescRow label="Preset awal" value={presetName ?? 'Disusun sendiri dari nol'} />
            <DescRow label="Platform" value={PROJECT_PLATFORM_LABEL[platform]} />
            <DescRow label="Penempatan" value={PROJECT_DEPLOYMENT_LABEL[deployment]} />
            <DescRow label="Jumlah pengguna" value={USER_TIER_LABEL[userTier]} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fitur dalam keranjang</CardTitle>
          <CardDescription>
            {featureCount} fitur katalog dalam {featureGroups.length} kelompok, beserta asal
            masuknya ke keranjang.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {featureGroups.map((group) => (
            <section key={group.groupName}>
              <h3 className="mb-2 text-sm font-semibold text-fg">
                {group.groupName}{' '}
                <span className="tabular font-normal text-fg-subtle">({group.items.length})</span>
              </h3>
              <TableWrapper>
                <Table>
                  <thead>
                    <tr>
                      <Th>Fitur</Th>
                      <Th className="w-36">Tipe</Th>
                      <Th className="w-52">Asal</Th>
                      <Th className="w-32 text-right">Effort</Th>
                      <Th className="w-44 text-right">Harga satuan</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map((item) => (
                      <Tr key={item.id}>
                        <Td className="font-medium">{item.name}</Td>
                        <Td>
                          <FeatureTypeBadge type={item.type} />
                        </Td>
                        <Td className="text-xs text-fg-muted">
                          {ITEM_ORIGIN_LABEL[item.origin]}
                          {item.reason && (
                            <span className="block text-fg-subtle">{item.reason}</span>
                          )}
                        </Td>
                        <Td className="tabular text-right text-fg-muted">
                          {formatManDay(item.manDayMin)} – {formatManDay(item.manDayMax)}
                        </Td>
                        <Td className="tabular text-right">
                          {formatRupiahRange(item.priceMin, item.priceMax)}
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              </TableWrapper>
            </section>
          ))}
        </CardContent>
      </Card>

      {customRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Fitur custom</CardTitle>
            <CardDescription>
              Fitur di luar katalog. Nilainya baru ikut total setelah diestimasi manusia (BR-02).
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <TableWrapper>
              <Table>
                <thead>
                  <tr>
                    <Th>Permintaan</Th>
                    <Th className="w-36">Prioritas</Th>
                    <Th className="w-44">Status</Th>
                    <Th className="w-44 text-right">Nilai estimasi</Th>
                  </tr>
                </thead>
                <tbody>
                  {customRequests.map((request) => {
                    const counted = COUNTED_CUSTOM_STATUSES.includes(request.status);
                    return (
                      <Tr key={request.id}>
                        <Td className="font-medium">{request.name}</Td>
                        <Td>
                          <Badge
                            variant={request.priority === 'MUST_HAVE' ? 'brand' : 'neutral'}
                          >
                            {REQUEST_PRIORITY_LABEL[request.priority]}
                          </Badge>
                        </Td>
                        <Td>
                          <Badge variant={counted ? 'success' : 'warning'}>
                            {CUSTOM_REQUEST_STATUS_LABEL[request.status]}
                          </Badge>
                        </Td>
                        <Td className="tabular text-right">
                          {request.unitPriceMin != null && request.unitPriceMax != null
                            ? formatRupiahRange(request.unitPriceMin, request.unitPriceMax)
                            : 'Belum diestimasi'}
                        </Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </Table>
            </TableWrapper>
          </CardContent>
        </Card>
      )}

      {addOns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Add-on</CardTitle>
            <CardDescription>
              Biaya berulang selalu dipisahkan dari nilai proyek agar klien tidak salah membaca
              total (BR-12).
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <TableWrapper>
              <Table>
                <thead>
                  <tr>
                    <Th>Add-on</Th>
                    <Th className="w-52">Jenis</Th>
                    <Th className="w-44 text-right">Nilai</Th>
                  </tr>
                </thead>
                <tbody>
                  {[...oneTimeAddOns, ...recurringAddOns].map((addOn) => (
                    <Tr key={addOn.id}>
                      <Td className="font-medium">
                        {addOn.name}
                        {addOn.isRecurring && (
                          <Badge variant="info" className="ml-2">
                            per bulan
                          </Badge>
                        )}
                      </Td>
                      <Td className="text-fg-muted">{ADDON_KIND_LABEL[addOn.kind]}</Td>
                      <Td className="tabular text-right">
                        {formatRupiahRange(addOn.priceMin, addOn.priceMax)}
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </TableWrapper>
            {recurringAddOns.length > 0 && (
              <Alert tone="neutral">
                {recurringAddOns.length} add-on bersifat berulang bulanan dan tidak dihitung ke
                dalam nilai proyek.
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
