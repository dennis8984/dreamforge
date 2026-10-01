'use client';

import { useState } from 'react';
import Link from 'next/link';
import SecretsLayout from '@/components/SecretsLayout';
import { POLICIES } from '@/lib/policies';

export default function LegalInformationPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <SecretsLayout isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated} userTier="free">
      <div className="max-w-3xl mx-auto px-5 py-10">
        <h1 className="text-[28px] font-semibold">Legal Information</h1>
        <p className="mt-4 text-[15px] leading-7 text-[#d7d7d7]">
          These are the DreamForge policies for accounts, privacy, age, payments, and the files the studio will not generate. Each page is the full text for that topic.
        </p>
        <ul className="mt-8 divide-y divide-white/10 border-y border-white/10">
          {POLICIES.map((policy) => (
            <li key={policy.slug}>
              <Link href={`/${policy.slug}`} className="block py-4 hover:text-[#ff4d8d]">
                <span className="block text-sm font-medium">{policy.title}</span>
                <span className="block text-sm text-[#9a9a9a] font-normal mt-1">{policy.description}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </SecretsLayout>
  );
}
