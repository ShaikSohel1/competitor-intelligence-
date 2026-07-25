-- Add chat_messages table for RAG chat history

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  competitor_id uuid REFERENCES competitors(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_chat_messages" ON chat_messages;
CREATE POLICY "select_own_chat_messages" ON chat_messages FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_chat_messages" ON chat_messages;
CREATE POLICY "insert_own_chat_messages" ON chat_messages FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_chat_messages" ON chat_messages;
CREATE POLICY "update_own_chat_messages" ON chat_messages FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_chat_messages" ON chat_messages;
CREATE POLICY "delete_own_chat_messages" ON chat_messages FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id
  ON chat_messages (user_id);

CREATE INDEX IF NOT EXISTS idx_chat_messages_competitor_id
  ON chat_messages (competitor_id);
