import { NextRequest, NextResponse } from 'next/server';
import { checkOpenClawHealth, getConfigStatus } from '@/lib/openclaw';

function isAdminAuthenticated(request: NextRequest): boolean {
  const adminKey = request.headers.get('x-admin-key');
  const referrer = request.headers.get('referer');
  const isFromAdmin = referrer?.includes('admin=true');
  return adminKey === 'dreamforge_admin_2024' ||
         request.nextUrl.searchParams.get('admin') === 'true' ||
         isFromAdmin === true;
}

export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [health, config] = await Promise.all([
      checkOpenClawHealth(),
      Promise.resolve(getConfigStatus()),
    ]);

    return NextResponse.json({ health, config });
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      { error: 'Health check failed' },
      { status: 500 }
    );
  }
}
