'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';

const PRICING_TIERS = {
  free: {
    name: 'Free',
    price: 0,
    features: [
      'View censored gallery previews',
      'Limited to 5 generations per day',
      'Basic models only',
      'Watermarked images'
    ],
    limitations: [
      'No NSFW content access',
      'No character profiles',
      'No high-resolution downloads'
    ]
  },
  pro: {
    name: 'Pro',
    price: {
      monthly: 19.99,
      yearly: 199.99
    },
    features: [
      'Full NSFW gallery access',
      'Unlimited generations',
      'All premium models',
      'Character profiles & galleries',
      'High-resolution downloads',
      'No watermarks',
      '5,000 credits per month'
    ],
    limitations: []
  },
  premium: {
    name: 'Premium',
    price: {
      monthly: 49.99,
      yearly: 499.99
    },
    features: [
      'Everything in Pro',
      'Priority generation queue',
      'Custom character training',
      'Private character creation',
      'API access',
      'Commercial usage rights',
      '10,000 credits per month',
      'Exclusive model access'
    ],
    limitations: []
  }
};

export default function PricingPage() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();

  const handleSubscribe = async (tier: 'pro' | 'premium') => {
    setIsProcessing(true);

    try {
      // Check if user is authenticated
      const token = localStorage.getItem('access_token');
      if (!token) {
        // Redirect to auth with return URL
        router.push(`/auth?redirect=/pricing&plan=${tier}`);
        return;
      }

      // Create subscription
      const response = await fetch('/api/membership', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          tier,
          duration: billingPeriod
        })
      });

      if (response.ok) {
        const data = await response.json();
        // Redirect to success page or gallery
        router.push('/gallery?upgraded=true');
      } else {
        alert('Failed to process subscription. Please try again.');
      }
    } catch (error) {
      console.error('Subscription error:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-900">
      <Header isAuthenticated={false} setIsAuthenticated={() => {}} userTier="free" />

      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            Unlock Premium NSFW Content
          </h1>
          <p className="text-xl text-gray-400">
            Get unlimited access to exclusive adult content and AI models
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-12">
          <div className="bg-gray-800 rounded-lg p-1 inline-flex">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${
                billingPeriod === 'monthly'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${
                billingPeriod === 'yearly'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Yearly (Save 20%)
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {/* Free Tier */}
          <div className="bg-gray-800 rounded-xl p-8 border border-gray-700">
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-white mb-2">
                {PRICING_TIERS.free.name}
              </h3>
              <div className="text-4xl font-bold text-white">
                $0
                <span className="text-lg font-normal text-gray-400">/month</span>
              </div>
            </div>

            <ul className="space-y-3 mb-8">
              {PRICING_TIERS.free.features.map((feature, index) => (
                <li key={index} className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mt-1 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-300">{feature}</span>
                </li>
              ))}
              {PRICING_TIERS.free.limitations.map((limitation, index) => (
                <li key={index} className="flex items-start">
                  <svg className="w-5 h-5 text-red-500 mt-1 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="text-gray-500">{limitation}</span>
                </li>
              ))}
            </ul>

            <button
              disabled
              className="w-full py-3 px-6 rounded-lg bg-gray-700 text-gray-400 font-semibold cursor-not-allowed"
            >
              Current Plan
            </button>
          </div>

          {/* Pro Tier */}
          <div className="bg-gradient-to-b from-blue-900/50 to-gray-800 rounded-xl p-8 border-2 border-blue-600 relative">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                Most Popular
              </span>
            </div>

            <div className="mb-8">
              <h3 className="text-2xl font-bold text-white mb-2">
                {PRICING_TIERS.pro.name}
              </h3>
              <div className="text-4xl font-bold text-white">
                ${billingPeriod === 'monthly' ? PRICING_TIERS.pro.price.monthly : (PRICING_TIERS.pro.price.yearly / 12).toFixed(2)}
                <span className="text-lg font-normal text-gray-400">/month</span>
              </div>
              {billingPeriod === 'yearly' && (
                <p className="text-green-400 text-sm mt-1">
                  Billed ${PRICING_TIERS.pro.price.yearly} yearly
                </p>
              )}
            </div>

            <ul className="space-y-3 mb-8">
              {PRICING_TIERS.pro.features.map((feature, index) => (
                <li key={index} className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mt-1 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-300">{feature}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleSubscribe('pro')}
              disabled={isProcessing}
              className="w-full py-3 px-6 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50"
            >
              {isProcessing ? 'Processing...' : 'Subscribe to Pro'}
            </button>
          </div>

          {/* Premium Tier */}
          <div className="bg-gradient-to-b from-purple-900/50 to-gray-800 rounded-xl p-8 border border-purple-700">
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-white mb-2">
                {PRICING_TIERS.premium.name}
              </h3>
              <div className="text-4xl font-bold text-white">
                ${billingPeriod === 'monthly' ? PRICING_TIERS.premium.price.monthly : (PRICING_TIERS.premium.price.yearly / 12).toFixed(2)}
                <span className="text-lg font-normal text-gray-400">/month</span>
              </div>
              {billingPeriod === 'yearly' && (
                <p className="text-green-400 text-sm mt-1">
                  Billed ${PRICING_TIERS.premium.price.yearly} yearly
                </p>
              )}
            </div>

            <ul className="space-y-3 mb-8">
              {PRICING_TIERS.premium.features.map((feature, index) => (
                <li key={index} className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mt-1 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-300">{feature}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleSubscribe('premium')}
              disabled={isProcessing}
              className="w-full py-3 px-6 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50"
            >
              {isProcessing ? 'Processing...' : 'Subscribe to Premium'}
            </button>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="mt-16 text-center">
          <div className="flex justify-center items-center space-x-8 mb-8">
            <div className="text-gray-400">
              <svg className="w-8 h-8 mb-2 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L3.09 5.26C2.39 5.48 2 6.11 2 6.86v5.28c0 5.5 3.84 10.69 9 12 5.16-1.31 9-6.5 9-12V6.86c0-.75-.39-1.38-1.09-1.6L12 2z"/>
              </svg>
              <p className="text-sm">Secure Payments</p>
            </div>
            <div className="text-gray-400">
              <svg className="w-8 h-8 mb-2 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm0-2a8 8 0 100-16 8 8 0 000 16zm-1-5h2v2h-2v-2zm0-8h2v6h-2V7z"/>
              </svg>
              <p className="text-sm">Cancel Anytime</p>
            </div>
            <div className="text-gray-400">
              <svg className="w-8 h-8 mb-2 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
              </svg>
              <p className="text-sm">24/7 Support</p>
            </div>
          </div>

          <p className="text-gray-500 text-sm">
            All content is AI-generated. You must be 18+ to subscribe.
          </p>
        </div>
      </div>
    </main>
  );
}