import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer';
import type { PriceBreakdown } from '@/lib/pricing';
import {
  PROJECT_DEPLOYMENT_LABEL,
  PROJECT_PLATFORM_LABEL,
  USER_TIER_LABEL,
  FEATURE_TYPE_LABEL,
  type ProjectDeployment,
  type ProjectPlatform,
  type UserTier,
} from '@/lib/domain/enums';

/**
 * Dokumen penawaran PDF (PRD F4).
 *
 * Ini artefak yang dibawa persona Sarah ke rapat direksi, jadi isinya harus
 * berdiri sendiri tanpa penjelasan lisan: nomor penawaran, masa berlaku,
 * rincian per fitur, diagram fase, asumsi, dan daftar apa yang tidak termasuk.
 *
 * Warna sengaja ditulis literal dan tidak mengambil token CSS: PDF dirender di
 * luar browser, tidak punya mode gelap, dan harus terbaca saat dicetak
 * hitam-putih.
 */

const BRAND = '#4f46e5';
const INK = '#1e1e28';
const MUTED = '#61616f';
const SUBTLE = '#8a8a99';
const LINE = '#e2e2ea';
const SOFT = '#f5f5fa';
const WARN = '#b45309';
const OK = '#15803d';

const styles = StyleSheet.create({
  page: {
    paddingTop: 42,
    paddingBottom: 56,
    paddingHorizontal: 42,
    fontSize: 9.5,
    color: INK,
    fontFamily: 'Helvetica',
    lineHeight: 1.5,
  },

  // -- Kepala dokumen ------------------------------------------------------
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 2,
    borderBottomColor: BRAND,
    paddingBottom: 12,
    marginBottom: 18,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  logoMark: { width: 18, height: 18, backgroundColor: BRAND, borderRadius: 4 },
  logoMarkAccent: {
    width: 10,
    height: 10,
    backgroundColor: '#d97706',
    borderRadius: 2.5,
    marginLeft: -13,
    marginTop: -9,
  },
  brandName: { fontSize: 15, fontFamily: 'Helvetica-Bold', color: INK, letterSpacing: -0.3 },
  companyMeta: { fontSize: 7.5, color: SUBTLE, marginTop: 2 },
  quoteBox: { alignItems: 'flex-end' },
  quoteLabel: { fontSize: 7.5, color: SUBTLE, textTransform: 'uppercase', letterSpacing: 0.6 },
  quoteNumber: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: BRAND, marginTop: 1 },
  quoteDate: { fontSize: 8, color: MUTED, marginTop: 3 },

  // -- Judul ---------------------------------------------------------------
  title: { fontSize: 19, fontFamily: 'Helvetica-Bold', letterSpacing: -0.5, marginBottom: 3 },
  subtitle: { fontSize: 10, color: MUTED, marginBottom: 16 },

  // -- Blok umum -----------------------------------------------------------
  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 7,
    letterSpacing: -0.2,
  },
  groupTitle: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: SUBTLE,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 8,
    marginBottom: 3,
  },

  // -- Kartu angka utama ---------------------------------------------------
  highlightRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  highlightCard: {
    flex: 1,
    backgroundColor: SOFT,
    borderRadius: 6,
    padding: 11,
    borderLeftWidth: 3,
    borderLeftColor: BRAND,
  },
  highlightLabel: {
    fontSize: 7.5,
    color: SUBTLE,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  highlightValue: { fontSize: 13, fontFamily: 'Helvetica-Bold', marginTop: 3, letterSpacing: -0.3 },
  highlightHint: { fontSize: 7.5, color: MUTED, marginTop: 2 },

  // -- Baris tabel ---------------------------------------------------------
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 3.5,
    borderBottomWidth: 0.5,
    borderBottomColor: LINE,
    gap: 12,
  },
  rowLabel: { flex: 1, fontSize: 9 },
  rowValue: { fontSize: 9, textAlign: 'right', minWidth: 118 },
  rowValueBold: { fontSize: 10, fontFamily: 'Helvetica-Bold', textAlign: 'right', minWidth: 118 },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: SOFT,
    borderRadius: 5,
    marginTop: 6,
    gap: 12,
  },
  totalLabel: { fontSize: 10.5, fontFamily: 'Helvetica-Bold' },
  totalValue: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: BRAND, textAlign: 'right' },

  typeTag: { fontSize: 7, color: SUBTLE },

  // -- Diagram fase --------------------------------------------------------
  phaseRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5, gap: 8 },
  phaseName: { width: 118, fontSize: 8.5 },
  phaseBarTrack: { flex: 1, height: 12, backgroundColor: SOFT, borderRadius: 3 },
  phaseBar: { height: 12, backgroundColor: BRAND, borderRadius: 3 },
  phaseWeeks: { width: 52, fontSize: 8, color: MUTED, textAlign: 'right' },
  phaseDesc: { fontSize: 7.5, color: MUTED, marginLeft: 126, marginBottom: 4, marginTop: -2 },

  // -- Daftar --------------------------------------------------------------
  bullet: { flexDirection: 'row', gap: 5, marginBottom: 3 },
  bulletDot: { fontSize: 9, color: SUBTLE, width: 8 },
  bulletText: { flex: 1, fontSize: 8.5, color: MUTED },

  // -- Kotak catatan -------------------------------------------------------
  noteBox: {
    backgroundColor: SOFT,
    borderRadius: 5,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: WARN,
  },
  noteText: { fontSize: 8.5, color: MUTED },

  // -- Kaki halaman --------------------------------------------------------
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 42,
    right: 42,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: LINE,
    paddingTop: 7,
  },
  footerText: { fontSize: 7, color: SUBTLE },
});

