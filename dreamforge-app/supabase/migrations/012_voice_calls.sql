CREATE TABLE IF NOT EXISTS voice_call_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  moments_charged INTEGER NOT NULL DEFAULT 0,
  transcript JSONB DEFAULT '[]',
  voice_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_voice_sessions_user ON voice_call_sessions(user_id, created_at DESC);

ALTER TABLE voice_call_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own voice sessions" ON voice_call_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own voice sessions" ON voice_call_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own voice sessions" ON voice_call_sessions FOR UPDATE USING (auth.uid() = user_id);
