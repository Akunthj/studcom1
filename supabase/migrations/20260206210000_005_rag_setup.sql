/*
  # RAG (Retrieval-Augmented Generation) Setup
  
  ## New Features
    - Enable vector extension for semantic search
    - Create document_chunks table for storing embedded document chunks
    - Add match_documents function for vector similarity search
    - Add processing_status to resources table
  
  ## Tables
    - `document_chunks`
      - Stores text chunks from uploaded documents with embeddings
      - Links to resources table
      - Includes metadata (page_number, source_type, etc.)
    
  ## Functions
    - `match_documents` - Vector similarity search using cosine distance
  
  ## Columns
    - `resources.processing_status` - Track document processing state
*/

-- Enable vector extension for pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Create document_chunks table for RAG
CREATE TABLE IF NOT EXISTS document_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id uuid REFERENCES resources(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  content text NOT NULL,
  chunk_index integer NOT NULL,
  page_number integer,
  source_type text NOT NULL CHECK (source_type IN ('slides', 'notes', 'pyqs', 'book')),
  source_title text NOT NULL,
  embedding vector(768), -- text-embedding-004 outputs 768 dimensions
  created_at timestamptz DEFAULT now()
);

-- Create HNSW index for fast similarity search
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding 
  ON document_chunks USING hnsw (embedding vector_cosine_ops);

-- Create indexes for filtering
CREATE INDEX IF NOT EXISTS idx_document_chunks_topic_id ON document_chunks(topic_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_subject_id ON document_chunks(subject_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_resource_id ON document_chunks(resource_id);

-- Enable RLS on document_chunks
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view document chunks for topics they can access
CREATE POLICY "Users can view document chunks"
  ON document_chunks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM topics t
      WHERE t.id = document_chunks.topic_id
    )
  );

-- Create match_documents function for vector similarity search
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(768),
  match_topic_id uuid,
  match_count int DEFAULT 5,
  match_threshold float DEFAULT 0.7
)
RETURNS TABLE (
  id uuid,
  content text,
  chunk_index integer,
  page_number integer,
  source_type text,
  source_title text,
  resource_id uuid,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.content,
    dc.chunk_index,
    dc.page_number,
    dc.source_type,
    dc.source_title,
    dc.resource_id,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM document_chunks dc
  WHERE dc.topic_id = match_topic_id
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Add processing_status column to resources table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'resources' AND column_name = 'processing_status'
  ) THEN
    ALTER TABLE resources ADD COLUMN processing_status text DEFAULT 'pending'
      CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed'));
  END IF;
END $$;

-- Add error_message column to resources table for tracking failures
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'resources' AND column_name = 'error_message'
  ) THEN
    ALTER TABLE resources ADD COLUMN error_message text;
  END IF;
END $$;

-- Create index on processing_status for efficient queries
CREATE INDEX IF NOT EXISTS idx_resources_processing_status ON resources(processing_status);
