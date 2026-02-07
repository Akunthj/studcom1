import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestBody {
  message: string;
  topicName: string;
  topicId?: string; // Optional for RAG - if not provided, falls back to non-RAG mode
  chatType: 'doubt' | 'concept_explainer';
}

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

interface DocumentChunk {
  id: string;
  content: string;
  chunk_index: number;
  page_number: number | null;
  source_type: string;
  source_title: string;
  resource_id: string;
  similarity: number;
}

// Embed query using Gemini API
async function embedQuery(query: string, apiKey: string): Promise<number[]> {
  const request: EmbeddingRequest = {
    model: "models/text-embedding-004",
    content: {
      parts: [{ text: query }],
    },
    taskType: "RETRIEVAL_QUERY",
  };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/text-embedding-004:embedContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
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

// Call Gemini to generate response
async function generateResponse(
  query: string,
  context: string,
  topicName: string,
  chatType: string,
  apiKey: string
): Promise<string> {
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
    `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
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
    throw new Error("No response from Gemini");
  }

  return data.candidates[0].content.parts[0].text;
}

// Fallback responses when RAG is not available
const generateFallbackResponse = (message: string, topicName: string, chatType: string): string => {
  if (chatType === 'concept_explainer') {
    return `# Understanding ${message} in ${topicName}

I'd love to help you understand ${message} better! However, I don't have access to your specific course materials yet.

## Here's what you can do:

1. **Upload Your Materials**: Upload your slides, notes, or textbooks for ${topicName} so I can provide answers directly from your course content.

2. **General Understanding**: ${message} is an important concept in ${topicName}. Once you upload materials, I can:
   - Break down the concept with examples from your slides
   - Reference specific definitions from your textbooks
   - Connect it to other topics you're studying

3. **Ask Specific Questions**: Feel free to ask specific questions about what confuses you, and I'll do my best to help!

Would you like to upload some study materials first?`;
  } else {
    return `That's a great question about ${topicName}!

To give you the most accurate answer, I need access to your course materials. Here's why:

📚 **Better Answers**: With your slides, textbooks, or notes uploaded, I can:
- Reference exact definitions and examples from your course
- Use terminology consistent with your professor's teaching
- Point you to specific pages or sections to review

🎯 **How to Get Started**:
1. Go to the Resources section for ${topicName}
2. Upload your course materials (PDFs of slides, notes, textbooks)
3. Come back and ask your question again

In the meantime, feel free to:
- Review your notes and highlight confusing parts
- Think about specific aspects that are unclear
- Prepare follow-up questions

I'm here to help once you've uploaded your materials!`;
  }
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { message, topicName, topicId, chatType }: RequestBody = await req.json();

    if (!message || !topicName || !chatType) {
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

    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    
    // If no Gemini API key or no topicId, use fallback
    if (!geminiApiKey || !topicId) {
      const fallbackResponse = generateFallbackResponse(message, topicName, chatType);
      return new Response(
        JSON.stringify({ response: fallbackResponse }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Embed the user's query
    const queryEmbedding = await embedQuery(message, geminiApiKey);

    // Search for relevant document chunks using the match_documents function
    // Note: pgvector RPC functions accept embeddings as JSON string format
    const { data: chunks, error: searchError } = await supabase.rpc(
      "match_documents",
      {
        query_embedding: JSON.stringify(queryEmbedding),
        match_topic_id: topicId,
        match_count: 5,
        match_threshold: 0.7,
      }
    );

    if (searchError) {
      console.error("Error searching documents:", searchError);
      throw searchError;
    }

    // Build context from retrieved chunks
    let context = "";
    if (chunks && chunks.length > 0) {
      context = chunks
        .map((chunk: DocumentChunk, idx: number) => {
          return `[Source ${idx + 1}: ${chunk.source_title} (${chunk.source_type})${
            chunk.page_number ? `, Page ${chunk.page_number}` : ""
          }]
${chunk.content}
`;
        })
        .join("\n---\n\n");
    }

    // Generate AI response using Gemini with RAG context
    const aiResponse = await generateResponse(
      message,
      context,
      topicName,
      chatType,
      geminiApiKey
    );

    return new Response(
      JSON.stringify({ 
        response: aiResponse,
        sources: chunks?.map((c: DocumentChunk) => ({
          title: c.source_title,
          type: c.source_type,
          page: c.page_number,
        })) || []
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in AI assistant:", error);
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
