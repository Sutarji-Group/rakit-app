'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { track } from '@/lib/analytics/track';
import type { AnalyticsEventName, AnalyticsPayloadMap } from '@/lib/analytics/events';

/**
 * Tautan biasa yang sekaligus mengirim satu event analitik saat diklik.
 *
 * Dipakai agar kartu kategori tetap Server Component: hanya tautannya yang
 * perlu berjalan di browser, bukan seluruh kartu. Corong konversi PRD 4.2
 * bergantung pada event `category_selected` di titik ini.
 */
export function TrackedLink<E extends AnalyticsEventName>({
  href,
  event,
  payload,
  className,
  ariaLabel,
  children,
}: {
  href: string;
  event: E;
  payload?: E extends keyof AnalyticsPayloadMap ? AnalyticsPayloadMap[E] : Record<string, unknown>;
  className?: string;
  ariaLabel?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={className}
      aria-label={ariaLabel}
      onClick={() => track(event, payload)}
    >
      {children}
    </Link>
  );
}
