'use client';

import { useState } from 'react';
import Link from 'next/link';
import SecretsLayout from './SecretsLayout';
import type { CastPage } from '@/lib/cast-pages';

export default function CastArticle({ page }: { page: CastPage }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <SecretsLayout isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated} userTier="free">
      <article className="max-w-3xl mx-auto px-5 py-10">
        <h1 className="text-[28px] font-semibold leading-tight">{page.h1}</h1>
        <p className="mt-4 text-[15px] leading-7 text-[#d7d7d7]">{page.lede}</p>
        <Link href="/" className="inline-block mt-6 px-4 h-10 leading-10 rounded-full bg-[#ee5876] text-sm font-semibold">
          Browse characters
        </Link>
        <div className="mt-10 space-y-8">
          {page.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-xl font-semibold mb-3">{section.heading}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph.slice(0, 40)} className="mb-3 text-[15px] leading-7 text-[#cfcfcf]">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>
        <h2 className="text-xl font-semibold mt-12 mb-4">Questions</h2>
        <div className="space-y-3">
          {page.faqs.map((item) => (
            <details key={item.q} className="rounded-xl bg-[#17171a] px-4 py-3">
              <summary className="cursor-pointer text-sm font-semibold">{item.q}</summary>
              <p className="mt-2 text-sm leading-6 text-[#cfcfcf]">{item.a}</p>
            </details>
          ))}
        </div>
      </article>
    </SecretsLayout>
  );
}
