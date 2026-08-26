'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Angka yang beranimasi saat nilainya berubah (C4.3).
 *
 * Tujuannya bukan hiasan: transisi memperjelas hubungan sebab-akibat antara
 * pilihan fitur dan harga. Tanpa animasi, angka yang berganti mendadak sering
 * tidak disadari klien, dan panel harga kehilangan fungsinya sebagai umpan balik.
 *
 * Menghormati prefers-reduced-motion: bila pengguna meminta gerak minimal,
 * nilai langsung berganti tanpa interpolasi.
 */
export function AnimatedNumber({
  value,
  format,
  durationMs = 420,
  className,
}: {
  value: number;
  format: (value: number) => string;
  durationMs?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced || fromRef.current === value) {
      fromRef.current = value;
      setDisplay(value);
      return;
    }

    const from = fromRef.current;
    const delta = value - from;
    const startedAt = performance.now();

    const step = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / durationMs);
      // Easing out-cubic: cepat di awal lalu melambat, terasa responsif.
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + delta * eased);
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(step);
      } else {
        fromRef.current = value;
      }
    };

    frameRef.current = requestAnimationFrame(step);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      fromRef.current = value;
    };
  }, [value, durationMs]);

  return (
    <span className={className} aria-live="polite">
      {format(display)}
    </span>
  );
}
