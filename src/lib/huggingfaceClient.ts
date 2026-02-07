const HF_TOKEN = import.meta.env.VITE_HUGGINGFACE_TOKEN;
const HF_MODEL = import.meta.env.VITE_HF_MODEL || 'meta-llama/Llama-2-7b-chat-hf';

interface HFRequestBody {
  inputs: string;
  parameters?: Record<string, unknown>;
}

// Minimal Hugging Face generation client for frontend/dev testing.
// WARNING: Exposing HF_TOKEN in the browser is insecure for production. Use a server-side proxy in prod.
export async function hfGenerate(prompt: string, temperature = 0.7, max_new_tokens = 512): Promise<string> {
  if (!HF_TOKEN) throw new Error('VITE_HUGGINGFACE_TOKEN not configured');

  const body: HFRequestBody = {
    inputs: prompt,
    parameters: {
      temperature,
      max_new_tokens,
    },
  };

  const res = await fetch(`https://api-inference.huggingface.co/models/${HF_MODEL}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${HF_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`HuggingFace generation error: ${res.status} - ${txt}`);
  }

  const data = await res.json();

  // Typical shapes: { generated_text } or [{ generated_text }] depending on model/pipeline
  if (data?.generated_text && typeof data.generated_text === 'string') return data.generated_text;
  if (Array.isArray(data) && data[0]?.generated_text) return data[0].generated_text;
  // Some models return an array of outputs with 'generated_text'
  // Fallback: try common key
  if (data?.[0]?.generated_text) return data[0].generated_text;

  // As a last resort, try stringifying the response
  return typeof data === 'string' ? data : JSON.stringify(data);
}