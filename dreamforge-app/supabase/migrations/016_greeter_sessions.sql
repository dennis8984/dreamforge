-- One live greeter session at a time. Service role writes; users can read their own rows.

CREATE TABLE IF NOT EXISTS greeter_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  rnv_session_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  moments_charged INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  CONSTRAINT greeter_sessions_status_check CHECK (status IN ('active', 'ending', 'ended'))
);

CREATE UNIQUE INDEX IF NOT EXISTS greeter_sessions_one_active
  ON greeter_sessions (status)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_greeter_sessions_user
  ON greeter_sessions (user_id, created_at DESC);

ALTER TABLE greeter_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own greeter sessions" ON greeter_sessions;
CREATE POLICY "Users view own greeter sessions" ON greeter_sessions
  FOR SELECT USING (auth.uid() = user_id);
