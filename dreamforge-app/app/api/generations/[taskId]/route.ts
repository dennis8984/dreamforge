import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthUser } from '@/lib/auth-helpers';
import { getTrackedTask, syncTask } from '@/lib/generation-tasks';

// GET /api/generations/[taskId]: status of the signed-in user's own generation.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const auth = await requireAuth(request);
  if (!isAuthUser(auth)) return auth;

  const { taskId } = await params;
  try {
    const owned = await getTrackedTask(taskId);
    if (!owned || owned.user_id !== auth.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const task = await syncTask(taskId);
    return NextResponse.json({
      kind: task?.kind,
      state: task?.state === 'succeeded' || task?.state === 'failed' ? task.state : 'processing',
      url: task?.media_url ?? null,
      refunded: task?.state === 'failed' && (task?.charged_moments ?? 0) > 0,
    });
  } catch (error) {
    console.error('Generation status error:', error);
    return NextResponse.json({ error: 'Could not check this generation' }, { status: 500 });
  }
}
