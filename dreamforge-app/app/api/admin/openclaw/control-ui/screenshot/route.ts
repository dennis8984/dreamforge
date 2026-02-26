import { NextRequest, NextResponse } from 'next/server';
import { captureControlUIScreenshot } from '@/lib/openclaw';

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

  const width = parseInt(request.nextUrl.searchParams.get('width') || '1280', 10);
  const height = parseInt(request.nextUrl.searchParams.get('height') || '720', 10);
  const fullPage = request.nextUrl.searchParams.get('fullPage') === 'true';
  const url = request.nextUrl.searchParams.get('url') || undefined;

  try {
    const result = await captureControlUIScreenshot({
      url,
      viewport: { width, height },
      fullPage,
    });

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 502 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Screenshot error:', error);
    return NextResponse.json(
      { error: 'Failed to capture screenshot' },
      { status: 500 }
    );
  }
}
