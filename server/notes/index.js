// server/notes/index.js
console.log("=== THIS IS THE ACTIVE NOTES SERVER FILE ===");

import dotenv from "dotenv";
dotenv.config();

import express from "express";
import multer from "multer";
import fs from "fs/promises";
import path from "path";
import Ajv from "ajv";
import { v4 as uuidv4 } from "uuid";
import { extractTextFromFile } from "./extractor.js";
import { chunkText } from "./chunker.js";
import { mergeNotes } from "./merge.js";
import NOTES_SCHEMA from "./schema.json" with { type: "json" };

const app = express();
app.use(express.json());
const upload = multer({ dest: "server/tmp_uploads/" });

const ajv = new Ajv();
const validate = ajv.compile(NOTES_SCHEMA);

const API_KEY = process.env.GOOGLE_API_KEY;
if (!API_KEY) console.warn("⚠️ Missing GOOGLE_API_KEY in .env (server/notes)");

const JOBS = {}; // in-memory job store for prototype

/* ----------------------
   Gemini call (strict)
   ---------------------- */
async function callGeminiStructured(text) {
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-lite:generateContent?key=${API_KEY}`;

  const body = {
    contents: [
      {
        parts: [
          {
            text: `You are a strict JSON generator whose job is to convert the provided text into a structured notes JSON object that exactly follows the schema.

REQUIREMENTS:
- Return ONLY valid JSON (no markdown, no code fences, no explanations).
- MUST include the field "title" (a short descriptive title, 3–10 words).
- Include fields: title, tl_dr, summary, sections (array), action_items (array), questions (array), flashcards (array).
- If any field is not available, provide an empty string or empty array (do NOT omit the key).

Text:
---
${text}
---`
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.0,
      maxOutputTokens: 4000
    }
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const data = await resp.json();

  if (!resp.ok) {
    // throw a structured error so caller can log it
    throw new Error(JSON.stringify(data));
  }

  // Try to pull the returned text: Gemini variants return candidates[].content.parts[0].text
  const rawText =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ??
    data?.candidates?.[0]?.text ??
    (typeof data === "string" ? data : null);

  if (!rawText) {
    throw new Error("No text returned from Gemini");
  }

  // sanitize and parse to JSON (throws on invalid JSON)
  return sanitizeAndParseJSON(rawText);
}

/* ----------------------
   sanitize & parse JSON
   ---------------------- */
function sanitizeAndParseJSON(raw) {
  if (!raw || typeof raw !== "string") throw new Error("No text to parse");

  let s = raw.trim();

  // Remove markdown fences if present
  s = s.replace(/```json/gi, "").replace(/```/g, "").trim();

  // Strip surrounding backticks if any
  s = s.replace(/^`+/, "").replace(/`+$/, "").trim();

  // Extract first JSON block (from first { to last })
  const firstBrace = s.indexOf("{");
  const lastBrace = s.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    s = s.slice(firstBrace, lastBrace + 1);
  }

  s = s.trim();
  return JSON.parse(s); // will throw if invalid
}

/* ----------------------
   helper: fill defaults
   ---------------------- */
function fillDefaults(obj) {
  return {
    title:
      typeof obj?.title === "string" && obj.title.trim()
        ? obj.title.trim()
        : "Notes",
    tl_dr: typeof obj?.tl_dr === "string" ? obj.tl_dr : "",
    summary: typeof obj?.summary === "string" ? obj.summary : "",
    sections: Array.isArray(obj?.sections) ? obj.sections : [],
    action_items: Array.isArray(obj?.action_items) ? obj.action_items : [],
    questions: Array.isArray(obj?.questions) ? obj.questions : [],
    flashcards: Array.isArray(obj?.flashcards) ? obj.flashcards : []
  };
}

/* ----------------------
   POST /api/notes
   ---------------------- */
app.post("/api/notes", upload.single("file"), async (req, res) => {
  try {
    const f = req.file;
    if (!f) return res.status(400).json({ error: "no file uploaded" });

    const jobId = uuidv4();
    console.log("POST received:", jobId);

    JOBS[jobId] = { status: "processing", createdAt: Date.now() };

    // async processing (fire-and-forget)
    (async () => {
      try {
        const text = await extractTextFromFile(f.path, f.mimetype);
        await fs.unlink(f.path).catch(() => {});

        // For testing you might use single call: const chunks = [text];
        const chunks = chunkText(text, { maxChars: 30000, overlapChars: 500 });

        const chunkOutputs = [];

        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          let parsedObj = null;

          try {
            // primary call
            parsedObj = await callGeminiStructured(chunk);
          } catch (errPrimary) {
            console.warn("Primary call failed for chunk", i, ":", errPrimary.message);

            // retry once with stronger instruction wrapper
            try {
              const retryPrompt = `SYSTEM: Return only valid JSON.\n\n${chunk}`;
              parsedObj = await callGeminiStructured(retryPrompt);
            } catch (errRetry) {
              console.warn("Retry also failed for chunk", i, ":", errRetry.message);

              // write debug file for offline inspection (include chunk and errors)
              try {
                await fs.mkdir("server/tmp_debug", { recursive: true });
                const debugObj = {
                  jobId,
                  chunkIndex: i,
                  errorPrimary: errPrimary.message,
                  errorRetry: errRetry.message,
                  chunkPreview: String(chunk).slice(0, 2000),
                  timestamp: Date.now()
                };
                await fs.writeFile(
                  `server/tmp_debug/${jobId}-chunk-${i}-${Date.now()}.json`,
                  JSON.stringify(debugObj, null, 2),
                  "utf8"
                );
              } catch (wErr) {
                console.warn("Failed to write debug file:", wErr);
              }

              // skip this chunk but continue with others
              continue;
            }
          }

          // parsedObj should be a JS object at this point; if not, try to coerce
          try {
            const obj = typeof parsedObj === "string" ? JSON.parse(parsedObj) : parsedObj;

            // validate against schema
            if (validate(obj)) {
              chunkOutputs.push(obj);
            } else {
              // not valid — attempt fallback by filling defaults
              console.warn("Schema validation failed:", validate.errors);
              console.warn("Model returned (preview):", JSON.stringify(obj).slice(0, 2000));

              const fallback = fillDefaults(obj);

              if (validate(fallback)) {
                console.log("Fallback validated after filling defaults; using fallback.");
                chunkOutputs.push(fallback);
              } else {
                console.warn("Fallback still invalid; pushing fallback (partial) to avoid losing all data.");
                chunkOutputs.push(fallback);
              }
            }
          } catch (parseErr) {
            console.warn("Chunk parsing failed (invalid JSON) for chunk", i, ":", parseErr.message);

            // Save raw model output for debugging
            try {
              await fs.mkdir("server/tmp_debug", { recursive: true });
              await fs.writeFile(
                `server/tmp_debug/${jobId}-chunk-${i}-raw-${Date.now()}.txt`,
                String(parsedObj || chunk).slice(0, 20000),
                "utf8"
              );
            } catch (wErr) {
              console.warn("Failed writing raw debug file:", wErr);
            }

            // skip this chunk
            continue;
          }
        } // end for

        if (chunkOutputs.length === 0) {
          throw new Error("No valid chunk outputs");
        }

        const merged = mergeNotes(chunkOutputs);

        const outPath = path.join("server/storage", `${jobId}.json`);
        await fs.mkdir(path.dirname(outPath), { recursive: true });
        await fs.writeFile(outPath, JSON.stringify(merged, null, 2), "utf8");

        JOBS[jobId] = { status: "done", createdAt: Date.now(), resultPath: outPath };
      } catch (errInner) {
        console.error("Background job error for", jobId, errInner);
        JOBS[jobId] = { status: "error", createdAt: Date.now(), error: String(errInner) };
      }
    })();

    return res.json({ jobId, status: "processing" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: String(err) });
  }
});

/* ----------------------
   GET /status & download
   ---------------------- */
app.get("/api/notes/:id", async (req, res) => {
  console.log("GET request for:", req.params.id);
  console.log("Current JOBS object:", JOBS);

  const id = req.params.id;
  const j = JOBS[id];

  if (!j) return res.status(404).json({ error: "job_not_found" });

  if (j.status === "done") {
    const content = await fs.readFile(j.resultPath, "utf8");
    return res.json({ status: "done", notes: JSON.parse(content) });
  }

  return res.json(j);
});

app.get("/api/notes/:id/download", async (req, res) => {
  const id = req.params.id;
  const j = JOBS[id];
  if (!j || j.status !== "done") return res.status(404).json({ error: "not_ready" });
  res.download(path.resolve(j.resultPath));
});

/* ----------------------
   GET /api/notes - List all saved notes
   ---------------------- */
app.get("/api/notes", async (req, res) => {
  try {
    const dir = "server/storage";
    await fs.mkdir(dir, { recursive: true });
    const files = await fs.readdir(dir);
    const jobs = [];
    for (const f of files) {
      if (!f.endsWith(".json")) continue;
      const full = path.join(dir, f);
      try {
        const stat = await fs.stat(full);
        const content = await fs.readFile(full, "utf8");
        const parsed = JSON.parse(content);
        const jobId = path.basename(f, ".json");
        jobs.push({
          jobId,
          createdAt: stat.ctimeMs || stat.mtimeMs,
          previewTitle: parsed.title || parsed.name || "Notes",
          path: full
        });
      } catch (err) {
        console.warn("Failed reading job file:", f, err);
      }
    }
    jobs.sort((a, b) => b.createdAt - a.createdAt);
    return res.json({ jobs });
  } catch (err) {
    console.error("Failed listing jobs:", err);
    return res.status(500).json({ error: "list_failed" });
  }
});

/* ----------------------
   Start server
   ---------------------- */
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Notes service running on ${PORT}`));
