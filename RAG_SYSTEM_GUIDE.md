# RAG System Implementation Guide

## Overview

This document describes the Retrieval-Augmented Generation (RAG) system implemented for the Student Companion AI Assistant. The system transforms the AI from providing hardcoded responses to intelligent, context-aware answers based on uploaded course materials.

## Architecture

### Components

1. **Vector Database (PostgreSQL + pgvector)**
   - Stores document chunks with 768-dimensional embeddings
   - Uses HNSW indexing for fast similarity search
   - Implements cosine similarity for semantic matching

2. **Embedding Service (Google Gemini)**
   - Model: `text-embedding-004`
   - Dimension: 768
   - Task types: `RETRIEVAL_DOCUMENT` and `RETRIEVAL_QUERY`

3. **LLM Service (Google Gemini)**
   - Model: `gemini-2.0-flash-exp`
   - Used for generating contextual responses

4. **Edge Functions (Supabase/Deno)**
   - `embed-document`: Processes and embeds uploaded documents
   - `ai-assistant`: Handles RAG queries and response generation

5. **Frontend (React + TypeScript)**
   - PDF text extraction using `pdfjs-dist`
   - Automatic embedding trigger on file upload
   - Real-time processing status display

## Data Flow

### Document Upload and Processing

```
User uploads PDF → Frontend extracts text → Backend receives text
    ↓
Backend chunks text (2000 chars with 200 char overlap)
    ↓
Gemini API generates embeddings (768-dimensional vectors)
    ↓
Chunks + embeddings stored in document_chunks table
    ↓
Resource status updated to 'completed'
```

### Question Answering

```
User asks question → Frontend sends to ai-assistant
    ↓
Backend embeds query using Gemini
    ↓
Vector search finds top 5 relevant chunks (cosine similarity > 0.7)
    ↓
Retrieved chunks assembled as context
    ↓
Gemini generates response using context + question
    ↓
Response returned to user with source citations
```

## Database Schema

### document_chunks Table

```sql
CREATE TABLE document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID REFERENCES resources(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  page_number INTEGER,
  source_type TEXT NOT NULL CHECK (source_type IN ('slides', 'notes', 'pyqs', 'book')),
  source_title TEXT NOT NULL,
  embedding VECTOR(768),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### match_documents Function

```sql
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding VECTOR(768),
  match_topic_id UUID,
  match_count INT DEFAULT 5,
  match_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  chunk_index INTEGER,
  page_number INTEGER,
  source_type TEXT,
  source_title TEXT,
  resource_id UUID,
  similarity FLOAT
)
```

## API Endpoints

### POST /functions/v1/embed-document

Processes a document for RAG by creating embeddings.

**Request:**
```json
{
  "resourceId": "uuid",
  "topicId": "uuid",
  "subjectId": "uuid",
  "textContent": "extracted PDF text..."
}
```

**Response:**
```json
{
  "success": true,
  "chunksCreated": 15,
  "resourceId": "uuid"
}
```

### POST /functions/v1/ai-assistant

Queries the RAG system with a question.

**Request:**
```json
{
  "message": "What is gradient descent?",
  "topicName": "Machine Learning",
  "topicId": "uuid",
  "chatType": "doubt"
}
```

**Response:**
```json
{
  "response": "Based on your course materials...",
  "sources": [
    {
      "title": "ML Lecture 3 Slides",
      "type": "slides",
      "page": null
    }
  ]
}
```

## Configuration

### Environment Variables

Required in Supabase Edge Functions:

```bash
GEMINI_API_KEY=your_gemini_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Required in Frontend (.env):

