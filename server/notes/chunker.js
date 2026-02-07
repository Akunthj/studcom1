// server/notes/chunker.js
export function chunkText(text, { maxChars = 30000, overlapChars = 500 } = {}) {
  const out = [];
  let i = 0;
  while (i < text.length) {
    const chunk = text.slice(i, i + maxChars);
    out.push(chunk.trim());
    i += Math.max(1, maxChars - overlapChars);
  }
  return out;
}
