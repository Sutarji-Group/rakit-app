import { renderToBuffer } from '@react-pdf/renderer';
import { prisma } from '@/lib/db/prisma';
import { parseJson } from '@/lib/db/json';
import { fail, notFound } from '@/lib/api/respond';
import { clientKey, rateLimit } from '@/lib/api/rate-limit';
import { getConfiguratorPayload, computeFromPayload } from '@/lib/services/configuration';
import { ProposalDocument, type ProposalData } from '@/lib/pdf/proposal-document';
import { DEFAULT_ASSUMPTIONS, DEFAULT_EXCLUSIONS, site } from '@/lib/site';
import type { PriceBreakdown } from '@/lib/pricing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Mengunduh penawaran PDF (PRD F4, F5).
 *
 * Untuk konfigurasi yang sudah terbit, angka diambil dari PriceSnapshot yang
 * dibekukan saat pengiriman — bukan dihitung ulang. Ini yang menjamin BR-07:
 * perubahan tarif setelahnya tidak mengubah dokumen yang sudah dipegang klien.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const limit = rateLimit(clientKey(request, 'proposal-pdf'), 20, 300);
  if (!limit.allowed) return fail('Terlalu banyak permintaan unduhan.', 429);

  const { token } = await params;

  const configuration = await prisma.configuration.findUnique({
    where: { publicToken: token },
    include: {
      category: { select: { name: true } },
      lead: true,
      customRequests: true,
      priceSnapshots: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });

  if (!configuration) return notFound('Penawaran tidak ditemukan.');
  if (!configuration.lead) {
    return fail(
      'Penawaran untuk rakitan ini belum diterbitkan. Isi formulir kontak terlebih dahulu.',
      409,
    );
  }

  // Snapshot yang dibekukan saat pengiriman adalah sumber kebenaran dokumen.
  let breakdown = configuration.priceSnapshots[0]
    ? parseJson<PriceBreakdown | null>(configuration.priceSnapshots[0].payload, null)
    : null;

  if (!breakdown) {
    const payload = await getConfiguratorPayload(token);
    if (!payload) return notFound('Rakitan tidak ditemukan.');
    breakdown = computeFromPayload(payload);
  }

  const pendingCustoms = configuration.customRequests
    .filter((request) => request.status !== 'ESTIMATED' && request.status !== 'PROMOTED')
    .map((request) => ({ name: request.name, priority: request.priority }));

  const data: ProposalData = {
    quoteNumber: configuration.lead.quoteNumber,
    issuedAt: configuration.submittedAt ?? configuration.lead.createdAt,
    validUntil: configuration.lead.validUntil,
    client: {
      name: configuration.lead.contactName,
      company: configuration.lead.company,
      email: configuration.lead.email,
      whatsapp: configuration.lead.whatsapp,
    },
    configurationName: configuration.name,
    categoryName: configuration.category.name,
    platform: configuration.platform as ProposalData['platform'],
    deployment: configuration.deployment as ProposalData['deployment'],
    userTier: configuration.userTier as ProposalData['userTier'],
    breakdown,
    pendingCustoms,
    assumptions: DEFAULT_ASSUMPTIONS,
    exclusions: DEFAULT_EXCLUSIONS,
    company: {
      name: site.name,
      legalName: site.legalName,
      email: site.email,
      phone: site.phone,
      address: site.address,
    },
  };

  const buffer = await renderToBuffer(ProposalDocument({ data }));

  // Pencatatan unduhan dipakai metrik corong (event proposal_downloaded).
  await prisma.analyticsEvent.create({
    data: {
      name: 'proposal_downloaded',
      sessionId: `pdf-${configuration.lead.id}`,
      configurationId: configuration.id,
      payload: JSON.stringify({ quote_number: configuration.lead.quoteNumber }),
      path: `/api/proposal/${token}/pdf`,
    },
  });

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="Penawaran-${configuration.lead.quoteNumber}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
