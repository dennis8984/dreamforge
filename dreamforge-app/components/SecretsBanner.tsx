'use client';

import Link from 'next/link';

const TIERS = [
  {
    name: 'Lite',
    price: 5.99,
    moments: '500',
    features: ['100 messages/day', 'Image generation', '1,000 Moments', '10% bonus', 'Access to Lite features', 'Limited voice'],
  },
  {
    name: 'Premium',
    price: 14.99,
    moments: '2,000',
    features: ['Everything in Lite', '8,000 Moments', 'Unlimited messages', 'Video generation', 'Voice calls'],
  },
  {
    name: 'Ultimate',
    price: 29.99,
    moments: '5,000',
    isNew: true,
    features: [
      'Everything from other tiers',
      '15,000 monthly Moments',
      'Up to 6x More Memory',
      'Personas & Advanced Customization',
      'AND MUCH MORE',
    ],
  },
];

export default function SecretsBanner() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-r from-purple-950/60 via-gray-900 to-black px-6 py-10">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 max-w-7xl mx-auto">
        <div className="flex-1">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
            The <span className="text-pink-400">Ultimate</span> experience is here!
          </h2>
          <Link
            href="/pricing"
            className="inline-flex items-center px-6 py-3 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold transition-colors"
          >
            Upgrade now
          </Link>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-2 w-full lg:w-auto lg:max-w-2xl">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`shrink-0 w-56 rounded-xl border p-4 ${
                tier.isNew
                  ? 'border-purple-500 bg-purple-900/30'
                  : 'border-gray-700 bg-gray-800/50'
              }`}
            >
              {tier.isNew && (
                <span className="inline-block px-2 py-0.5 text-xs font-medium bg-purple-600 text-white rounded mb-2">
                  NEW
                </span>
              )}
              <h3 className="font-bold text-white mb-1">{tier.name}</h3>
              <p className="text-2xl font-bold text-white mb-2">
                ${tier.price}
                <span className="text-sm font-normal text-gray-400">/mo</span>
              </p>
              <ul className="space-y-1 text-sm text-gray-300">
                {tier.features.slice(0, 4).map((f, i) => (
                  <li key={i} className="flex items-center gap-1">
                    <span className="text-purple-400">•</span> {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="shrink-0 w-8 flex items-center justify-center text-gray-500">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
