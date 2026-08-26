import { cn } from '@/lib/utils';
import { site } from '@/lib/site';

/**
 * Lambang "Rakit": tiga balok yang tersusun menjadi satu bentuk utuh —
 * gambaran langsung dari merakit scope fitur per fitur.
 */
export function Logo({
  className,
  showWordmark = true,
}: {
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <svg viewBox="0 0 28 28" className="size-7 shrink-0" aria-hidden="true">
        <rect x="2" y="14.5" width="11" height="11" rx="2.5" fill="var(--brand)" />
        <rect x="15" y="14.5" width="11" height="11" rx="2.5" fill="var(--brand)" opacity="0.55" />
        <rect x="8.5" y="2.5" width="11" height="11" rx="2.5" fill="var(--accent)" />
      </svg>
      {showWordmark && (
        <span className="text-[17px] font-semibold tracking-[-0.02em] text-fg">{site.name}</span>
      )}
    </span>
  );
}
