import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/', '/auth', '/characters', '/models', '/pricing', '/gallery', '/feed'];
const PUBLIC_API_ROUTES = ['/api/characters', '/api/models', '/api/feed'];
const ADMIN_ROUTES = ['/admin'];
const ADMIN_API_ROUTES = ['/api/admin'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  // Security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(self), geolocation=()');

  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return response;
  }

  // Check if route needs auth
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'));
  const isPublicApi = PUBLIC_API_ROUTES.some(route => pathname.startsWith(route));
  const isAdminRoute = ADMIN_ROUTES.some(route => pathname.startsWith(route));
  const isAdminApi = ADMIN_API_ROUTES.some(route => pathname.startsWith(route));
  const isStripeWebhook = pathname === '/api/stripe/webhook';

  // Stripe webhooks bypass auth (they use webhook signature verification)
  if (isStripeWebhook) return response;

  // Public routes - allow through
  if (isPublicRoute || isPublicApi) return response;

  // For auth-required and admin routes, we let the API route handlers
  // handle auth verification since middleware can't easily access the
  // full user profile. The middleware primarily handles security headers
  // and route classification.

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
