/**
 * Gemini API Client for browser-side AI operations
 * Handles text embeddings and chat completions using Google's Gemini API
 */

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const EMBEDDING_MODEL = 'models/gemini-embedding-001';
const CHAT_MODEL = 'models/gemini-2.0-flash';

interface EmbeddingRequest {
  model: string;
  content: {
    parts: Array<{ text: string }>;
  };
  taskType: string;
}

interface EmbeddingResponse {
  embedding: {
    values: number[];
  };
}

interface BatchEmbeddingResponse {
  embeddings: Array<{
    values: number[];
  }>;
}

/**
 * Chunk text into segments with overlap
 */
export function chunkText(text: string, chunkSize = 2000, overlap = 200): string[] {
  if (overlap >= chunkSize) {
    throw new Error('Overlap must be smaller than chunk size');
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    
    // Move to next chunk with overlap
    start = end - overlap;
    
    // Prevent infinite loop for very small texts or at the end
    if (start >= text.length - overlap || end === text.length) break;
  }

  return chunks.length > 0 ? chunks : [text];
}

/**
 * Embed a single text using Gemini API
 */
export async function embedText(text: string): Promise<number[]> {
  if (!GEMINI_API_KEY) {
    throw new Error('VITE_GEMINI_API_KEY not configured');
  }

  const request: EmbeddingRequest = {
    model: EMBEDDING_MODEL,
    content: {
      parts: [{ text }],
    },
    taskType: 'RETRIEVAL_QUERY',
  };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/${EMBEDDING_MODEL}:embedContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Embedding API error: ${response.status} - ${error}`);
  }

  const data: EmbeddingResponse = await response.json();
  return data.embedding.values;
}

/**
 * Embed multiple texts in batch using Gemini API
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (!GEMINI_API_KEY) {
    throw new Error('VITE_GEMINI_API_KEY not configured');
  }

  const BATCH_SIZE = 100; // Gemini allows up to 100 requests per batch
  const embeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, Math.min(i + BATCH_SIZE, texts.length));
    
    const requests: EmbeddingRequest[] = batch.map((text) => ({
      model: EMBEDDING_MODEL,
      content: {
        parts: [{ text }],
      },
      taskType: 'RETRIEVAL_DOCUMENT',
    }));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${EMBEDDING_MODEL}:batchEmbedContents?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Batch embedding API error: ${response.status} - ${error}`);
    }

    const data: BatchEmbeddingResponse = await response.json();
    embeddings.push(...data.embeddings.map((e) => e.values));
  }

  return embeddings;
}

/**
 * Generate AI response using Gemini API
 */
export async function generateResponse(
  query: string,
  context: string,
  topicName: string,
  chatType: 'doubt' | 'concept_explainer'
): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('VITE_GEMINI_API_KEY not configured');
  }

  const systemPrompt = chatType === 'concept_explainer'
    ? `You are an expert educator helping students understand concepts in ${topicName}. 
Use the provided context from study materials to give comprehensive, accurate explanations.
Format your response clearly with sections like Overview, Key Points, Examples, etc.
If the context doesn't contain relevant information, say so and provide general guidance.`
    : `You are an AI tutor helping students with their doubts about ${topicName}.
Use the provided context from study materials to answer questions accurately.
Be conversational, encouraging, and break down complex ideas into simpler terms.
If you cannot answer from the context provided, acknowledge this and suggest what the student should review.`;

  const prompt = context
    ? `${systemPrompt}

Context from study materials:
${context}

Student's question: ${query}

Please provide a helpful, accurate response based on the context above.`
    : `${systemPrompt}

Student's question: ${query}

Note: No specific study materials are available yet for this topic. Provide general guidance and encourage the student to upload their course materials.`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/${CHAT_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }],
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  
  if (!data.candidates || data.candidates.length === 0) {
    throw new Error('No response from Gemini');
  }

  return data.candidates[0].content.parts[0].text;
}

/**
 * Compute cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  // Validate that both vectors have the same length
  if (a.length !== b.length) {
    throw new Error(`Vector length mismatch: ${a.length} !== ${b.length}`);
  }

  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  // Handle edge case where either vector has zero magnitude
  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}