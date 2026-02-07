// server/notes/extractor.js
import fs from "fs/promises";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

import mammoth from "mammoth";

export async function extractTextFromFile(filePath, mimetype) {
  if (mimetype === "application/pdf" || filePath.endsWith(".pdf")) {
    const buf = await fs.readFile(filePath);
    const out = await pdfParse(buf);
    return out.text || "";
  }
  if (
    mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    filePath.endsWith(".docx")
  ) {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value || "";
  }
  // fallback to reading text
  return await fs.readFile(filePath, "utf8");
}
