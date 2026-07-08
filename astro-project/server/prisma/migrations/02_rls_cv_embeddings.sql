-- Enable Row Level Security on cv_embeddings
ALTER TABLE cv_embeddings ENABLE ROW LEVEL SECURITY;

-- Drop policy if exists
DROP POLICY IF EXISTS "Users can only access their own embeddings" ON cv_embeddings;

-- Create policy to allow users to select, insert, update, or delete only their own embeddings
CREATE POLICY "Users can only access their own embeddings" ON cv_embeddings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM cv_chunks
      JOIN cvs ON cv_chunks."cvId" = cvs.id
      WHERE cv_embeddings."chunkId" = cv_chunks.id
        AND cvs."userId" = auth.uid()::text
    )
  );
