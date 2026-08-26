/**
 * Daftar event analitik minimum (PRD bagian 13).
 *
 * Tiga event paling berharga secara strategis:
 *   configuration_abandoned  — di harga berapa klien menyerah
 *   custom_feature_submitted — roadmap modul berikutnya
 *   feature_removed          — fitur mana yang dianggap tidak bernilai
 */

export const ANALYTICS_EVENTS = [
  'page_view_landing',
  'category_selected',
  'wizard_started',
  'wizard_completed',
  'wizard_skipped',
  'configurator_opened',
  'feature_added',
  'feature_removed',
  'dependency_triggered',
  'feature_example_viewed',
  'custom_feature_started',
  'custom_feature_submitted',
  'price_explainer_opened',
  'project_options_completed',
  'summary_viewed',
  'lead_form_started',
  'configuration_submitted',
  'proposal_downloaded',
  'call_scheduled',
  'configuration_abandoned',
  'preset_applied',
  'configuration_shared',
  'consultant_requested',
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number];

export interface AnalyticsPayloadMap {
  page_view_landing: Record<string, never>;
  category_selected: { category: string };
  wizard_started: { category: string };
  wizard_completed: { category: string; answeredCount: number; mappedFeatures: number };
  wizard_skipped: { category: string };
  configurator_opened: { category: string; source: 'wizard' | 'direct' | 'preset' | 'share' };
  feature_added: { feature_id: string; cart_total_min: number; cart_size: number };
  feature_removed: { feature_id: string; reason: 'manual' | 'cascade' | 'conflict' };
  dependency_triggered: { trigger_feature: string; added_feature: string };
  feature_example_viewed: { feature_id: string };
  custom_feature_started: { category: string };
  custom_feature_submitted: { name: string; category: string; priority: string };
  price_explainer_opened: Record<string, never>;
  project_options_completed: { platform: string; deployment: string; userTier: string };
  summary_viewed: { total_min: number; total_max: number; feature_count: number };
  lead_form_started: { total_min: number; total_max: number };
  configuration_submitted: {
    total_min: number;
    total_max: number;
    feature_count: number;
    custom_count: number;
  };
  proposal_downloaded: { quote_number: string };
  call_scheduled: { quote_number: string };
  configuration_abandoned: { last_step: string; cart_total_min: number; time_spent: number };
  preset_applied: { preset: string; category: string };
  configuration_shared: { channel: string };
  consultant_requested: { from_step: string; cart_total_min: number };
}

/** Corong konversi (PRD 4.2) beserta target enam bulan. */
export const FUNNEL_STAGES = [
  {
    key: 'landing',
    label: 'Kunjungan landing',
    event: 'page_view_landing' as AnalyticsEventName,
    target: null,
  },
  {
    key: 'category',
    label: 'Pilih kategori aplikasi',
    event: 'category_selected' as AnalyticsEventName,
    target: 0.35,
    targetLabel: 'Category Selection Rate ≥ 35%',
  },
  {
    key: 'configurator',
    label: 'Masuk konfigurator',
    event: 'configurator_opened' as AnalyticsEventName,
    target: 0.6,
    targetLabel: 'Configurator Entry Rate ≥ 60%',
  },
  {
    key: 'summary',
    label: 'Lihat ringkasan',
    event: 'summary_viewed' as AnalyticsEventName,
    target: null,
  },
  {
    key: 'submitted',
    label: 'Kirim konfigurasi',
    event: 'configuration_submitted' as AnalyticsEventName,
    target: 0.12,
    targetLabel: 'Configuration Submission Rate ≥ 12%',
  },
  {
    key: 'call',
    label: 'Discovery call terjadwal',
    event: 'call_scheduled' as AnalyticsEventName,
    target: 0.5,
    targetLabel: 'Call Booking Rate ≥ 50%',
  },
] as const;
