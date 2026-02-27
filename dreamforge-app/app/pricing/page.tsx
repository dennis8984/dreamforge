'use client';

import { useState } from 'react';
import Header from '@/components/Header';

const TIERS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    dailyMessages: 20,
    monthlyMoments: 0,
    features: [
      'Basic chat (S1E mode)',
      '20 messages per day',
      'Browse character gallery',
      'Limited media previews',
    ],
    limitations: ['No media generation', 'No explicit content', 'No voice calls'],
    cta: 'Current Plan',
    disabled: true,
    highlight: false,
    gradient: '',
    border: 'border-gray-700',
  },
  {
    id: 'lite',
    name: 'Lite',
    price: 5.99,
    dailyMessages: 100,
    monthlyMoments: 500,
    features: [
      'Flirty chat (S2E mode)',
      '100 messages per day',
      '500 Moments per month',
      'Image generation',
      'Full gallery access',
    ],
    limitations: [],
    cta: 'Subscribe',
    disabled: false,
    highlight: false,
    gradient: '',
    border: 'border-gray-700',
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 14.99,
    dailyMessages: -1,
    monthlyMoments: 2000,
    features: [
      'All content modes (S3E/S3C)',
      'Unlimited messages',
      '2,000 Moments per month',
      'Image & video generation',
      'Voice calls',
      'Custom character creation',
    ],
    limitations: [],
    cta: 'Subscribe',
    disabled: false,
    highlight: true,
    gradient: 'from-blue-900/50 to-gray-800',
    border: 'border-blue-500',
  },
  {
    id: 'ultimate',
    name: 'Ultimate',
    price: 29.99,
    dailyMessages: -1,
    monthlyMoments: 5000,
    features: [
      'Everything in Premium',
      '5,000 Moments per month',
      'Group chats',
      'Priority generation queue',
      'Early access to new features',
      'Custom voice cloning',
    ],
    limitations: [],
    cta: 'Subscribe',
    disabled: false,
    highlight: false,
    gradient: 'from-purple-900/50 to-gray-800',
    border: 'border-purple-700',
  },
];

const MOMENTS_PACKAGES = [
  { name: 'Starter', moments: 500, price: 4.99 },
  { name: 'Popular', moments: 1500, price: 9.99, popular: true },
  { name: 'Pro', moments: 5000, price: 24.99 },
  { name: 'Mega', moments: 15000, price: 49.99 },
];

export default function PricingPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubscribe = async (tier: string) => {
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        window.location.href = `/auth?redirect=/pricing&plan=${tier}`;
        return;
      }

      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ tier }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Failed to create checkout session');
      }
    } catch (error) {
      console.error('Subscription error:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBuyMoments = async (packageName: string) => {
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        window.location.href = '/auth?redirect=/pricing';
        return;
      }

      const response = await fetch('/api/moments/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ package_name: packageName }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Purchase error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-900">
      <Header isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated} userTier="free" />

      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-3">Choose Your Plan</h1>
          <p className="text-lg text-gray-400">Unlock AI companions, media generation, and more</p>
        </div>

        {/* Subscription Tiers */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto mb-20">
          {TIERS.map((tier) => (
            <div
              key={tier.id}
              className={`rounded-xl p-6 border-2 ${tier.border} ${
                tier.gradient ? `bg-gradient-to-b ${tier.gradient}` : 'bg-gray-800'
              } ${tier.highlight ? 'relative' : ''}`}
            >
              {tier.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold">Most Popular</span>
                </div>
              )}
              <div className="mb-6">
                <h3 className="text-xl font-bold text-white mb-1">{tier.name}</h3>
                <div className="text-3xl font-bold text-white">
                  ${tier.price}
                  {tier.price > 0 && <span className="text-sm font-normal text-gray-400">/mo</span>}
                </div>
                <div className="mt-2 text-sm text-gray-400">
                  {tier.dailyMessages === -1 ? 'Unlimited' : tier.dailyMessages} messages/day
                  {tier.monthlyMoments > 0 && ` | ${tier.monthlyMoments.toLocaleString()} Moments/mo`}
                </div>
              </div>

              <ul className="space-y-2 mb-6">
                {tier.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <svg className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-300">{f}</span>
                  </li>
                ))}
                {tier.limitations.map((l, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <svg className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="text-gray-500">{l}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => !tier.disabled && handleSubscribe(tier.id)}
                disabled={tier.disabled || isProcessing}
                className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-colors ${
                  tier.highlight
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : tier.disabled
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-700 text-white hover:bg-gray-600'
                } disabled:opacity-50`}
              >
                {isProcessing ? 'Processing...' : tier.cta}
              </button>
            </div>
          ))}
        </div>

        {/* Moments Packages */}
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Need More Moments?</h2>
            <p className="text-gray-400">Buy Moments packs for image generation, video, voice calls, and more</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {MOMENTS_PACKAGES.map((pkg) => (
              <div
                key={pkg.name}
                className={`rounded-lg p-5 text-center border ${
                  pkg.popular ? 'border-amber-500 bg-amber-900/10' : 'border-gray-700 bg-gray-800'
                }`}
              >
                {pkg.popular && (
                  <div className="text-amber-400 text-xs font-semibold mb-2">Best Value</div>
                )}
                <div className="text-2xl font-bold text-white">{pkg.moments.toLocaleString()}</div>
                <div className="text-sm text-gray-400 mb-3">Moments</div>
                <div className="text-lg font-semibold text-white mb-3">${pkg.price}</div>
                <button
                  onClick={() => handleBuyMoments(pkg.name)}
                  disabled={isProcessing}
                  className="w-full py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium disabled:opacity-50"
                >
                  Buy
                </button>
              </div>
            ))}
          </div>

          <div className="mt-6 text-center text-sm text-gray-500">
            Moments costs: Image generation = 50 | Video = 600 | Voice call = 100/min | Character creation = 500
          </div>
        </div>

        {/* Trust */}
        <div className="mt-16 text-center text-sm text-gray-500">
          <p>Secure payments via Stripe. Cancel anytime. All content is AI-generated. You must be 18+.</p>
        </div>
      </div>
    </main>
  );
}
