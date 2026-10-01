'use client';

import { useState } from 'react';
import SecretsLayout from '@/components/SecretsLayout';

export default function ContactPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <SecretsLayout isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated} userTier="free">
      <article className="max-w-3xl mx-auto px-5 py-10">
        <h1 className="text-[28px] font-semibold">Contact</h1>
        <p className="mt-4 text-[15px] leading-7 text-[#d7d7d7]">
          Email support@dreamforge.app. Include the email on your account if the note is about billing, a chat, or a file. Safety reports about anyone under 21 should say that in the subject.
        </p>
        <h2 className="mt-8 text-xl font-semibold">Discord and X</h2>
        <p className="mt-3 text-[15px] leading-7 text-[#cfcfcf]">
          DreamForge does not run a public Discord or X account yet. The footer labels land here so they are not pointed at another studio. When a channel exists, this page will list it.
        </p>
        <h2 className="mt-8 text-xl font-semibold">Billing</h2>
        <p className="mt-3 text-[15px] leading-7 text-[#cfcfcf]">
          Card charges are processed by Stripe. Open the billing portal from the pricing page for a receipt or to stop renewal. The name on the statement is the DreamForge billing name.
        </p>
      </article>
    </SecretsLayout>
  );
}
