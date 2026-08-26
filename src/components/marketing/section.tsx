import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

/**
 * Kerangka satu bagian halaman publik.
 *
 * Dibuat terpisah supaya jarak vertikal, lebar maksimum, dan padding sisi
 * konsisten di seluruh halaman pemasaran. Halaman ini dibaca lebih dari
 * separuhnya dari ponsel, jadi padding sisi 16px menjadi dasar dan baru
 * melebar di layar besar.
 */
export function Section({
  id,
  tone = 'default',
  size = 'md',
  className,
  containerClassName,
  children,
}: {
  id?: string;
  tone?: 'default' | 'sunken' | 'brand';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  containerClassName?: string;
  children: ReactNode;
}) {
  const toneClass = {
    default: '',
    sunken: 'bg-surface-sunken/50',
    brand: 'bg-brand-soft',
  }[tone];

  const sizeClass = {
    sm: 'py-10 sm:py-14',
    md: 'py-14 sm:py-20',
    lg: 'py-16 sm:py-24',
  }[size];

  return (
    <section id={id} className={cn(toneClass, sizeClass, className)}>
      <div className={cn('mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8', containerClassName)}>
        {children}
      </div>
    </section>
  );
}

/** Label kecil di atas judul bagian. */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        'text-xs font-semibold uppercase tracking-[0.12em] text-brand-soft-fg',
        className,
      )}
    >
      {children}
    </p>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  className,
  as: Heading = 'h2',
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  align?: 'left' | 'center';
  className?: string;
  as?: 'h1' | 'h2' | 'h3';
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3',
        align === 'center' && 'items-center text-center',
        className,
      )}
    >
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <Heading className="text-balance text-2xl font-semibold leading-tight tracking-[-0.02em] text-fg sm:text-3xl">
        {title}
      </Heading>
      {description && (
        <p
          className={cn(
            'max-w-2xl text-[15px] leading-relaxed text-fg-muted',
            align === 'center' && 'mx-auto',
          )}
        >
          {description}
        </p>
      )}
    </div>
  );
}

/**
 * Pembungkus teks panjang (kebijakan privasi, syarat layanan).
 * Lebar baris dijaga di sekitar 70 karakter agar tetap nyaman dibaca.
 */
export function Prose({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex max-w-3xl flex-col gap-4 text-[15px] leading-relaxed text-fg-muted', className)}>
      {children}
    </div>
  );
}
