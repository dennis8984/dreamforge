import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthUser } from '@/lib/auth-helpers';
import { getSupabaseAdmin } from '@/lib/supabase-server';

// GET /api/chat/personas/[characterId] - Get character persona
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ characterId: string }> }
) {
  const { characterId } = await context.params;
  const auth = await requireAuth(request);
  if (!isAuthUser(auth)) return auth;

  try {
    const supabase = getSupabaseAdmin();

    // Verify the character exists
    const { data: character, error: charError } = await supabase
      .from('characters')
      .select('id, name, avatar_url, description')
      .eq('id', characterId)
      .single();

    if (charError || !character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    // Fetch the persona
    const { data: persona, error: personaError } = await supabase
      .from('character_personas')
      .select('*')
      .eq('character_id', characterId)
      .single();

    if (personaError || !persona) {
      // Return a default persona if none configured
      return NextResponse.json({
        character,
        persona: {
          id: null,
          character_id: characterId,
          system_prompt: '',
          personality_description: character.description || `A character named ${character.name}`,
          speaking_style: '',
          emotional_range: [],
          content_mode_prompts: {},
          example_messages: [],
          greeting_message: `Hello! I'm ${character.name}. How can I help you today?`,
          topics_of_interest: [],
          forbidden_topics: [],
          voice_description: '',
          is_default: true,
        },
      });
    }

    return NextResponse.json({
      character,
      persona,
    });
  } catch (error) {
    console.error('Error in GET /api/chat/personas/[characterId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
