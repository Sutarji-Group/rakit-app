'use client';

import { useEffect } from 'react';
import { track } from '@/lib/analytics/track';

/** Mencatat kunjungan ke halaman ringkasan (event summary_viewed, PRD 13). */
export function SummaryAnalytics({
  token,
  totalMin,
  totalMax,
  featureCount,
}: {
  token: string;
  totalMin: number;
  totalMax: number;
  featureCount: number;
}) {
  useEffect(() => {
    track(
      'summary_viewed',
      { total_min: totalMin, total_max: totalMax, feature_count: featureCount },
      token,
    );
  }, [token, totalMin, totalMax, featureCount]);

  return null;
}
