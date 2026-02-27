-- Chat system tables

-- Character personas
CREATE TABLE IF NOT EXISTS character_personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  system_prompt TEXT NOT NULL DEFAULT '',
  personality_description TEXT NOT NULL DEFAULT '',
  speaking_style TEXT NOT NULL DEFAULT '',
  emotional_range TEXT[] DEFAULT '{}',
  content_mode_prompts JSONB DEFAULT '{}',
  example_messages JSONB DEFAULT '[]',
  greeting_message TEXT NOT NULL DEFAULT 'Hello! How are you today?',
  topics_of_interest TEXT[] DEFAULT '{}',
  forbidden_topics TEXT[] DEFAULT '{}',
  voice_description TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(character_id)
);

-- Chat conversations
CREATE TABLE IF NOT EXISTS chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New Conversation',
  content_mode TEXT NOT NULL DEFAULT 'S1E',
  is_group BOOLEAN NOT NULL DEFAULT false,
  branched_from_message_id UUID,
  branched_from_conversation_id UUID,
  status TEXT NOT NULL DEFAULT 'active',
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  message_count INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user',
  character_id UUID REFERENCES characters(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  content_mode TEXT NOT NULL DEFAULT 'S1E',
  parent_message_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
  sequence_number INTEGER NOT NULL DEFAULT 0,
  token_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Chat participants (for group chats)
CREATE TABLE IF NOT EXISTS chat_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  join_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, character_id)
);

-- User memories
CREATE TABLE IF NOT EXISTS user_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'fact',
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  confidence FLOAT NOT NULL DEFAULT 0.8,
  source_message_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Chat rate limits
CREATE TABLE IF NOT EXISTS chat_rate_limits (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_date DATE NOT NULL DEFAULT CURRENT_DATE,
  message_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, period_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conversations_user ON chat_conversations(user_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_character ON chat_conversations(character_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON chat_messages(conversation_id, sequence_number);
CREATE INDEX IF NOT EXISTS idx_messages_parent ON chat_messages(parent_message_id);
CREATE INDEX IF NOT EXISTS idx_memories_user_character ON user_memories(user_id, character_id);
CREATE INDEX IF NOT EXISTS idx_participants_conversation ON chat_participants(conversation_id);

-- RLS
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_personas ENABLE ROW LEVEL SECURITY;

-- Conversations: users see only their own
DROP POLICY IF EXISTS "Users view own conversations" ON chat_conversations;
CREATE POLICY "Users view own conversations" ON chat_conversations FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users create own conversations" ON chat_conversations;
CREATE POLICY "Users create own conversations" ON chat_conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users update own conversations" ON chat_conversations;
CREATE POLICY "Users update own conversations" ON chat_conversations FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users delete own conversations" ON chat_conversations;
CREATE POLICY "Users delete own conversations" ON chat_conversations FOR DELETE USING (auth.uid() = user_id);

-- Messages: users see messages in their conversations
DROP POLICY IF EXISTS "Users view own messages" ON chat_messages;
CREATE POLICY "Users view own messages" ON chat_messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM chat_conversations WHERE id = conversation_id AND user_id = auth.uid()));
DROP POLICY IF EXISTS "Users create messages in own conversations" ON chat_messages;
CREATE POLICY "Users create messages in own conversations" ON chat_messages FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM chat_conversations WHERE id = conversation_id AND user_id = auth.uid()));

-- Participants: users see participants in their conversations
DROP POLICY IF EXISTS "Users view participants" ON chat_participants;
CREATE POLICY "Users view participants" ON chat_participants FOR SELECT
  USING (EXISTS (SELECT 1 FROM chat_conversations WHERE id = conversation_id AND user_id = auth.uid()));
DROP POLICY IF EXISTS "Users manage participants" ON chat_participants;
CREATE POLICY "Users manage participants" ON chat_participants FOR ALL
  USING (EXISTS (SELECT 1 FROM chat_conversations WHERE id = conversation_id AND user_id = auth.uid()));

-- Memories: users see only their own
DROP POLICY IF EXISTS "Users view own memories" ON user_memories;
CREATE POLICY "Users view own memories" ON user_memories FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users manage own memories" ON user_memories;
CREATE POLICY "Users manage own memories" ON user_memories FOR ALL USING (auth.uid() = user_id);

-- Rate limits: users see their own
DROP POLICY IF EXISTS "Users view own rate limits" ON chat_rate_limits;
CREATE POLICY "Users view own rate limits" ON chat_rate_limits FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "System manages rate limits" ON chat_rate_limits;
CREATE POLICY "System manages rate limits" ON chat_rate_limits FOR ALL USING (true);

-- Personas: publicly readable
DROP POLICY IF EXISTS "Anyone can read personas" ON character_personas;
CREATE POLICY "Anyone can read personas" ON character_personas FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin manages personas" ON character_personas;
CREATE POLICY "Admin manages personas" ON character_personas FOR ALL USING (public.is_admin());

-- Admin full access policies
DROP POLICY IF EXISTS "Admin full access conversations" ON chat_conversations;
CREATE POLICY "Admin full access conversations" ON chat_conversations FOR ALL USING (public.is_admin());
DROP POLICY IF EXISTS "Admin full access messages" ON chat_messages;
CREATE POLICY "Admin full access messages" ON chat_messages FOR ALL USING (public.is_admin());
DROP POLICY IF EXISTS "Admin full access memories" ON user_memories;
CREATE POLICY "Admin full access memories" ON user_memories FOR ALL USING (public.is_admin());

-- Trigger: auto-update conversation on new message
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_conversations
  SET message_count = message_count + 1,
      last_message_at = NEW.created_at,
      updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_conversation_on_message ON chat_messages;
CREATE TRIGGER trigger_update_conversation_on_message
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_on_message();

-- Atomic rate limit increment
CREATE OR REPLACE FUNCTION increment_chat_rate_limit(p_user_id UUID)
RETURNS TABLE(current_count INTEGER) AS $$
BEGIN
  INSERT INTO chat_rate_limits (user_id, period_date, message_count)
  VALUES (p_user_id, CURRENT_DATE, 1)
  ON CONFLICT (user_id, period_date)
  DO UPDATE SET message_count = chat_rate_limits.message_count + 1;

  RETURN QUERY
  SELECT chat_rate_limits.message_count
  FROM chat_rate_limits
  WHERE chat_rate_limits.user_id = p_user_id AND chat_rate_limits.period_date = CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;
