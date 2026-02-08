/**
 * server/notes/index.js
 * Improved notes worker: larger chunks, larger outputs, better logging and error handling.
 *
 * KEEP MODEL: gemini-2.5-flash
 */

console.log("=== NOTES SERVICE (improved) ===");

import dotenv from "dotenv";
dotenv.config();

import express from "express";
import multer from "multer";
import fs from "fs/promises";
import path from "path";
import fetch from "node-fetch";
import Ajv from "ajv";
import { v4 as uuidv4 } from "uuid";
import { extractTextFromFile } from "./extractor.js";
import { chunkText } from "./chunker.js";
import { mergeNotes } from "./merge.js";
import NOTES_SCHEMA from "./schema.json" assert { type: "json" };

const app = express();
app.use(express.json());
const upload = multer({ dest: "server/tmp_uploads/" });

const ajv = new Ajv();
const validate = ajv.compile(NOTES_SCHEMA);

const API_KEY = process.env.GOOGLE_API_KEY;
if (!API_KEY) console.warn("⚠️ Missing GOOGLE_API_KEY in env (server/notes)");

const JOBS = {}; // in-memory job store (dev). We persist outputs to disk.

function safeJsonParse(s) {
  if (!s || typeof s !== "string") throw new Error("No text to parse");
  let t = s.trim();
  // remove common code fences / markdown
  t = t.replace(/```json/gi, "").replace(/```/g, "").trim();
  t = t.replace(/^`+/, "").replace(/`+$/, "").trim();
  const first = t.indexOf("{");
  const last = t.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    t = t.slice(first, last + 1);
  }
  t = t.trim();
  return JSON.parse(t);
}

