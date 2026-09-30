import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from './admin-auth';

const ADMIN_EMAIL = 'mnights@tutanota.com';

export interface AdminUser {
  id: string;
  email: string;
}

export async function requireBetterAuthAdmin(
  request: NextRequest
): Promise<AdminUser | NextResponse> {
  // Bypass auth in development for local testing
  if (process.env.NODE_ENV === 'development') {
    return { id: 'dev-admin', email: ADMIN_EMAIL };
  }

  try {
    const session = await adminAuth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (session.user.email !== ADMIN_EMAIL) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    return {
      id: session.user.id,
      email: session.user.email,
    };
  } catch {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }
}

export function isAdminUser(
  result: AdminUser | NextResponse
): result is AdminUser {
  return !(result instanceof NextResponse);
}
