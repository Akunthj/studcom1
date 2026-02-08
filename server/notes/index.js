/**
 * server/notes/index.js
 * Robust notes worker with persistence of job metadata to disk.
 *
 * KEEP MODEL: gemini-2.5-flash
 */

console.log("=== NOTES SERVICE (improved, persistent meta) ===");

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
import NOTES_SCHEMA from "./schema.json" with { type: "json" };

const app = express();
app.use(express.json());

const upload = multer({ dest: "server/tmp_uploads/" });
const ajv = new Ajv();
const validate = ajv.compile(NOTES_SCHEMA);

const API_KEY = process.env.GOOGLE_API_KEY;
if (!API_KEY) console.warn("⚠️ Missing GOOGLE_API_KEY in env (server/notes)");

const STORAGE_DIR = "server/storage";
const DEBUG_DIR = "server/tmp_debug";
await fs.mkdir(STORAGE_DIR, { recursive: true }).catch(() => {});
await fs.mkdir(DEBUG_DIR, { recursive: true }).catch(() => {});

const JOBS = {}; // in-memory for running jobs; meta persisted to disk.

/* -----------------------
   Helpers: job meta disk
   ----------------------- */
async function writeJobMeta(jobId, meta) {
  const metaPath = path.join(STORAGE_DIR, `${jobId}.meta.json`);
  await fs.writeFile(metaPath, JSON.stringify(meta, null, 2), "utf8");
}

