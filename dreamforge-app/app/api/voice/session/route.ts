import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthUser } from '@/lib/auth-helpers';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { MOMENTS_COSTS } from '@/lib/moments-config';

// POST /api/voice/session - Start a new voice call session
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!isAuthUser(auth)) return auth;

  try {
    const body = await request.json();
    const { characterId } = body;

    if (!characterId) {
      return NextResponse.json(
        { error: 'characterId is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Validate character exists and get voice info
    const { data: character, error: charError } = await supabase
      .from('characters')
      .select('id, name, voice_id')
      .eq('id', characterId)
      .single();

    if (charError || !character) {
      return NextResponse.json(
        { error: 'Character not found' },
        { status: 404 }
      );
    }

    // Check that user has at least 1 minute worth of moments
    const { data: profile } = await supabase
      .from('profiles')
      .select('moments_balance')
      .eq('id', auth.id)
      .single();

    if (!profile || (profile.moments_balance || 0) < MOMENTS_COSTS.AUDIO_CALL_PER_MINUTE) {
      return NextResponse.json(
        { error: `Insufficient moments. Voice calls cost ${MOMENTS_COSTS.AUDIO_CALL_PER_MINUTE} moments per minute.` },
        { status: 402 }
      );
    }

    // Create the voice session
    const { data: session, error: sessionError } = await supabase
      .from('voice_call_sessions')
      .insert({
        user_id: auth.id,
        character_id: characterId,
        status: 'active',
        voice_id: character.voice_id || null,
        transcript: [],
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Error creating voice session:', sessionError);
      return NextResponse.json(
        { error: 'Failed to create voice session' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      sessionId: session.id,
      characterName: character.name,
      voiceId: character.voice_id,
      status: 'active',
    }, { status: 201 });
  } catch (error) {
    console.error('Voice session creation error:', error);
    return NextResponse.json(
      { error: 'Failed to start voice session' },
      { status: 500 }
    );
  }
}

// PATCH /api/voice/session - End a voice call session and charge moments
export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!isAuthUser(auth)) return auth;

  try {
    const body = await request.json();
    const { sessionId, transcript } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Fetch the session
    const { data: session, error: fetchError } = await supabase
      .from('voice_call_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', auth.id)
      .single();

    if (fetchError || !session) {
      return NextResponse.json(
        { error: 'Voice session not found' },
        { status: 404 }
      );
    }

    if (session.status !== 'active') {
      return NextResponse.json(
        { error: 'Session is already ended' },
        { status: 400 }
      );
    }

    // Calculate duration
    const startTime = new Date(session.created_at).getTime();
    const endTime = Date.now();
    const durationSeconds = Math.ceil((endTime - startTime) / 1000);
    const durationMinutes = Math.max(1, Math.ceil(durationSeconds / 60));
    const momentsToCharge = durationMinutes * MOMENTS_COSTS.AUDIO_CALL_PER_MINUTE;

    // Debit moments
    const { data: debitResult } = await supabase.rpc('debit_moments', {
      p_user_id: auth.id,
      p_amount: momentsToCharge,
      p_type: 'voice_call',
      p_desc: `Voice call (${durationMinutes} min)`,
    });

    const debitSuccess = !debitResult?.[0] || debitResult[0].success;

    // Update session
    const { error: updateError } = await supabase
      .from('voice_call_sessions')
      .update({
        status: 'ended',
        duration_seconds: durationSeconds,
        moments_charged: debitSuccess ? momentsToCharge : 0,
        transcript: transcript || session.transcript,
        ended_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    if (updateError) {
      console.error('Error ending voice session:', updateError);
      return NextResponse.json(
        { error: 'Failed to end session' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      sessionId,
      status: 'ended',
      durationSeconds,
      durationMinutes,
      momentsCharged: debitSuccess ? momentsToCharge : 0,
    });
  } catch (error) {
    console.error('Voice session end error:', error);
    return NextResponse.json(
      { error: 'Failed to end voice session' },
      { status: 500 }
    );
  }
}
