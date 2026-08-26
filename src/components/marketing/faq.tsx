import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export interface FaqItem {
  question: string;
  answer: ReactNode;
}

/**
 * Daftar tanya-jawab yang bisa dibuka-tutup.
 *
 * Sengaja memakai <details>/<summary> bawaan browser, bukan akordeon buatan
 * sendiri: perilakunya sudah benar untuk pembaca layar dan keyboard, tetap
 * berfungsi bila JavaScript gagal dimuat, dan tidak menambah satu byte pun
 * JavaScript pada halaman pertama yang dibuka pengunjung.
 */
export function FaqList({ items, className }: { items: FaqItem[]; className?: string }) {
  return (
    <div className={cn('divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface', className)}>
      {items.map((item) => (
        <details key={item.question} className="group">
          {/* Safari memakai penanda segitiga sendiri yang tidak ikut hilang
              dengan list-none, jadi penanda itu disembunyikan terpisah. */}
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden text-left text-[15px] font-medium text-fg transition-colors hover:bg-surface-sunken/60 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand">
            {item.question}
            <ChevronDown
              className="size-4 shrink-0 text-fg-subtle transition-transform duration-200 group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>
          <div className="px-5 pb-5 text-[15px] leading-relaxed text-fg-muted">{item.answer}</div>
        </details>
      ))}
    </div>
  );
}
