import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthUser } from '@/lib/auth-helpers';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { buildAvatarPrompt } from '@/lib/character-prompt-builder';

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (!isAuthUser(authResult)) return authResult;
    const user = authResult;

    const body = await request.json();
    const {
      name,
      description,
      greeting_message,
      gender,
      style,
      appearance,
      personality_traits,
      voice_id,
      voice_name,
    } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Character name is required' }, { status: 400 });
    }

    if (!gender || !['male', 'female', 'non-binary'].includes(gender)) {
      return NextResponse.json({ error: 'Valid gender is required' }, { status: 400 });
    }

    if (!style || !['realistic', 'anime', 'fantasy', 'sci_fi'].includes(style)) {
      return NextResponse.json({ error: 'Valid style is required' }, { status: 400 });
    }

    if (!Array.isArray(personality_traits) || personality_traits.length < 3 || personality_traits.length > 5) {
      return NextResponse.json({ error: 'Select 3-5 personality traits' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Check user's characters_created_count to determine if free or paid
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('characters_created_count, moments_balance')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Could not fetch user profile' }, { status: 500 });
    }

    const isFirstCharacter = (profile.characters_created_count || 0) === 0;
    const cost = isFirstCharacter ? 0 : 500;

    // Debit moments if not first character
    if (cost > 0) {
      const { data: debitResult, error: debitError } = await supabase.rpc('debit_moments', {
        p_user_id: user.id,
        p_amount: cost,
        p_type: 'character_creation',
        p_ref: null,
        p_desc: `Created character: ${name.trim()}`,
      });

      if (debitError) {
        console.error('Debit moments error:', debitError);
        return NextResponse.json({ error: 'Failed to process payment' }, { status: 500 });
      }

      const result = debitResult?.[0];
      if (!result?.success) {
        return NextResponse.json(
          {
            error: 'Insufficient Moments balance. You need 500 Moments to create a character.',
            required: cost,
            balance: result?.new_balance ?? profile.moments_balance,
          },
          { status: 402 }
        );
      }
    }

    // Generate slug from name
    const baseSlug = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const slug = `${baseSlug}-${Date.now().toString(36)}`;

    // Build avatar prompt from appearance params
    const avatarPrompt = buildAvatarPrompt({
      name: name.trim(),
      gender,
      style,
      appearance: appearance || {},
      personalityTraits: personality_traits,
    });

    // Build a system prompt from traits
    const traitList = personality_traits.join(', ');
    const systemPrompt = `You are ${name.trim()}, a ${gender} character with a ${style} aesthetic. Your personality traits are: ${traitList}. Stay in character at all times. Be engaging, authentic, and expressive. ${description ? `Background: ${description.trim()}` : ''}`;

    // Create character record
    const { data: character, error: insertError } = await supabase
      .from('characters')
      .insert({
        slug,
        name: name.trim(),
        description: (description || '').trim() || null,
        gender,
        style,
        appearance: appearance || {},
        personality_traits,
        voice_id: voice_id || null,
        voice_name: voice_name || null,
        is_custom: true,
        creator_user_id: user.id,
        category: 'friend',
        tags: personality_traits.map((t: string) => t.toLowerCase()),
        training_status: 'ready',
        model_ref: {
          avatar_prompt: avatarPrompt,
          greeting_message: (greeting_message || '').trim(),
          system_prompt: systemPrompt,
        },
      })
      .select()
      .single();

    if (insertError) {
      console.error('Character insert error:', insertError);
      // If insert failed and we already debited, we should handle this.
      // For now, log the error and return a message.
      return NextResponse.json(
        { error: 'Failed to create character. If you were charged, please contact support.' },
        { status: 500 }
      );
    }

    // Increment characters_created_count
    await supabase
      .from('profiles')
      .update({
        characters_created_count: (profile.characters_created_count || 0) + 1,
      })
      .eq('id', user.id);

    return NextResponse.json({
      character,
      avatar_prompt: avatarPrompt,
      cost,
      is_first_character: isFirstCharacter,
    });
  } catch (error) {
    console.error('Character creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
