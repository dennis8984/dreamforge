import { generateChatResponse } from './chat-ai';
import { getSupabaseAdmin } from './supabase-server';

interface ExtractedMemory {
  category: string;
  key: string;
  value: string;
  confidence: number;
}

export async function extractMemories(
  userId: string,
  characterId: string,
  userMessage: string,
  assistantMessage: string,
  sourceMessageId?: string
): Promise<void> {
  try {
    const result = await generateChatResponse({
      systemPrompt: `You are a memory extraction system. Analyze the conversation and extract important facts about the user. Return a JSON array of memories. Each memory should have: category (fact/preference/relationship/emotional/context/boundary), key (short label), value (the information), confidence (0-1). Only extract genuinely useful information. Return empty array [] if nothing worth remembering. Return ONLY valid JSON, no other text.`,
      messages: [
        { role: 'user', content: `User said: "${userMessage}"\nAssistant replied: "${assistantMessage}"\n\nExtract memories about the user:` },
      ],
      temperature: 0.1,
      maxTokens: 512,
    });

    let memories: ExtractedMemory[] = [];
    try {
      const cleaned = result.content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      memories = JSON.parse(cleaned);
      if (!Array.isArray(memories)) memories = [];
    } catch {
      return; // Failed to parse, skip
    }

    if (memories.length === 0) return;

    const supabase = getSupabaseAdmin();
    for (const mem of memories) {
      if (!mem.key || !mem.value) continue;
      await supabase
        .from('user_memories')
        .upsert({
          user_id: userId,
          character_id: characterId,
          category: mem.category || 'fact',
          key: mem.key,
          value: mem.value,
          confidence: mem.confidence || 0.8,
          source_message_id: sourceMessageId || null,
          is_active: true,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,character_id,key',
          ignoreDuplicates: false,
        })
        .select();
    }
  } catch (error) {
    console.error('Memory extraction failed (non-blocking):', error);
  }
}
