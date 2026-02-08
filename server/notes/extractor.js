// server/notes/extractor.js

import fs from "fs/promises";
import mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

export async function extractTextFromFile(filePath, mimetype) {
  try {
    // Handle PDF
    if (mimetype === "application/pdf" || filePath.endsWith(".pdf")) {
      const buffer = await fs.readFile(filePath);

        const uint8Array = new Uint8Array(buffer);
        const loadingTask = pdfjsLib.getDocument({ data: uint8Array });

      const pdf = await loadingTask.promise;

      let textContent = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const strings = content.items.map((item) => item.str);
        textContent += strings.join(" ") + "\n";
      }

      return textContent;
    }

    // Handle DOCX
    if (
      mimetype ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      filePath.endsWith(".docx")
    ) {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value || "";
    }

    // Fallback
    return await fs.readFile(filePath, "utf8");
  } catch (err) {
    console.error("File extraction error:", err);
    throw err;
  }
}
