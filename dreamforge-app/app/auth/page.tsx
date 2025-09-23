'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function AuthRedirector() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const plan = searchParams.get('plan');
    const redirect = searchParams.get('redirect');

    // Construct the redirect URL with the plan, so the pricing page knows what to highlight
    let redirectUrl = redirect || '/';
    if (plan) {
      redirectUrl += `?plan=${plan}`;
    }
    
    // Store the intended redirect path and trigger the auth modal on the homepage
    localStorage.setItem('postAuthRedirect', redirectUrl);
    
    // Redirect to the homepage, which will then read from localStorage and open the modal.
    // This assumes the homepage layout has logic to check for 'postAuthRedirect'
    // and open the AuthModal. We will add this logic next if it doesn't exist.
    router.replace('/?auth=login');

  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
      <p>Please wait, redirecting to login...</p>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-900 flex items-center justify-center text-white"><p>Loading...</p></div>}>
      <AuthRedirector />
    </Suspense>
  );
}
