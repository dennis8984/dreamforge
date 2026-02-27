'use client';

import { useState } from 'react';

interface Model {
  id: string;
  name: string;
  description?: string;
  category?: string;
  thumbnail_url?: string;
  is_premium?: boolean;
  is_featured?: boolean;
  view_count?: number;
  like_count?: number;
}

interface PaywallModalProps {
  model: Model;
  onClose: () => void;
}

export default function PaywallModal({ model, onClose }: PaywallModalProps) {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async (tier: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        alert('Please login to upgrade');
        return;
      }

      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tier })
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Failed to create checkout session');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      alert('Failed to create checkout session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl p-8 max-w-2xl w-full border border-gray-700">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Upgrade Required</h2>
          <p className="text-gray-400">
            &quot;{model.name}&quot; requires a premium plan. Upgrade to unlock all features.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className="border border-gray-600 rounded-lg p-5">
            <h3 className="text-lg font-bold text-white mb-1">Lite</h3>
            <p className="text-2xl font-bold text-white mb-3">$5.99<span className="text-sm font-normal text-gray-400">/mo</span></p>
            <ul className="space-y-2 mb-4 text-sm text-gray-300">
              <li className="flex items-center gap-2"><span className="text-green-400">&#10003;</span> 100 messages/day</li>
              <li className="flex items-center gap-2"><span className="text-green-400">&#10003;</span> 500 Moments/month</li>
              <li className="flex items-center gap-2"><span className="text-green-400">&#10003;</span> Basic media generation</li>
            </ul>
            <button onClick={() => handleUpgrade('lite')} disabled={loading} className="w-full py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50">
              {loading ? 'Processing...' : 'Choose Lite'}
            </button>
          </div>

          <div className="border-2 border-blue-500 rounded-lg p-5 relative">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-blue-600 text-white text-xs rounded-full font-semibold">Recommended</span>
            <h3 className="text-lg font-bold text-white mb-1">Premium</h3>
            <p className="text-2xl font-bold text-white mb-3">$14.99<span className="text-sm font-normal text-gray-400">/mo</span></p>
            <ul className="space-y-2 mb-4 text-sm text-gray-300">
              <li className="flex items-center gap-2"><span className="text-green-400">&#10003;</span> Unlimited messages</li>
              <li className="flex items-center gap-2"><span className="text-green-400">&#10003;</span> 2,000 Moments/month</li>
              <li className="flex items-center gap-2"><span className="text-green-400">&#10003;</span> All content modes</li>
              <li className="flex items-center gap-2"><span className="text-green-400">&#10003;</span> All media types</li>
            </ul>
            <button onClick={() => handleUpgrade('premium')} disabled={loading} className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Processing...' : 'Choose Premium'}
            </button>
          </div>
        </div>

        <div className="text-center">
          <button onClick={onClose} className="text-gray-400 hover:text-white text-sm">Maybe later</button>
        </div>
      </div>
    </div>
  );
}