/**
 * Menyeragamkan karakter tipografis ke padanan ASCII.
 *
 * PDF ini memakai Helvetica bawaan agar tidak perlu menyematkan berkas font.
 * Konsekuensinya, tanda pisah panjang, kutip melengkung, dan elipsis tidak
 * punya glif dan hilang begitu saja saat dirender - cacat yang baru ketahuan
 * setelah dokumen sampai di tangan klien. Karena itu seluruh teks dilewatkan
 * fungsi ini sebelum masuk ke halaman.
 */
function t(value: string): string {
  return value
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2026/g, '...')
    .replace(/\u00A0/g, ' ')
    .replace(/\u2022/g, '-')
    .replace(/\u2264/g, 'maks. ')
    .replace(/\u2265/g, 'min. ')
    .replace(/\u00D7/g, 'x');
}

function rupiah(value: number): string {
  return `Rp ${Math.round(value).toLocaleString('id-ID')}`;
}

function rupiahRange(min: number, max: number): string {
  return min === max ? rupiah(min) : `${rupiah(min)} - ${rupiah(max)}`;
}

function tanggal(value: Date): string {
  return value.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

export interface ProposalData {
  quoteNumber: string;
  issuedAt: Date;
  validUntil: Date;
  client: { name: string; company: string | null; email: string; whatsapp: string };
  configurationName: string;
  categoryName: string;
  platform: ProjectPlatform;
  deployment: ProjectDeployment;
  userTier: UserTier;
  breakdown: PriceBreakdown;
  pendingCustoms: Array<{ name: string; priority: string }>;
  assumptions: string[];
  exclusions: string[];
  company: {
    name: string;
    legalName: string;
    email: string;
    phone: string;
    address: string;
  };
}

export function ProposalDocument({ data }: { data: ProposalData }) {
  const { breakdown } = data;

  // Kelompokkan baris fitur agar daftar terbaca seperti daftar isi aplikasi.
  const byGroup = new Map<string, typeof breakdown.lines>();
  for (const line of breakdown.lines) {
    const key = line.groupName ?? 'Lainnya';
    byGroup.set(key, [...(byGroup.get(key) ?? []), line]);
  }

  const totalPhaseWeeks = breakdown.duration.phases.reduce((sum, p) => sum + p.weeks, 0) || 1;

  const Header = () => (
    <View style={styles.header} fixed>
      <View>
        <View style={styles.logoRow}>
          <View style={styles.logoMark} />
          <View style={styles.logoMarkAccent} />
          <Text style={styles.brandName}>{t(data.company.name)}</Text>
        </View>
        <Text style={styles.companyMeta}>{t(data.company.legalName)}</Text>
        <Text style={styles.companyMeta}>{t(data.company.address)}</Text>
      </View>
      <View style={styles.quoteBox}>
        <Text style={styles.quoteLabel}>Nomor Penawaran</Text>
        <Text style={styles.quoteNumber}>{data.quoteNumber}</Text>
        <Text style={styles.quoteDate}>Diterbitkan {tanggal(data.issuedAt)}</Text>
        <Text style={styles.quoteDate}>Berlaku sampai {tanggal(data.validUntil)}</Text>
      </View>
    </View>
  );

  const Footer = () => (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>
        {data.quoteNumber} · {data.company.name} · {data.company.email} · {data.company.phone}
      </Text>
      <Text
        style={styles.footerText}
        render={({ pageNumber, totalPages }) => `Halaman ${pageNumber} dari ${totalPages}`}
      />
    </View>
  );

  return (
    <Document
      title={`Penawaran ${data.quoteNumber} - ${data.configurationName}`}
      author={data.company.legalName}
      subject={`Penawaran pembuatan ${data.categoryName}`}
    >
      {/* ================= Halaman 1: ringkasan & biaya ================= */}
      <Page size="A4" style={styles.page}>
        <Header />

        <Text style={styles.title}>Penawaran Pembuatan Aplikasi</Text>
        <Text style={styles.subtitle}>
          {t(data.categoryName)} · {t(data.configurationName)}
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ditujukan kepada</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Nama</Text>
            <Text style={styles.rowValue}>{t(data.client.name)}</Text>
          </View>
          {data.client.company && (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Perusahaan</Text>
              <Text style={styles.rowValue}>{t(data.client.company)}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Email</Text>
            <Text style={styles.rowValue}>{t(data.client.email)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>WhatsApp</Text>
            <Text style={styles.rowValue}>{t(data.client.whatsapp)}</Text>
          </View>
        </View>

        <View style={styles.highlightRow}>
          <View style={styles.highlightCard}>
            <Text style={styles.highlightLabel}>Estimasi Biaya Proyek</Text>
            <Text style={styles.highlightValue}>
              {rupiah(breakdown.displayTotalMin)} - {rupiah(breakdown.displayTotalMax)}
            </Text>
            <Text style={styles.highlightHint}>Sekali bayar, dibayar bertahap</Text>
          </View>
          <View style={styles.highlightCard}>
            <Text style={styles.highlightLabel}>Waktu Pengerjaan</Text>
            <Text style={styles.highlightValue}>
              {breakdown.duration.weeksMin} - {breakdown.duration.weeksMax} minggu
            </Text>
            <Text style={styles.highlightHint}>Sejak kickoff sampai go-live</Text>
          </View>
          <View style={styles.highlightCard}>
            <Text style={styles.highlightLabel}>Jumlah Fitur</Text>
            <Text style={styles.highlightValue}>{breakdown.lines.length} fitur</Text>
            <Text style={styles.highlightHint}>
              termasuk {breakdown.coreFeatureCount} modul fondasi
            </Text>
          </View>
        </View>

        {/* -- Mengapa harga berupa rentang (PRD 6.9) --------------------- */}
        <View style={[styles.section, styles.noteBox]}>
          <Text style={[styles.noteText, { fontFamily: 'Helvetica-Bold', color: INK }]}>
            Mengapa harganya berupa rentang?
          </Text>
          <Text style={styles.noteText}>
            Rentang ini mencerminkan tingkat penyesuaian yang mungkin dibutuhkan proses bisnis
            Anda. Batas bawah berlaku bila proses Anda dapat mengikuti alur bawaan modul kami;
            batas atas berlaku bila ada penyesuaian alur, field tambahan, atau aturan khusus.
            Setelah sesi konsultasi 30 menit, kami mengunci satu harga tetap yang berlaku 30 hari.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Perhitungan Biaya</Text>

          {breakdown.corePackagePrice > 0 && (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>
                Paket dasar - {breakdown.coreFeatureCount} modul fondasi
              </Text>
              <Text style={styles.rowValue}>{rupiah(breakdown.corePackagePrice)}</Text>
            </View>
          )}

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Subtotal fitur</Text>
            <Text style={styles.rowValue}>
              {rupiahRange(breakdown.featuresSubtotalMin, breakdown.featuresSubtotalMax)}
            </Text>
          </View>

          {breakdown.platformMultiplier !== 1 && (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>
                Penyesuaian platform - {t(PROJECT_PLATFORM_LABEL[data.platform])}
              </Text>
              <Text style={styles.rowValue}>x {breakdown.platformMultiplier.toFixed(2)}</Text>
            </View>
          )}

          {breakdown.deploymentMultiplier !== 1 && (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>
                Penyesuaian deployment - {t(PROJECT_DEPLOYMENT_LABEL[data.deployment])}
              </Text>
              <Text style={styles.rowValue}>x {breakdown.deploymentMultiplier.toFixed(2)}</Text>
            </View>
          )}

          {breakdown.discountPct > 0 && (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>
                Diskon skala - {t(breakdown.discountLabel)} ({Math.round(breakdown.discountPct * 100)}%)
              </Text>
              <Text style={[styles.rowValue, { color: OK }]}>
                −{rupiahRange(breakdown.discountMin, breakdown.discountMax)}
              </Text>
            </View>
          )}

          {breakdown.addOnLines.map((addOn) => (
            <View key={addOn.id} style={styles.row}>
              <Text style={styles.rowLabel}>{t(addOn.name)}</Text>
              <Text style={styles.rowValue}>{rupiahRange(addOn.priceMin, addOn.priceMax)}</Text>
            </View>
          ))}

          {breakdown.setupFee > 0 && (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Biaya setup &amp; onboarding</Text>
              <Text style={styles.rowValue}>{rupiah(breakdown.setupFee)}</Text>
            </View>
          )}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Estimasi Proyek</Text>
            <Text style={styles.totalValue}>
              {rupiahRange(breakdown.totalMin, breakdown.totalMax)}
            </Text>
          </View>

          {breakdown.recurringLines.length > 0 && (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.sectionTitle}>
                Biaya Bulanan Berulang - Terpisah dari Nilai Proyek
              </Text>
              {breakdown.recurringLines.map((line) => (
                <View key={line.id} style={styles.row}>
                  <Text style={styles.rowLabel}>{t(line.name)}</Text>
                  <Text style={styles.rowValue}>
                    {rupiahRange(line.priceMin, line.priceMax)} / bulan
                  </Text>
                </View>
              ))}
              <View style={styles.row}>
                <Text style={[styles.rowLabel, { fontFamily: 'Helvetica-Bold' }]}>
                  Total per bulan
                </Text>
                <Text style={styles.rowValueBold}>
                  {rupiahRange(breakdown.recurringMonthlyMin, breakdown.recurringMonthlyMax)}
                </Text>
              </View>
              <Text style={[styles.bulletText, { marginTop: 4 }]}>
                Biaya berulang mulai berjalan setelah aplikasi diserahterimakan dan tidak
                dijumlahkan ke nilai proyek di atas.
              </Text>
            </View>
          )}
        </View>

        {data.pendingCustoms.length > 0 && (
          <View style={[styles.section, styles.noteBox]}>
            <Text style={[styles.noteText, { fontFamily: 'Helvetica-Bold', color: INK }]}>
              {data.pendingCustoms.length} fitur khusus menunggu estimasi
            </Text>
            <Text style={styles.noteText}>
              Fitur berikut belum masuk perhitungan di atas karena kami tidak menampilkan angka
              yang belum diperiksa manusia. Tim kami menyampaikan estimasinya paling lambat 1x24
              jam kerja: {t(data.pendingCustoms.map((c) => c.name).join('; '))}.
            </Text>
          </View>
        )}

        <Footer />
      </Page>

      {/* ================= Halaman 2: ruang lingkup fitur ================= */}
      <Page size="A4" style={styles.page}>
        <Header />

        <Text style={styles.sectionTitle}>Ruang Lingkup Fitur</Text>
        <Text style={[styles.bulletText, { marginBottom: 8 }]}>
          Daftar berikut adalah Scope of Work penawaran ini. Fitur di luar daftar ini dihitung
          sebagai perubahan ruang lingkup.
        </Text>

        {[...byGroup.entries()].map(([groupName, lines]) => (
          <View key={groupName} wrap={false}>
            <Text style={styles.groupTitle}>{t(groupName)}</Text>
            {lines.map((line) => (
              <View key={line.id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>{line.name}</Text>
                  {line.type !== 'STANDARD' && (
                    <Text style={styles.typeTag}>{t(FEATURE_TYPE_LABEL[line.type])}</Text>
                  )}
                </View>
                <Text style={styles.rowValue}>
                  {line.includedInBasePackage
                    ? 'Termasuk paket dasar'
                    : rupiahRange(line.priceMin, line.priceMax)}
                </Text>
              </View>
            ))}
          </View>
        ))}

        <View style={[styles.section, { marginTop: 14 }]}>
          <Text style={styles.sectionTitle}>Konfigurasi Proyek</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Platform</Text>
            <Text style={styles.rowValue}>{t(PROJECT_PLATFORM_LABEL[data.platform])}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Deployment</Text>
            <Text style={styles.rowValue}>{t(PROJECT_DEPLOYMENT_LABEL[data.deployment])}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Jumlah pengguna</Text>
            <Text style={styles.rowValue}>{t(USER_TIER_LABEL[data.userTier])}</Text>
          </View>
        </View>

        <Footer />
      </Page>

      {/* ============ Halaman 3: tahapan, asumsi, pengecualian ============ */}
      <Page size="A4" style={styles.page}>
        <Header />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tahapan Pengerjaan</Text>
          <Text style={[styles.bulletText, { marginBottom: 8 }]}>
            Total {breakdown.duration.weeksMin} - {breakdown.duration.weeksMax} minggu, dihitung
            dari kompleksitas fitur yang dipilih.
          </Text>

          {breakdown.duration.phases.map((phase) => (
            <View key={phase.name} wrap={false}>
              <View style={styles.phaseRow}>
                <Text style={styles.phaseName}>{t(phase.name)}</Text>
                <View style={styles.phaseBarTrack}>
                  <View
                    style={[
                      styles.phaseBar,
                      { width: `${Math.max(10, (phase.weeks / totalPhaseWeeks) * 100)}%` },
                    ]}
                  />
                </View>
                <Text style={styles.phaseWeeks}>~ {phase.weeks} mgg</Text>
              </View>
              <Text style={styles.phaseDesc}>{t(phase.description)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Asumsi yang Kami Pakai</Text>
          {data.assumptions.map((item) => (
            <View key={item} style={styles.bullet}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>{t(item)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Yang Tidak Termasuk</Text>
          <Text style={[styles.bulletText, { marginBottom: 4 }]}>
            Kami menuliskannya di depan supaya tidak menjadi perdebatan di tengah proyek.
          </Text>
          {data.exclusions.map((item) => (
            <View key={item} style={styles.bullet}>
              <Text style={[styles.bulletDot, { color: WARN }]}>x</Text>
              <Text style={styles.bulletText}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cara Pembayaran</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Termin 1 - Kickoff (uang muka)</Text>
            <Text style={styles.rowValue}>
              30% · {rupiah(breakdown.totalMax * 0.3)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Termin 2 - Serah terima Fase 1</Text>
            <Text style={styles.rowValue}>
              40% · {rupiah(breakdown.totalMax * 0.4)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Termin 3 - Go-live &amp; serah terima akhir</Text>
            <Text style={styles.rowValue}>
              30% · {rupiah(breakdown.totalMax * 0.3)}
            </Text>
          </View>
          <Text style={[styles.bulletText, { marginTop: 4 }]}>
            Nilai termin di atas dihitung dari batas atas rentang dan akan disesuaikan mengikuti
            harga tetap yang dikunci setelah sesi konsultasi. Seluruh nilai belum termasuk PPN.
          </Text>
        </View>

        <View style={styles.noteBox}>
          <Text style={[styles.noteText, { fontFamily: 'Helvetica-Bold', color: INK }]}>
            Langkah berikutnya
          </Text>
          <Text style={styles.noteText}>
            Penawaran ini berlaku sampai {tanggal(data.validUntil)}. Jadwalkan sesi konsultasi 30
            menit untuk menyelaraskan ruang lingkup dengan proses kerja Anda; setelah sesi itu
            kami mengunci satu harga tetap beserta klausul perubahan ruang lingkup. Hubungi kami
            di {data.company.email} atau {data.company.phone}.
          </Text>
        </View>

        <Footer />
      </Page>
    </Document>
  );
}
