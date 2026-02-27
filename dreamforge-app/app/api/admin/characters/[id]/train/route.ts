import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { queueRunpodTrainingJob, checkRunpodTrainingStatus } from '@/lib/nano-banana';
import { requireAdmin, isAuthUser } from '@/lib/auth-helpers';

// POST /api/admin/characters/[id]/train -> queue training
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireAdmin(request);
  if (!isAuthUser(auth)) return auth;

  try {
    // Gather character dataset (media URLs) to pass to training
    let images: string[] = [];
    if (supabase) {
      const { data: media } = await supabase
        .from('character_media')
        .select('url')
        .eq('character_id', id)
        .eq('type', 'image')
        .limit(50);
      images = (media || []).map((m: { url: string }) => m.url).filter(Boolean);
    }

    const queue = await queueRunpodTrainingJob(images, { instanceName: `char_${id.substring(0, 6)}` });
    if (!queue.success || !queue.jobId) {
      return NextResponse.json({ error: queue.error || 'Failed to queue training' }, { status: 500 });
    }

    if (supabase) {
      await supabase.from('characters').update({ training_status: 'queued', training_job_id: queue.jobId }).eq('id', id);
    }

    return NextResponse.json({ status: 'queued', jobId: queue.jobId });
  } catch (error) {
    console.error('Error queuing training:', error);
    return NextResponse.json({ error: 'Failed to queue training' }, { status: 500 });
  }
}

// GET /api/admin/characters/[id]/train -> check status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireAdmin(request);
  if (!isAuthUser(auth)) return auth;

  try {
    const jobId = request.nextUrl.searchParams.get('jobId');
    if (!jobId) {
      return NextResponse.json({ error: 'jobId required' }, { status: 400 });
    }

    const status = await checkRunpodTrainingStatus(jobId);
    if (status.status === 'completed' && supabase) {
      await supabase
        .from('characters')
        .update({ training_status: 'ready', model_ref: status.modelRef })
        .eq('id', id);
    } else if (status.status === 'in_progress' && supabase) {
      await supabase.from('characters').update({ training_status: 'training' }).eq('id', id);
    } else if (status.status === 'failed' && supabase) {
      await supabase.from('characters').update({ training_status: 'failed' }).eq('id', id);
    }

    return NextResponse.json({ status: status.status, jobId });
  } catch (error) {
    console.error('Error checking training:', error);
    return NextResponse.json({ error: 'Failed to check status' }, { status: 500 });
  }
}