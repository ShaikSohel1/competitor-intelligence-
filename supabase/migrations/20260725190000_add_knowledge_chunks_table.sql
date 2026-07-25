-- Add pgvector-backed knowledge_chunks for RAG and semantic retrieval

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  competitor_id uuid REFERENCES competitors(id) ON DELETE CASCADE,
  source_table text NOT NULL,
  source_id uuid NOT NULL,
  content text NOT NULL,
  embedding vector(768),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_knowledge_chunks" ON knowledge_chunks;
CREATE POLICY "select_own_knowledge_chunks" ON knowledge_chunks FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_knowledge_chunks" ON knowledge_chunks;
CREATE POLICY "insert_own_knowledge_chunks" ON knowledge_chunks FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_knowledge_chunks" ON knowledge_chunks;
CREATE POLICY "update_own_knowledge_chunks" ON knowledge_chunks FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_knowledge_chunks" ON knowledge_chunks;
CREATE POLICY "delete_own_knowledge_chunks" ON knowledge_chunks FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding
  ON knowledge_chunks USING ivfflat (embedding vector_cosine_ops);

CREATE OR REPLACE FUNCTION match_knowledge_chunks(
  query_embedding vector(768),
  match_user_id uuid,
  match_count int
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  competitor_id uuid,
  source_table text,
  source_id uuid,
  content text,
  embedding vector(768),
  created_at timestamptz,
  distance double precision
)
LANGUAGE SQL STABLE AS $$
  SELECT
    id,
    user_id,
    competitor_id,
    source_table,
    source_id,
    content,
    embedding,
    created_at,
    embedding <#> query_embedding AS distance
  FROM knowledge_chunks
  WHERE user_id = match_user_id
    AND embedding IS NOT NULL
  ORDER BY distance
  LIMIT match_count;
$$;
