import { ContentMode, UserMemory, ChatMessage, CharacterPersona } from '@/types/chat';
import { getContentMode } from './content-modes';

const MAX_CONTEXT_TOKENS = parseInt(process.env.CHAT_MAX_CONTEXT_TOKENS || '30000');
const APPROX_CHARS_PER_TOKEN = 4;

interface PromptBuilderParams {
  persona: CharacterPersona;
  contentMode: ContentMode;
  memories: UserMemory[];
  isGroup?: boolean;
  groupCharacterNames?: string[];
}

export function buildSystemPrompt(params: PromptBuilderParams): string {
  const { persona, contentMode, memories, isGroup, groupCharacterNames } = params;
  const mode = getContentMode(contentMode);

  const parts: string[] = [];

  // Base persona
  parts.push(`You are ${persona.personality_description || 'a friendly AI companion'}.`);

  if (persona.system_prompt) {
    parts.push(persona.system_prompt);
  }

  if (persona.speaking_style) {
    parts.push(`Speaking style: ${persona.speaking_style}`);
  }

  // Content mode overlay
  parts.push(`\n[Content Mode: ${mode.label}]\n${mode.systemPromptOverlay}`);

  // Content mode specific prompts from persona
  if (persona.content_mode_prompts?.[contentMode]) {
    parts.push(persona.content_mode_prompts[contentMode]);
  }

  // Memories
  if (memories.length > 0) {
    const activeMemories = memories.filter(m => m.is_active);
    if (activeMemories.length > 0) {
      parts.push('\n[User Memories - things you remember about this user:]');
      for (const mem of activeMemories) {
        parts.push(`- ${mem.key}: ${mem.value}`);
      }
    }
  }

  // Group chat instructions
  if (isGroup && groupCharacterNames?.length) {
    parts.push(`\n[Group Chat] Other characters in this chat: ${groupCharacterNames.join(', ')}. Stay in character, respond naturally to both the user and other characters. Do not speak for other characters.`);
  }

  // Emotional range
  if (persona.emotional_range?.length > 0) {
    parts.push(`\nEmotional range: ${persona.emotional_range.join(', ')}`);
  }

  // Forbidden topics
  if (persona.forbidden_topics?.length > 0) {
    parts.push(`\nNever discuss or engage with: ${persona.forbidden_topics.join(', ')}`);
  }

  return parts.join('\n');
}

export function buildMessageHistory(
  messages: ChatMessage[],
  maxChars: number = MAX_CONTEXT_TOKENS * APPROX_CHARS_PER_TOKEN
): Array<{ role: 'user' | 'assistant'; content: string }> {
  const formatted: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  let totalChars = 0;

  // Process from most recent to oldest, then reverse
  const reversed = [...messages].reverse();
  const selected: ChatMessage[] = [];

  for (const msg of reversed) {
    if (msg.is_hidden || msg.role === 'system') continue;
    const msgChars = msg.content.length;
    if (totalChars + msgChars > maxChars) break;
    totalChars += msgChars;
    selected.unshift(msg);
  }

  for (const msg of selected) {
    const role = msg.role === 'user' ? 'user' : 'assistant';
    formatted.push({ role, content: msg.content });
  }

  return formatted;
}
