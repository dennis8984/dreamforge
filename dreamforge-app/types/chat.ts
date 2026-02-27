export type ContentMode = 'S1E' | 'S2E' | 'S3E' | 'S3C';
export type ConversationStatus = 'active' | 'archived' | 'deleted';
export type MessageRole = 'user' | 'assistant' | 'system' | 'narrator';
export type MemoryCategory = 'fact' | 'preference' | 'relationship' | 'emotional' | 'context' | 'boundary';

export interface ChatConversation {
  id: string;
  user_id: string;
  character_id: string;
  title: string;
  content_mode: ContentMode;
  is_group: boolean;
  branched_from_message_id?: string;
  branched_from_conversation_id?: string;
  status: ConversationStatus;
  last_message_at: string;
  message_count: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  character?: { name: string; avatar_url?: string };
}

export interface ChatParticipant {
  id: string;
  conversation_id: string;
  character_id: string;
  join_order: number;
  is_active: boolean;
  created_at: string;
  character?: { name: string; avatar_url?: string };
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: MessageRole;
  character_id?: string;
  content: string;
  content_mode: ContentMode;
  parent_message_id?: string;
  sequence_number: number;
  token_count: number;
  metadata: Record<string, unknown>;
  is_hidden: boolean;
  created_at: string;
}

export interface UserMemory {
  id: string;
  user_id: string;
  character_id: string;
  category: MemoryCategory;
  key: string;
  value: string;
  confidence: number;
  source_message_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CharacterPersona {
  id: string;
  character_id: string;
  system_prompt: string;
  personality_description: string;
  speaking_style: string;
  emotional_range: string[];
  content_mode_prompts: Record<ContentMode, string>;
  example_messages: Array<{ role: string; content: string }>;
  greeting_message: string;
  topics_of_interest: string[];
  forbidden_topics: string[];
  voice_description: string;
}

export interface RateLimitStatus {
  used: number;
  limit: number;
  remaining: number;
  resetsAt: string;
}

export interface SendMessageRequest {
  content: string;
  content_mode?: ContentMode;
  parent_message_id?: string;
}

export interface SendMessageResponse {
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
  rateLimit: RateLimitStatus;
}

export interface BranchRequest {
  from_message_id: string;
  title?: string;
}
