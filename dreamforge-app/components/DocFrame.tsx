'use client';

import { useState } from 'react';
import Link from 'next/link';
import SecretsLayout from './SecretsLayout';

export interface DocSection {
  heading?: string;
  paragraphs: string[];
}

export default function DocFrame({
  title,
  lede,
  sections,
  related,
}: {
  title: string;
  lede?: string;
  sections: DocSection[];
  related?: { href: string; label: string }[];
}) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <SecretsLayout isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated} userTier="free">
      <article className="max-w-3xl mx-auto px-5 py-10">
        <h1 className="text-[28px] font-semibold leading-tight">{title}</h1>
        {lede && <p className="mt-4 text-[15px] leading-7 text-[#d7d7d7]">{lede}</p>}
        <div className="mt-8 space-y-8">
          {sections.map((section) => (
            <section key={section.heading || section.paragraphs[0]?.slice(0, 24)}>
              {section.heading && <h2 className="text-xl font-semibold mb-3">{section.heading}</h2>}
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph.slice(0, 48)} className="mb-3 text-[15px] leading-7 text-[#cfcfcf]">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>
        {related && related.length > 0 && (
          <ul className="mt-10 border-t border-white/10 pt-6 space-y-2">
            {related.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-sm text-[#ff4d8d] hover:underline">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </article>
    </SecretsLayout>
  );
}
