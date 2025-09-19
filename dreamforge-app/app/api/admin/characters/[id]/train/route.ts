import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { queueRunpodTrainingJob, checkRunpodTrainingStatus } from '@/lib/nano-banana';

function isAdminAuthenticated(request: NextRequest): boolean {
  const adminKey = request.headers.get('x-admin-key');
  const referrer = request.headers.get('referer');
  const isFromAdmin = referrer?.includes('admin=true');
  return (
    adminKey === 'dreamforge_admin_2024' ||
    request.nextUrl.searchParams.get('admin') === 'true' ||
    isFromAdmin === true
  );
}

// POST /api/admin/characters/[id]/train -> queue training
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Simple in-memory training job tracker for development
const trainingJobs = new Map<string, {
  characterId: string;
  status: 'queued' | 'training' | 'completed' | 'failed';
  progress: number;
  startedAt: Date;
  completedAt?: Date;
  modelRef?: any;
}>();

// Admin authentication check
function isAdminAuthenticated(request: NextRequest): boolean {
  const adminKey = request.headers.get('x-admin-key');
  const referrer = request.headers.get('referer');
  const isFromAdmin = referrer?.includes('admin=true');

  return adminKey === 'dreamforge_admin_2024' ||
         request.nextUrl.searchParams.get('admin') === 'true' ||
         isFromAdmin === true;
}

// Simulate training progress (for demo)
async function simulateTraining(jobId: string, characterId: string) {
  const job = trainingJobs.get(jobId);
  if (!job) return;

  // Update to training status
  setTimeout(async () => {
    job.status = 'training';
    job.progress = 25;

    await supabase
      .from('characters')
      .update({ training_status: 'training' })
      .eq('id', characterId);
  }, 2000);

  // Progress updates
  setTimeout(() => {
    if (job) job.progress = 50;
  }, 5000);

  setTimeout(() => {
    if (job) job.progress = 75;
  }, 8000);

  // Complete training
  setTimeout(async () => {
    job.status = 'completed';
    job.progress = 100;
    job.completedAt = new Date();
    job.modelRef = {
      lora_path: `/models/lora/${characterId}.safetensors`,
      checkpoint: 'stable-diffusion-xl',
      seed: Math.floor(Math.random() * 1000000),
      style_prompt: 'in the style of character',
      trained_at: new Date().toISOString()
    };

    // Update character with trained model
    await supabase
      .from('characters')
      .update({
        training_status: 'ready',
        model_ref: job.modelRef
      })
      .eq('id', characterId);
  }, 12000);
}

// POST /api/admin/characters/[id]/train - Start training
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const characterId = params.id;

    // Check character exists
    const { data: character, error } = await supabase
      .from('characters')
      .select('*')
      .eq('id', characterId)
      .single();

    if (error || !character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    // Check if already training
    if (character.training_status === 'training' || character.training_status === 'queued') {
      return NextResponse.json(
        { error: 'Training already in progress' },
        { status: 400 }
      );
    }

    // Generate job ID
    const jobId = `job_${characterId}_${Date.now()}`;

    // Create training job
    trainingJobs.set(jobId, {
      characterId,
      status: 'queued',
      progress: 0,
      startedAt: new Date()
    });

    // Update character status
    await supabase
      .from('characters')
      .update({
        training_status: 'queued',
        training_job_id: jobId
      })
      .eq('id', characterId);

    // Start simulated training
    simulateTraining(jobId, characterId);

    return NextResponse.json({
      status: 'queued',
      jobId,
      message: 'Training job queued successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/admin/characters/[id]/train:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/admin/characters/[id]/train - Check training status
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const characterId = params.id;

    // Get character and job ID
    const { data: character, error } = await supabase
      .from('characters')
      .select('training_status, training_job_id, model_ref')
      .eq('id', characterId)
      .single();

    if (error || !character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    // If job ID exists, check in-memory status
    if (character.training_job_id) {
      const job = trainingJobs.get(character.training_job_id);

      if (job) {
        return NextResponse.json({
          status: job.status,
          progress: job.progress,
          jobId: character.training_job_id,
          startedAt: job.startedAt,
          completedAt: job.completedAt,
          modelRef: job.modelRef
        });
      }
    }

    // Return database status
    return NextResponse.json({
      status: character.training_status,
      modelRef: character.model_ref,
      progress: character.training_status === 'ready' ? 100 : 0
    });
  } catch (error) {
    console.error('Error in GET /api/admin/characters/[id]/train:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}