async function readJobMeta(jobId) {
  const metaPath = path.join(STORAGE_DIR, `${jobId}.meta.json`);
  try {
    const raw = await fs.readFile(metaPath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/* -----------------------
   Safe JSON parse helper
   ----------------------- */
function safeJsonParse(text) {
  if (!text || typeof text !== "string") throw new Error("No text to parse");
  let s = text.trim();
  s = s.replace(/```json/gi, "").replace(/```/g, "").trim();
  s = s.replace(/^`+/, "").replace(/`+$/, "").trim();

  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    s = s.slice(first, last + 1);
  }
  s = s.trim();
  return JSON.parse(s);
}

/* -----------------------
   Gemini call with timeout + simple retry
   ----------------------- */
async function callGeminiStructured(text, timeoutMs = 60000) {
  if (!API_KEY) throw new Error("Missing API key");

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

CRITICAL INSTRUCTIONS:
- Return ONLY valid JSON with all required keys
- If output is too long, shorten summary and sections but ALWAYS return complete valid JSON
- Never truncate or return incomplete JSON
- Include empty arrays/strings for missing content rather than omitting keys
- No markdown, no code fences, no explanations

Text:
---
${text}
---`
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 2500
    }
  };

  // fetch with AbortController timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let resp;
  try {
    resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal
    });
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("Gemini request timed out after " + (timeoutMs / 1000) + "s");
    }
    throw new Error("Network/timeout error when calling Gemini: " + String(err.message || err));
  } finally {
    clearTimeout(timeoutId);
  }

  let dataText;
  try {
    dataText = await resp.text();
  } catch (err) {
    throw new Error("Failed reading response body: " + String(err.message || err));
  }

  // Debug: log Gemini response status
  console.log("[DEBUG] Gemini response status:", resp.status, "| Preview:", dataText?.slice(0, 300));

  let data;
  try {
    data = dataText ? JSON.parse(dataText) : null;
  } catch (err) {
    // not JSON? include raw body for debugging
    throw new Error("Invalid JSON response from Gemini: " + (err.message || err) + " | body: " + dataText.slice(0, 2000));
  }

  if (!resp.ok) {
    const code = data?.error?.code ?? resp.status;
    const status = data?.error?.status ?? data?.error?.message ?? "ERROR";
    const dump = JSON.stringify(data).slice(0, 2000);
    if (code === 429 || status === "RESOURCE_EXHAUSTED" || (dump && dump.includes("quota"))) {
      const msg = "QUOTA_EXCEEDED: " + dump;
      throw new Error(msg);
    }
    throw new Error("Gemini API error: " + dump);
  }

  // Try common places for textual output:
  const rawText =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ??
    data?.candidates?.[0]?.text ??
    (typeof data === "string" ? data : null);

  if (!rawText) {
    // maybe model returned structuredOutput directly in the response
    const maybeStructured =
      data?.candidates?.[0]?.content?.[0]?.structuredOutput ??
      data?.output?.[0]?.content?.[0]?.structuredOutput ??
      data?.output;
    if (maybeStructured) return maybeStructured;
    throw new Error("No textual output found in Gemini response: " + JSON.stringify(data).slice(0, 1000));
  }

  // parse the returned text that should contain JSON
  try {
    return safeJsonParse(rawText);
  } catch (err) {
    // still try to recover structuredOutput fields
    const maybeStructured =
      data?.candidates?.[0]?.content?.[0]?.structuredOutput ??
      data?.output?.[0]?.content?.[0]?.structuredOutput;
    if (maybeStructured) return maybeStructured;
    throw new Error("Failed to parse model JSON output: " + (err.message || err) + " | preview: " + rawText.slice(0, 2000));
  }
}

/* -----------------------
   Fallback: simple summary generation (no structured JSON required)
   ----------------------- */
async function callGeminiSimple(promptText) {
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
  const body = {
    contents: [
      {
        parts: [
          { text: promptText }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.0,
      maxOutputTokens: 1200
    }
  };
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await resp.json();
    if (!resp.ok) {
      throw new Error("Gemini error: " + JSON.stringify(data).slice(0, 500));
    }
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
    if (!text) throw new Error("No text in Gemini response");
    return text;
  } catch (e) {
    console.error("callGeminiSimple error:", e);
    throw e;
  }
}

/* -----------------------
   Simple fallback filler for missing keys (so schema tends to pass)
   ----------------------- */
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

/* -----------------------
   POST /api/notes — upload file & start background processing
   ----------------------- */
app.post("/api/notes", upload.single("file"), async (req, res) => {
  try {
    const f = req.file;
    if (!f) return res.status(400).json({ error: "no file uploaded" });

    const jobId = uuidv4();
    console.log("POST received, creating job:", jobId);

    // create meta and persist (so status survives restarts)
    const meta = { jobId, status: "processing", createdAt: Date.now() };
    JOBS[jobId] = meta;
    await writeJobMeta(jobId, meta);

    // background processing (fire-and-forget)
    (async () => {
      try {
        console.log("\n[WORKER] Started for job:", jobId);
        console.log("[WORKER] Extracting text from file");
        const text = await extractTextFromFile(f.path, f.mimetype);
        // remove temp upload
        await fs.unlink(f.path).catch(() => {});

        // safety guard: text must have minimum content
        if (!text || text.length < 200) {
          throw new Error("Extracted text too small or empty");
        }

        // larger chunks: fewer API calls, more context, less quota waste
        const chunks = chunkText(text, { maxChars: 180000, overlapChars: 0 });
        console.log(`[WORKER] Text split into ${chunks.length} chunk(s)`);

        const chunkOutputs = [];
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          console.log(`[WORKER] Processing chunk ${i + 1}/${chunks.length}`);

          let parsed = null;
          try {
            console.log(`[WORKER] Calling Gemini for chunk ${i + 1}`);
            parsed = await callGeminiStructured(chunk, 60000);
            console.log(`[WORKER] Gemini response received for chunk ${i + 1}`);
          } catch (err) {
            console.warn(`job=${jobId} chunk=${i} failed:`, err.message || err);
            
            // write debug info
            try {
              await fs.mkdir(DEBUG_DIR, { recursive: true });
              await fs.writeFile(
                path.join(DEBUG_DIR, `${jobId}-chunk-${i}-error.json`),
                JSON.stringify({ jobId, chunkIndex: i, error: String(err.message || err).slice(0, 2000), chunkPreview: chunk.slice(0, 2000), ts: Date.now() }, null, 2),
                "utf8"
              );
            } catch (wErr) {
              console.warn("Failed to write debug file:", wErr);
            }

            // quota-specific: abort job early and mark error
            if ((String(err.message || "").toLowerCase().includes("quota")) || (String(err.message || "").toLowerCase().includes("quota_exceeded")) || (String(err.message || "").toLowerCase().includes("resource_exhausted"))) {
              const em = { jobId, status: "error", createdAt: Date.now(), error: "Quota exceeded: " + String(err.message || err) };
              JOBS[jobId] = em;
              await writeJobMeta(jobId, em);
              console.error("Job failed due to quota. job:", jobId);
              return;
            }
            
            // non-quota error: continue to next chunk
            console.warn(`job=${jobId} chunk ${i} produced no output - skipping`);
            continue;
          }

          if (!parsed) {
            console.warn(`job=${jobId} chunk ${i} produced no parsed output - skipping`);
            continue;
          }

          // coerce to object and validate/fallback
          try {
            const obj = typeof parsed === "string" ? JSON.parse(parsed) : parsed;
            if (validate(obj)) {
              chunkOutputs.push(obj);
            } else {
              console.warn("Schema validation failed; filling defaults", validate.errors);
              const fallback = fillDefaults(obj);
              chunkOutputs.push(fallback);
            }
          } catch (parseErr) {
            console.warn("Failed to coerce parsed chunk into JSON:", parseErr.message || parseErr);
            // save raw output for debugging
            try {
              await fs.mkdir(DEBUG_DIR, { recursive: true });
              await fs.writeFile(path.join(DEBUG_DIR, `${jobId}-chunk-${i}-raw.txt`), String(parsed || chunk).slice(0, 20000), "utf8");
            } catch (wErr) {
              console.warn("Failed writing raw debug:", wErr);
            }
            // skip chunk
            continue;
          }
        } // end for chunks

        if (chunkOutputs.length === 0) {
          // Fallback: try simple summary from full text
          console.log("[FALLBACK] No chunk outputs; attempting simple summary...");
          try {
            const summaryPrompt = `Summarize this text in JSON with keys: title (short title), summary (2-3 sentences), tl_dr (one sentence). Return ONLY valid JSON, no markdown or extra text.\n\nText:\n---\n${text.slice(0, 8000)}\n---`;
            const summaryText = await callGeminiSimple(summaryPrompt);
            const parsed = typeof summaryText === "string" ? JSON.parse(summaryText) : summaryText;
            const merged = fillDefaults(parsed);
            const outPath = path.join(STORAGE_DIR, `${jobId}.json`);
            await fs.writeFile(outPath, JSON.stringify(merged, null, 2), "utf8");
            const doneMeta = { jobId, status: "done", createdAt: Date.now(), resultPath: outPath };
            JOBS[jobId] = doneMeta;
            await writeJobMeta(jobId, doneMeta);
            console.log("Job succeeded via fallback summary:", jobId);
            return;
          } catch (fallbackErr) {
            console.error("[WORKER] Fallback summary failed:", fallbackErr && (fallbackErr.message || String(fallbackErr)));
            const em = { jobId, status: "error", createdAt: Date.now(), error: "No valid chunk outputs and fallback failed: " + String(fallbackErr && (fallbackErr.message || fallbackErr)).slice(0, 200) };
            JOBS[jobId] = em;
            await writeJobMeta(jobId, em);
            console.error("[WORKER] Job failed - no valid outputs:", jobId);
            return;
          }
        }

        // merge, persist result
        console.log("[WORKER] Merging chunk outputs");
        const merged = mergeNotes(chunkOutputs);
        console.log("[WORKER] Writing output to disk");
        const outPath = path.join(STORAGE_DIR, `${jobId}.json`);
        await fs.mkdir(path.dirname(outPath), { recursive: true });
        await fs.writeFile(outPath, JSON.stringify(merged, null, 2), "utf8");

        console.log("[WORKER] Marking job as done");
        const doneMeta = { jobId, status: "done", createdAt: Date.now(), resultPath: outPath };
        JOBS[jobId] = doneMeta;
        await writeJobMeta(jobId, doneMeta);

        console.log("[WORKER] Job marked as done:", jobId);
      } catch (bgErr) {
        console.error("[WORKER] Error for job:", jobId, bgErr && (bgErr.message || String(bgErr)));
        const em = { jobId, status: "error", createdAt: Date.now(), error: String(bgErr && (bgErr.message || bgErr)) };
        JOBS[jobId] = em;
        try {
          await writeJobMeta(jobId, em);
        } catch (metaErr) {
          console.error("[WORKER] Failed to write error meta:", metaErr);
        }
      }
    })();

    // Set hard timeout: if job is still processing after 3 minutes, mark as error
    setTimeout(() => {
      if (JOBS[jobId] && JOBS[jobId].status === "processing") {
        console.error("[TIMEOUT] Job exceeded 3-minute limit:", jobId);
        const timeoutMeta = {
          jobId,
          status: "error",
          createdAt: Date.now(),
          error: "Processing timeout exceeded (3 minutes)"
        };
        JOBS[jobId] = timeoutMeta;
        writeJobMeta(jobId, timeoutMeta).catch((err) => {
          console.error("[TIMEOUT] Failed to write timeout meta:", err);
        });
      }
    }, 180000);

    return res.json({ jobId, status: "processing" });
  } catch (err) {
    console.error("POST /api/notes error:", err);
    return res.status(500).json({ error: String(err) });
  }
});

/* -----------------------
   GET /api/notes/:id — return job status (in-memory -> meta file -> result)
   ----------------------- */
app.get("/api/notes/:id", async (req, res) => {
  const id = req.params.id;
  console.log("GET request for:", id);

  // check in-memory JOBS
  const j = JOBS[id];
  if (j) {
    // if done and file exists, return done with notes
    if (j.status === "done" && j.resultPath) {
      try {
        const content = await fs.readFile(j.resultPath, "utf8");
        return res.json({ status: "done", notes: JSON.parse(content) });
      } catch {
        // fall through to return meta
      }
    }
    return res.json(j);
  }

  // fallback: read stored meta file
  const meta = await readJobMeta(id);
  if (!meta) {
    // final fallback: check if result JSON exists (maybe meta missing)
    const possible = path.join(STORAGE_DIR, `${id}.json`);
    try {
      const content = await fs.readFile(possible, "utf8");
      return res.json({ status: "done", notes: JSON.parse(content) });
    } catch {
      return res.status(404).json({ error: "job_not_found" });
    }
  }

  // if meta says done, return result
  if (meta.status === "done" && meta.resultPath) {
    try {
      const content = await fs.readFile(meta.resultPath, "utf8");
      return res.json({ status: "done", notes: JSON.parse(content) });
    } catch {
      // continue to return meta
    }
  }

  return res.json(meta);
});

/* -----------------------
   GET /api/notes/:id/download
   ----------------------- */
app.get("/api/notes/:id/download", async (req, res) => {
  const id = req.params.id;
  // check meta or in-memory
  const j = JOBS[id] || (await readJobMeta(id));
  if (!j || j.status !== "done") return res.status(404).json({ error: "not_ready" });
  try {
    return res.download(path.resolve(j.resultPath));
  } catch (e) {
    return res.status(500).json({ error: "download_failed" });
  }
});

/* -----------------------
   GET /api/notes — list saved jobs (reads storage folder)
   ----------------------- */
app.get("/api/notes", async (req, res) => {
  try {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
    const files = await fs.readdir(STORAGE_DIR);
    const jobs = [];
    for (const f of files) {
      if (!f.endsWith(".json")) continue;
      const full = path.join(STORAGE_DIR, f);
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

/* -----------------------
   Health check endpoint
   ----------------------- */
app.get("/healthz", (req, res) => {
  return res.json({ status: "ok", ts: Date.now() });
});

/* -----------------------
   Global error handler
   ----------------------- */
app.use((err, req, res, next) => {
  console.error("[ERROR] Unhandled error:", err && (err.stack || err.message || err));
  try {
    if (res.headersSent) return next(err);
    return res.status(500).json({ error: "internal_server_error", details: String(err && (err.message || err)).slice(0, 500) });
  } catch (e) {
    return res.status(500).json({ error: "internal_server_error" });
  }
});

/* -----------------------
   Start server
   ----------------------- */
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Notes service running on ${PORT}`));
