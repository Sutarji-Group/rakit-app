import type { ReactNode } from 'react';
import { Section } from './section';

export interface LegalSection {
  /** Slug untuk tautan daftar isi. */
  id: string;
  title: string;
  /** Paragraf; string biasa maupun elemen bila perlu tautan. */
  body?: ReactNode[];
  /** Butir bernomor atau bertanda titik. */
  bullets?: ReactNode[];
}

/**
 * Kerangka halaman dokumen hukum (kebijakan privasi & syarat layanan).
 *
 * Dokumen semacam ini jarang dibaca dari atas ke bawah — orang mencari satu
 * pasal tertentu. Karena itu setiap bagian punya penanda sendiri dan daftar
 * isi yang bisa diklik, bukan satu blok teks panjang tanpa pegangan.
 */
export function LegalDocument({
  title,
  summary,
  updatedAt,
  sections,
}: {
  title: string;
  summary: string;
  updatedAt: string;
  sections: LegalSection[];
}) {
  return (
    <Section size="lg">
      <div className="flex max-w-3xl flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-soft-fg">
          Dokumen resmi
        </p>
        <h1 className="text-balance text-2xl font-semibold leading-tight tracking-[-0.02em] text-fg sm:text-3xl">
          {title}
        </h1>
        <p className="text-[15px] leading-relaxed text-fg-muted">{summary}</p>
        <p className="text-sm text-fg-subtle">Berlaku sejak {updatedAt}.</p>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[240px_1fr] lg:gap-14">
        {/* Daftar isi menempel di layar besar; di ponsel ia menjadi daftar
            biasa di atas isi dokumen agar tidak memakan ruang layar. */}
        <nav aria-label="Daftar isi dokumen" className="lg:sticky lg:top-24 lg:self-start">
          <p className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">Daftar isi</p>
          <ol className="mt-3 flex flex-col gap-2">
            {sections.map((section, index) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="text-sm leading-snug text-fg-muted underline-offset-4 hover:text-fg hover:underline"
                >
                  <span className="tabular mr-1.5 text-fg-subtle">{index + 1}.</span>
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="flex max-w-3xl flex-col gap-10">
          {sections.map((section, index) => (
            <article key={section.id} id={section.id} className="scroll-mt-24">
              <h2 className="text-lg font-semibold tracking-[-0.01em] text-fg">
                <span className="tabular mr-2 text-fg-subtle">{index + 1}.</span>
                {section.title}
              </h2>

              {section.body?.map((paragraph, paragraphIndex) => (
                <p
                  key={paragraphIndex}
                  className="mt-3 text-[15px] leading-relaxed text-fg-muted"
                >
                  {paragraph}
                </p>
              ))}

              {section.bullets && (
                <ul className="mt-3 flex flex-col gap-2">
                  {section.bullets.map((bullet, bulletIndex) => (
                    <li
                      key={bulletIndex}
                      className="flex items-start gap-2 text-[15px] leading-relaxed text-fg-muted"
                    >
                      <span
                        className="mt-2 size-1.5 shrink-0 rounded-full bg-border-strong"
                        aria-hidden="true"
                      />
                      {bullet}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
      </div>
    </Section>
  );
}
