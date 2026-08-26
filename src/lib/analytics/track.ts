'use client';

import type { AnalyticsEventName, AnalyticsPayloadMap } from './events';

const SESSION_KEY = 'rakit_analytics_session';

function sessionId(): string {
  if (typeof window === 'undefined') return 'server';
  try {
    let id = window.localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      window.localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    // Mode penyamaran atau penyimpanan diblokir — pelacakan tetap berjalan
    // dengan id sementara, bukan gagal total.
    return `anon-${Math.random().toString(36).slice(2, 10)}`;
  }
}

/**
 * Mengirim satu event analitik.
 *
 * Pengiriman sengaja tidak menunggu jawaban (fire-and-forget) agar tidak
 * pernah menambah latensi pada interaksi konfigurator.
 */
export function track<E extends AnalyticsEventName>(
  name: E,
  payload?: E extends keyof AnalyticsPayloadMap ? AnalyticsPayloadMap[E] : Record<string, unknown>,
  configurationToken?: string,
): void {
  if (typeof window === 'undefined') return;

  const body = JSON.stringify({
    name,
    sessionId: sessionId(),
    configurationToken,
    payload: payload ?? {},
    path: window.location.pathname,
    referrer: document.referrer || undefined,
  });

  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics', new Blob([body], { type: 'application/json' }));
      return;
    }
  } catch {
    // Lanjut ke fetch di bawah.
  }

  void fetch('/api/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {
    // Kegagalan pelacakan tidak boleh mengganggu pengalaman pengguna.
  });
}

export { sessionId as analyticsSessionId };
