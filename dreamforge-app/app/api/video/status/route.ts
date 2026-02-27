import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthUser } from '@/lib/auth-helpers';
import { checkVideoJobStatus } from '@/lib/video-generation';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!isAuthUser(auth)) return auth;

  try {
    const jobId = request.nextUrl.searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        { error: 'jobId query parameter is required' },
        { status: 400 }
      );
    }

    const result = await checkVideoJobStatus(jobId);

    return NextResponse.json({
      jobId: result.jobId,
      status: result.status,
      videoUrl: result.videoUrl || null,
      error: result.error || null,
    });
  } catch (error) {
    console.error('Video status check error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check video status' },
      { status: 500 }
    );
  }
}
