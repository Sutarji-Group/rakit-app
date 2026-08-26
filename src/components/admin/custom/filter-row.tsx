import Link from 'next/link';

export interface FilterOption {
  href: string;
  label: string;
  count: number;
  active: boolean;
}

/**
 * Baris penyaring berbentuk tautan, bukan dropdown berstate.
 *
 * Dengan begitu hasil saringan punya URL sendiri dan dapat ditempel ke chat tim
 * ("ini yang lewat tenggat") tanpa penerimanya harus mengulang klik yang sama.
 */
export function FilterRow({ label, options }: { label: string; options: FilterOption[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-fg-subtle">{label}</span>
      {options.map((option) => (
        <Link
          key={`${option.href}-${option.label}`}
          href={option.href}
          aria-current={option.active ? 'true' : undefined}
          className={
            option.active
              ? 'inline-flex items-center gap-1.5 rounded-lg border border-transparent bg-brand-soft px-2.5 py-1 text-[13px] font-medium text-brand-soft-fg'
              : 'inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1 text-[13px] font-medium text-fg-muted transition-colors hover:border-border-strong hover:text-fg'
          }
        >
          {option.label}
          <span className="tabular text-[11px] opacity-70">{option.count}</span>
        </Link>
      ))}
    </div>
  );
}