async function callGeminiStructured(text) {
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

  const body = {
    contents: [
      {
        parts: [
          {
            text: `You are an expert academic note-making assistant. Return ONLY valid JSON that follows the schema below. Do NOT include markdown, code fences, explanations or any extra text.

REQUIRED TOP-LEVEL KEYS:
- title (string)
- tl_dr (string)
- summary (string)
- sections (array of objects with at least: heading (string), content (string), key_points (array of strings))
- action_items (array of strings)
- questions (array of strings)
- flashcards (array of {question, answer})

If anything is missing, include the key with an empty string or empty array.

Text:
---
${text}
---`
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 4000
    }
  };

  let resp;
  try {
    resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
  } catch (netErr) {
    throw new Error("Network error when calling Gemini: " + String(netErr));
  }

  let data;
  try {
    data = await resp.json();
  } catch (parseErr) {
    const textBody = await resp.text().catch(() => "");
    throw new Error("Invalid JSON response from Gemini: " + parseErr.message + " | body: " + textBody);
  }

  if (!resp.ok) {
    try {
      const errStr = JSON.stringify(data);
      if (data?.error?.code === 429 || data?.error?.status === "RESOURCE_EXHAUSTED") {
        throw new Error("QUOTA_EXCEEDED: " + errStr);
      }
      throw new Error("Gemini API error: " + errStr);
    } catch (e) {
      throw e;
    }
  }

  const rawText =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ??
    data?.candidates?.[0]?.text ??
    (typeof data === "string" ? data : null);

  if (!rawText) {
    if (data?.output) return data;
    throw new Error("No textual output found in Gemini response: " + JSON.stringify(data).slice(0, 1000));
  }

  try {
    return safeJsonParse(rawText);
  } catch (err) {
    try {
      const maybe = data?.candidates?.[0]?.content?.[0]?.structuredOutput ??
                    data?.output?.[0]?.content?.[0]?.structuredOutput;
      if (maybe) return maybe;
    } catch (e) {}
    const preview = rawText.slice(0, 2000);
    throw new Error("Failed to parse model JSON output: " + String(err.message) + " | preview: " + preview);
  }
}

function fillDefaults(obj) {
  return {
    title: typeof obj?.title === "string" && obj.title.trim() ? obj.title.trim() : "Notes",
    tl_dr: typeof obj?.tl_dr === "string" ? obj.tl_dr : "",
    summary: typeof obj?.summary === "string" ? obj.summary : "",
    sections: Array.isArray(obj?.sections) ? obj.sections : [],
    action_items: Array.isArray(obj?.action_items) ? obj.action_items : [],
    questions: Array.isArray(obj?.questions) ? obj.questions : [],
    flashcards: Array.isArray(obj?.flashcards) ? obj.flashcards : []
  };
}

app.post("/api/notes", upload.single("file"), async (req, res) => {
  try {
    const f = req.file;
    if (!f) return res.status(400).json({ error: "no file uploaded" });

    const jobId = uuidv4();
    console.log("POST received, creating job:", jobId);
    JOBS[jobId] = { status: "processing", createdAt: Date.now() };

    (async () => {
      try {
        console.log("Starting processing for job:", jobId);
        const text = await extractTextFromFile(f.path, f.mimetype);
        await fs.unlink(f.path).catch(() => {});
        const chunks = chunkText(text, { maxChars: 80000, overlapChars: 2000 });
        console.log(`job=${jobId} split into ${chunks.length} chunk(s)`);

        const chunkOutputs = [];
        for (let i = 0; i < chunks.length; i++) {
          const c = chunks[i];
          console.log(`job=${jobId} processing chunk ${i+1}/${chunks.length}`);
          let parsed = null;
          try {
            parsed = await callGeminiStructured(c);
          } catch (errPrimary) {
            console.warn(`Chunk ${i} primary call failed:`, errPrimary.message);
            try {
              parsed = await callGeminiStructured("SYSTEM: Return only valid JSON.\n\n" + c);
            } catch (errRetry) {
              console.warn(`Chunk ${i} retry failed:`, errRetry.message);
              try {
                await fs.mkdir("server/tmp_debug", { recursive: true });
                await fs.writeFile(`server/tmp_debug/${jobId}-chunk-${i}-error.json`, JSON.stringify({
                  jobId, chunkIndex: i, errorPrimary: errPrimary.message, errorRetry: errRetry.message, chunkPreview: String(c).slice(0, 2000), ts: Date.now()
                }, null, 2), "utf8");
              } catch (wErr) {
                console.warn("Failed writing debug file:", wErr);
              }
              if ((errPrimary.message || errRetry.message || "").includes("QUOTA_EXCEEDED") || (errPrimary.message || "").includes("RESOURCE_EXHAUSTED")) {
                JOBS[jobId] = { status: "error", createdAt: Date.now(), error: "Quota exceeded: " + String(errPrimary.message || errRetry.message) };
                console.error("Job failed due to quota. job:", jobId);
                return;
              }
              continue;
            }
          }

          try {
            const obj = typeof parsed === "string" ? JSON.parse(parsed) : parsed;
            if (validate(obj)) {
              chunkOutputs.push(obj);
            } else {
              console.warn("Schema validation failed:", validate.errors);
              const fallback = fillDefaults(obj);
              if (validate(fallback)) {
                chunkOutputs.push(fallback);
              } else {
                chunkOutputs.push(fallback);
              }
            }
          } catch (parseErr) {
            console.warn("Failed to coerce parsed chunk into JSON:", parseErr.message);
            try {
              await fs.mkdir("server/tmp_debug", { recursive: true });
              await fs.writeFile(`server/tmp_debug/${jobId}-chunk-${i}-raw.txt`, String(parsed || c).slice(0, 20000), "utf8");
            } catch (wErr) {
              console.warn("Failed writing raw debug:", wErr);
            }
            continue;
          }
        }

        if (chunkOutputs.length === 0) {
          JOBS[jobId] = { status: "error", createdAt: Date.now(), error: "No valid chunk outputs (model failed or quota)" };
          console.error("job", jobId, "failed: No valid chunk outputs");
          return;
        }

        const merged = mergeNotes(chunkOutputs);
        const outPath = path.join("server/storage", `${jobId}.json`);
        await fs.mkdir(path.dirname(outPath), { recursive: true });
        await fs.writeFile(outPath, JSON.stringify(merged, null, 2), "utf8");

        JOBS[jobId] = { status: "done", createdAt: Date.now(), resultPath: outPath };
        console.log("Job finished:", jobId, "output:", outPath);
      } catch (err) {
        console.error("Background job error:", err);
        JOBS[jobId] = { status: "error", createdAt: Date.now(), error: String(err) };
      }
    })();

    return res.json({ jobId, status: "processing" });
  } catch (err) {
    console.error("POST /api/notes error:", err);
    return res.status(500).json({ error: String(err) });
  }
});

app.get("/api/notes/:id", async (req, res) => {
  console.log("GET request for:", req.params.id);
  const id = req.params.id;
  const j = JOBS[id];
  if (!j) {
    const possible = path.join("server/storage", `${id}.json`);
    try {
      const content = await fs.readFile(possible, "utf8");
      return res.json({ status: "done", notes: JSON.parse(content) });
    } catch {
      return res.status(404).json({ error: "job_not_found" });
    }
  }
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

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Notes service running on ${PORT}`));
