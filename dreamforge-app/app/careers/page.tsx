'use client';

import { useState } from 'react';
import SecretsLayout from '@/components/SecretsLayout';

const ROLES = [
  {
    title: 'Product engineer',
    body: 'You would work on the Next.js app: the companion chat, the still-then-clip flow, and the Moments ledger. You are comfortable reading a route before changing a debit, and you treat the 21+ rule as a product constraint.',
  },
  {
    title: 'Studio generalist',
    body: 'You would help shape original adult characters and the shorts that are ours. The work is prompts, reviews, and keeping the catalog fictional. It is not scraping another studio’s roster.',
  },
];

export default function CareersPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <SecretsLayout isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated} userTier="free">
      <article className="max-w-3xl mx-auto px-5 py-10">
        <h1 className="text-[28px] font-semibold">We&apos;re hiring</h1>
        <p className="mt-4 text-[15px] leading-7 text-[#d7d7d7]">
          DreamForge is a small studio. Open roles are listed here, not on another company’s board. If a role is missing, we are not hiring for it.
        </p>
        <div className="mt-8 space-y-6">
          {ROLES.map((role) => (
            <section key={role.title} className="rounded-2xl bg-[#17171a] p-5">
              <h2 className="text-lg font-semibold">{role.title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#cfcfcf]">{role.body}</p>
            </section>
          ))}
        </div>
        <p className="mt-8 text-sm leading-6 text-[#cfcfcf]">
          Send a short note and a link to work you have shipped to support@dreamforge.app. Use the subject line Hiring. We reply when there is a fit. A message does not create an offer.
        </p>
      </article>
    </SecretsLayout>
  );
}
