'use client';

import { useState } from 'react';
import Link from 'next/link';
import SecretsLayout from '@/components/SecretsLayout';
import { helpCategories } from '@/lib/help-articles';

export default function HelpPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const categories = helpCategories();

  return (
    <SecretsLayout isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated} userTier="free">
      <div className="max-w-3xl mx-auto px-5 py-10">
        <h1 className="text-[28px] font-semibold">Help Center</h1>
        <p className="mt-4 text-[15px] leading-7 text-[#d7d7d7]">
          Answers for signup, Moments, chat, stills, five-second clips, voice, and account deletion. If a page does not cover it, email support@dreamforge.app from the address on the account.
        </p>
        <div className="mt-8 space-y-8">
          {categories.map((category) => (
            <section key={category.name}>
              <h2 className="text-sm font-semibold text-[#9a9a9a] uppercase tracking-wide mb-3">{category.name}</h2>
              <ul className="divide-y divide-white/10 border-y border-white/10">
                {category.articles.map((article) => (
                  <li key={article.slug}>
                    <Link href={`/help/${article.slug}`} className="block py-3 text-sm font-medium hover:text-[#ff4d8d]">
                      {article.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </SecretsLayout>
  );
}
