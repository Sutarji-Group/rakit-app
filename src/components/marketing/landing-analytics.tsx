'use client';

import { useEffect, useRef } from 'react';
import { track } from '@/lib/analytics/track';

/**
 * Pengirim event kunjungan landing (PRD bagian 13).
 *
 * Landing sendiri tetap Server Component; hanya potongan kecil ini yang
 * berjalan di browser, karena `page_view_landing` adalah dasar seluruh corong
 * konversi (PRD 4.2) dan hanya boleh terkirim satu kali per pemuatan halaman.
 */
export function LandingAnalytics() {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    track('page_view_landing', {});
  }, []);

  return null;
}
