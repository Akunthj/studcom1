/**
 * Gemini API Client for browser-side AI operations
 * Handles text embeddings and chat completions using Google's Gemini API
 */

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const EMBEDDING_MODEL = 'models/gemini-embedding-001';
// Use Gemini 2.5 Flash as primary model; fallback to previous flash-exp if needed
const CHAT_MODEL = 'models/gemini-2.5-flash';
const CHAT_MODEL_FALLBACK = 'models/gemini-2.0-flash-exp';

interface EmbeddingRequest {
  model: string;
  content: {
    parts: Array<{ text: string }>;
  };
  task_type: string;
  output_dimensionality?: number;
}

/** API can return singular "embedding" or "embeddings" array */
interface EmbeddingResponse {
  embedding?: { values: number[] };
  embeddings?: Array<{ values: number[] }>;
  error?: { message?: string; code?: number };
}

interface BatchEmbeddingResponse {
  embeddings?: Array<{ values: number[] }>;
  error?: { message?: string };
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

const EMBEDDING_DIM = 768;

/**
 * Parse embedding from API response (supports both "embedding" and "embeddings" shapes).
 */
function parseEmbeddingResponse(data: EmbeddingResponse): number[] {
  if (data.error?.message) {
    throw new Error(data.error.message);
  }
  if (data.embedding?.values?.length) {
    return data.embedding.values;
  }
  if (data.embeddings?.length && data.embeddings[0].values?.length) {
    return data.embeddings[0].values;
  }
  throw new Error(data.error?.message || 'No embedding in response');
}

/**
 * Embed a single text using Gemini API.
 * Returns a zero vector if text is empty (so search works with no uploads without calling the API).
 */
export async function embedText(text: string): Promise<number[]> {
  if (!GEMINI_API_KEY) {
    throw new Error('VITE_GEMINI_API_KEY not configured');
  }

  const trimmed = text?.trim() ?? '';
  if (!trimmed) {
    return new Array(EMBEDDING_DIM).fill(0);
  }

  const request: EmbeddingRequest = {
    model: EMBEDDING_MODEL,
    content: {
      parts: [{ text: trimmed }],
    },
    task_type: 'RETRIEVAL_QUERY',
    output_dimensionality: EMBEDDING_DIM,
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

  const data: EmbeddingResponse = await response.json();

  if (!response.ok) {
    const msg = data.error?.message || (typeof data === 'object' ? JSON.stringify(data) : String(data));
    throw new Error(`Embedding API error: ${response.status} - ${msg}`);
  }

  return parseEmbeddingResponse(data);
}

/**
 * Embed multiple texts in batch using Gemini API.
 * Skips empty strings (returns zero vectors for them so order/length is preserved).
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (!GEMINI_API_KEY) {
    throw new Error('VITE_GEMINI_API_KEY not configured');
  }

  if (!texts?.length) {
    return [];
  }

  const zeroVector = (): number[] => new Array(EMBEDDING_DIM).fill(0);
  const BATCH_SIZE = 100;
  const embeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, Math.min(i + BATCH_SIZE, texts.length));
    const nonEmpty = batch.map((t) => (t?.trim() ?? '')).filter(Boolean);
    if (nonEmpty.length === 0) {
      batch.forEach(() => embeddings.push(zeroVector()));
      continue;
    }

    const requests: EmbeddingRequest[] = nonEmpty.map((text) => ({
      model: EMBEDDING_MODEL,
      content: {
        parts: [{ text }],
      },
      task_type: 'RETRIEVAL_DOCUMENT',
      output_dimensionality: EMBEDDING_DIM,
    }));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${EMBEDDING_MODEL}:batchEmbedContents?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests }),
      }
    );

    const data: BatchEmbeddingResponse = await response.json();

    if (!response.ok) {
      const msg = data.error?.message || (typeof data === 'object' ? JSON.stringify(data) : String(data));
      throw new Error(`Batch embedding API error: ${response.status} - ${msg}`);
    }

    const values = data.embeddings?.map((e) => e.values) ?? [];
    if (values.length !== nonEmpty.length) {
      batch.forEach(() => embeddings.push(zeroVector()));
      continue;
    }
    let vi = 0;
    batch.forEach((t) => {
      if (t?.trim()) {
        embeddings.push(values[vi++]);
      } else {
        embeddings.push(zeroVector());
      }
    });
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

  const payload = {
    contents: [{
      parts: [{ text: prompt }],
    }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024,
    },
  };

  const tryModel = async (model: string) => {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );
    return { ok: res.ok, status: res.status, body: await res.text() };
  };

  let result = await tryModel(CHAT_MODEL);
  if (!result.ok && result.status === 404) {
    result = await tryModel(CHAT_MODEL_FALLBACK);
  }

  if (!result.ok) {
    throw new Error(`Gemini API error: ${result.status} - ${result.body}`);
  }

  const data = JSON.parse(result.body);
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