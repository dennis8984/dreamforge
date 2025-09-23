import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { checkRunpodJobStatus } from '@/lib/nano-banana';

export const runtime = 'edge';

// POST /api/characters/poll-and-save
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobId, characterId, prompt, visibility } = body;

    if (!jobId || !characterId) {
      return NextResponse.json({ error: 'jobId and characterId are required' }, { status: 400 });
    }

    const jobResult = await checkRunpodJobStatus(jobId);

    if (jobResult.status === 'completed' && jobResult.imageUrl) {
      if (!supabase) {
        return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
      }
      
      // Save media to the database
      const { error: mediaErr } = await supabase
        .from('character_media')
        .insert([{
          character_id: characterId,
          type: 'image',
          url: jobResult.imageUrl,
          is_hd: true,
          visibility: visibility || 'public',
          prompt: prompt || '',
        }]);

      if (mediaErr) {
        console.error('Failed to save media to Supabase:', mediaErr);
        return NextResponse.json({ error: 'Failed to save media to database' }, { status: 500 });
      }

      return NextResponse.json({ imageUrl: jobResult.imageUrl });
    } else if (jobResult.status === 'failed' || jobResult.error) {
      return NextResponse.json({ error: jobResult.error || 'Job failed' }, { status: 500 });
    } else {
      // Still processing
      return NextResponse.json({ message: `Job status: ${jobResult.status}` }, { status: 202 });
    }

  } catch (error) {
    console.error('Error in poll-and-save handler:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
