import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from './supabase-server';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  tier: string;
}

export async function getServerSession(request: NextRequest): Promise<AuthUser | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.substring(7);
  try {
    const supabase = getSupabaseAdmin();
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;

    // Get user profile with role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, subscription_tier')
      .eq('id', user.id)
      .single();

    return {
      id: user.id,
      email: user.email || '',
      role: profile?.role || 'user',
      tier: profile?.subscription_tier || 'free',
    };
  } catch {
    return null;
  }
}

export async function requireAuth(request: NextRequest): Promise<AuthUser | NextResponse> {
  const user = await getServerSession(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  return user;
}

export async function requireAdmin(request: NextRequest): Promise<AuthUser | NextResponse> {
  const user = await getServerSession(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  if (user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }
  return user;
}

export async function getUserTier(userId: string): Promise<string> {
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', userId)
      .single();
    return data?.subscription_tier || 'free';
  } catch {
    return 'free';
  }
}

export function isAuthUser(result: AuthUser | NextResponse): result is AuthUser {
  return !(result instanceof NextResponse);
}
