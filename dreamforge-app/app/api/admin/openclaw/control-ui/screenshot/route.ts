import { NextRequest, NextResponse } from 'next/server';
import { captureControlUIScreenshot } from '@/lib/openclaw';
import { requireBetterAuthAdmin, isAdminUser } from '@/lib/admin-auth-helpers';

export async function GET(request: NextRequest) {
  const auth = await requireBetterAuthAdmin(request);
  if (!isAdminUser(auth)) return auth;

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