```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## Usage Guide

### For Users

1. **Upload Documents:**
   - Navigate to a topic
   - Go to Books, Slides, or PYQs tab
   - Click "Add" button
   - Upload a PDF file
   - Wait for processing (automatic text extraction and embedding)

2. **Ask Questions:**
   - Open AI Assistant panel
   - Select "AI Doubt Assistant" or "Concept Explainer" mode
   - Type your question
   - Receive contextual answers based on your uploaded materials

### For Developers

#### Adding a New Document Type

1. Update the migration to include new type in CHECK constraint
2. Update TypeScript types in `src/lib/types.ts`
3. Create new tab component if needed
4. Ensure FileUpload receives proper subjectId

#### Adjusting Chunking Strategy

Edit `chunkText()` function in `embed-document/index.ts`:

```typescript
const chunkSize = 2000; // Characters per chunk
const overlap = 200;    // Overlap between chunks
```

#### Changing Similarity Threshold

Edit the threshold in `ai-assistant/index.ts`:

```typescript
match_threshold: 0.7  // Higher = more strict matching
```

## Performance Considerations

### Embedding Costs (Google Gemini Free Tier)

- text-embedding-004: Up to 1,500 requests per day (free)
- Each document typically generates 10-20 chunks
- Can process ~75-150 documents per day on free tier

### Vector Search Performance

- HNSW index provides O(log n) search complexity
- Typical query latency: 10-50ms for 10,000+ chunks
- Scales efficiently to millions of chunks

### Storage Requirements

- Each chunk: ~2KB text + 3KB embedding = ~5KB total
- 1000 chunks ≈ 5MB storage
- 10,000 chunks ≈ 50MB storage

## Troubleshooting

### Document Processing Fails

**Symptom:** Resource status shows "failed"

**Solutions:**
1. Check if GEMINI_API_KEY is set correctly
2. Verify PDF is not corrupted or password-protected
3. Check Supabase logs for detailed error messages
4. Ensure text extraction produced valid content (>100 chars)

### No Relevant Results Found

**Symptom:** AI says "no materials available"

**Solutions:**
1. Verify documents were processed successfully (status = 'completed')
2. Check if chunks exist in document_chunks table for the topic
3. Lower similarity threshold if matching is too strict
4. Ensure question is related to uploaded content

### Slow Response Times

**Solutions:**
1. Check if HNSW index was created successfully
2. Verify network connectivity to Gemini API
3. Consider reducing match_count parameter
4. Monitor Supabase function execution time

## Security Considerations

### API Key Protection

- ✅ API keys stored in Supabase environment variables (secure)
- ✅ Frontend uses anon key with RLS policies
- ✅ Service role key only used in Edge Functions

### Data Access Control

- ✅ Row-Level Security (RLS) enabled on all tables
- ✅ Users can only access documents for topics they have access to
- ✅ Document chunks inherit topic-level permissions

### Input Validation

- ✅ Request body validation in Edge Functions
- ✅ File type validation in frontend
- ✅ SQL injection prevention via parameterized queries
- ✅ XSS prevention via React's built-in escaping

## Future Enhancements

### Potential Improvements

1. **Enhanced Chunking:**
   - Semantic chunking (split on paragraphs/sections)
   - Page number extraction from PDFs
   - Support for PowerPoint and Word documents

2. **Better Retrieval:**
   - Hybrid search (combine semantic + keyword search)
   - Re-ranking of retrieved chunks
   - Query expansion for better matches

3. **User Experience:**
   - Highlight source snippets in responses
   - Link directly to page numbers in PDFs
   - Show confidence scores for answers

4. **Performance:**
   - Caching for frequently asked questions
   - Batch processing for multiple documents
   - Incremental indexing

5. **Analytics:**
   - Track most asked questions
   - Identify knowledge gaps
   - Monitor RAG system accuracy

## References

- [Google Gemini API Documentation](https://ai.google.dev/docs)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [PDF.js Documentation](https://mozilla.github.io/pdf.js/)

## Support

For issues or questions:
1. Check Supabase logs for detailed error messages
2. Review this documentation for common solutions
3. Open an issue on the GitHub repository
4. Contact the development team

---

**Last Updated:** February 6, 2026
**Version:** 1.0.0
