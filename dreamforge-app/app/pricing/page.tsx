'use client';

import { useState } from 'react';
import SecretsLayout from '@/components/SecretsLayout';

const TERMS = [
  { id: 'year', label: '12 Months', price: 3.99, compare: 13.99, badge: '70% OFF', highlight: 'Best value' },
  { id: 'quarter', label: '3 Months', price: 8.99, compare: 13.99, badge: '35% OFF', highlight: '' },
  { id: 'month', label: '1 Month', price: 13.99, compare: null, badge: '', highlight: '' },
];

const BENEFITS = [
  'Create your own characters',
  'Generate images',
  'Generate 5-second clips from a still',
  'Live action',
  'Unlimited text messages',
  'Moments refresh on the Premium plan',
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

  const handleSubscribe = async () => {
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        window.location.href = '/auth?redirect=/pricing&plan=premium';
        return;
      }

      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tier: 'premium' }),
      });

      const data = await response.json();
      if (data.url) window.location.href = data.url;
      else alert(data.error || 'Failed to create checkout session');
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
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ package_name: packageName }),
      });
      const data = await response.json();
      if (data.url) window.location.href = data.url;
    } catch (error) {
      console.error('Purchase error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SecretsLayout isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated} userTier="free">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-semibold text-center mb-8">Choose your plan</h1>
        <div className="grid md:grid-cols-3 gap-4 mb-10">
          {TERMS.map((term) => (
            <article key={term.id} className="rounded-2xl bg-[#141416] border border-white/10 p-5">
              <p className="text-sm text-gray-400">{term.label}</p>
              {term.badge && <p className="text-[#ff4d8d] text-sm font-medium mt-1">{term.badge}</p>}
              {term.highlight && <p className="text-xs uppercase tracking-wide text-amber-300 mt-1">{term.highlight}</p>}
              <p className="text-3xl font-semibold mt-3">
                ${term.price.toFixed(2)}
                <span className="text-sm font-normal text-gray-400">/month</span>
              </p>
              {term.compare && (
                <p className="text-sm text-gray-500 line-through">${term.compare.toFixed(2)}</p>
              )}
              <button
                type="button"
                onClick={handleSubscribe}
                disabled={isProcessing}
                className="mt-4 w-full py-2.5 rounded-full bg-[#ff4d8d] text-sm font-medium disabled:opacity-50"
              >
                {isProcessing ? 'Processing...' : 'Get Started'}
              </button>
            </article>
          ))}
        </div>

        <ul className="max-w-md mx-auto space-y-2 mb-6 text-sm text-gray-200">
          {BENEFITS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="text-center text-xs text-gray-500 mb-12">
          Get Started checks out the existing Premium subscription. Lite and Ultimate stay available for current subscribers. You must be 21+.
        </p>

        <h2 className="text-xl font-semibold text-center mb-4">Moments</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {MOMENTS_PACKAGES.map((pkg) => (
            <div key={pkg.name} className="rounded-xl bg-[#141416] border border-white/10 p-4 text-center">
              <div className="text-lg font-semibold">{pkg.moments.toLocaleString()}</div>
              <div className="text-sm text-gray-400 mb-2">${pkg.price}</div>
              <button
                type="button"
                onClick={() => handleBuyMoments(pkg.name)}
                disabled={isProcessing}
                className="w-full py-2 rounded-full bg-white text-black text-sm disabled:opacity-50"
              >
                Buy
              </button>
            </div>
          ))}
        </div>
      </div>
    </SecretsLayout>
  );
}
