import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestBody {
  resourceId: string;
  topicId: string;
  subjectId: string;
  textContent: string; // PDF text extracted on frontend
}

interface EmbeddingRequest {
  model: string;
  content: {
    parts: Array<{ text: string }>;
  };
  taskType: string;
}

interface EmbeddingResponse {
  embeddings: Array<{
    values: number[];
  }>;
}

// Chunk text into segments with overlap
function chunkText(text: string, chunkSize = 2000, overlap = 200): string[] {
  // Validate that overlap is smaller than chunkSize
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

// Call Gemini API to embed chunks
async function embedChunks(chunks: string[], apiKey: string): Promise<number[][]> {
  const BATCH_SIZE = 100; // Gemini allows up to 100 requests per batch
  const embeddings: number[][] = [];

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, Math.min(i + BATCH_SIZE, chunks.length));
    
    const requests: EmbeddingRequest[] = batch.map((chunk) => ({
      model: "models/text-embedding-004",
      content: {
        parts: [{ text: chunk }],
      },
      taskType: "RETRIEVAL_DOCUMENT",
    }));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:batchEmbedContents?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ requests }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Embedding API error: ${response.status} - ${error}`);
    }

    const data: EmbeddingResponse = await response.json();
    embeddings.push(...data.embeddings.map((e) => e.values));
  }

  return embeddings;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  let requestBody: RequestBody | null = null;

  try {
    // Get Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

    if (!geminiApiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    requestBody = await req.json();
    const { resourceId, topicId, subjectId, textContent } = requestBody;

    if (!resourceId || !topicId || !subjectId || !textContent) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Update resource status to processing
    await supabase
      .from("resources")
      .update({ processing_status: "processing" })
      .eq("id", resourceId);

    // Fetch resource metadata
    const { data: resource, error: resourceError } = await supabase
      .from("resources")
      .select("title, type")
      .eq("id", resourceId)
      .single();

    if (resourceError || !resource) {
      throw new Error("Resource not found");
    }

    // Chunk the text
    const chunks = chunkText(textContent);
    console.log(`Created ${chunks.length} chunks for resource ${resourceId}`);

    // Embed chunks using Gemini
    const embeddings = await embedChunks(chunks, geminiApiKey);

    if (embeddings.length !== chunks.length) {
      throw new Error("Mismatch between chunks and embeddings count");
    }

    // Prepare document chunks for insertion
    const documentChunks = chunks.map((chunk, index) => ({
      resource_id: resourceId,
      topic_id: topicId,
      subject_id: subjectId,
      content: chunk,
      chunk_index: index,
      page_number: null, // Can be enhanced later if we extract page numbers
      source_type: resource.type,
      source_title: resource.title,
      // pgvector accepts JSON string format for vector insertion
      embedding: JSON.stringify(embeddings[index]),
    }));

    // Insert chunks in batches (Supabase has a limit on bulk inserts)
    const BATCH_SIZE = 100;
    for (let i = 0; i < documentChunks.length; i += BATCH_SIZE) {
      const batch = documentChunks.slice(i, Math.min(i + BATCH_SIZE, documentChunks.length));
      const { error: insertError } = await supabase
        .from("document_chunks")
        .insert(batch);

      if (insertError) {
        throw new Error(`Failed to insert chunks: ${insertError.message}`);
      }
    }

    // Update resource status to completed
    await supabase
      .from("resources")
      .update({ 
        processing_status: "completed",
        error_message: null 
      })
      .eq("id", resourceId);

    console.log(`Successfully processed resource ${resourceId} with ${chunks.length} chunks`);

    return new Response(
      JSON.stringify({
        success: true,
        chunksCreated: chunks.length,
        resourceId,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in embed-document:", error);

    // Try to update resource status to failed if we have the resourceId
    if (requestBody?.resourceId) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        
        await supabase
          .from("resources")
          .update({ 
            processing_status: "failed",
            error_message: error instanceof Error ? error.message : "Unknown error"
          })
          .eq("id", requestBody.resourceId);
      } catch (updateError) {
        console.error("Failed to update resource status:", updateError);
      }
    }

    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Internal server error" 
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
