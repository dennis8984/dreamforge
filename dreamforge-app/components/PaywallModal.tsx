'use client';

import { useState } from 'react';

interface PaywallModalProps {
  model: any;
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

      const response = await fetch('http://localhost:8000/api/payment/checkout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tier })
      });

      const data = await response.json();
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      alert('Failed to create checkout session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-2xl w-full mx-4">
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>

          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Premium Model Access Required
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            "{model.name}" is a premium model. Upgrade your plan to access this and other exclusive models.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="border-2 border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Basic Plan</h3>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                $9.99<span className="text-base font-normal text-gray-600 dark:text-gray-400">/month</span>
              </p>
            </div>
            <ul className="space-y-3 mb-6">
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-600 dark:text-gray-400">100 generations per month</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-600 dark:text-gray-400">Access to basic premium models</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-600 dark:text-gray-400">HD downloads</span>
              </li>
            </ul>
            <button
              onClick={() => handleUpgrade('basic')}
              disabled={loading}
              className="w-full py-3 bg-gray-800 dark:bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-900 dark:hover:bg-gray-600 disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Choose Basic'}
            </button>
          </div>

          <div className="border-2 border-blue-600 rounded-lg p-6 relative">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <span className="px-3 py-1 bg-blue-600 text-white text-sm font-bold rounded">RECOMMENDED</span>
            </div>
            <div className="mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Premium Plan</h3>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                $29.99<span className="text-base font-normal text-gray-600 dark:text-gray-400">/month</span>
              </p>
            </div>
            <ul className="space-y-3 mb-6">
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-600 dark:text-gray-400">500 generations per month</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-600 dark:text-gray-400">Access to ALL premium models</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-600 dark:text-gray-400">Priority queue processing</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-600 dark:text-gray-400">API access</span>
              </li>
            </ul>
            <button
              onClick={() => handleUpgrade('premium')}
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Choose Premium'}
            </button>
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={onClose}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}