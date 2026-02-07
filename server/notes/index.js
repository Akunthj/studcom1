// server/notes/index.js
console.log("=== THIS IS THE ACTIVE NOTES SERVER FILE ===");

import dotenv from "dotenv";
dotenv.config();console.log("Loaded API KEY:", process.env.GOOGLE_API_KEY);

import express from "express";
import multer from "multer";
import fs from "fs/promises";
import path from "path";
import fetch from "node-fetch"; // if Node 18+ you may remove this import and use global fetch
import Ajv from "ajv";
import { v4 as uuidv4 } from "uuid";
import { extractTextFromFile } from "./extractor.js";
import { chunkText } from "./chunker.js";
import { mergeNotes } from "./merge.js";
import NOTES_SCHEMA from "./schema.json" with { type: "json" };


const upload = multer({ dest: "server/tmp_uploads/" });
const app = express();
app.use(express.json());

const ajv = new Ajv();
const validate = ajv.compile(NOTES_SCHEMA);

const API_KEY = process.env.GOOGLE_API_KEY;
if (!API_KEY) console.warn("Missing GOOGLE_API_KEY in env (server/notes)");

const JOBS = {}; // simple in-memory job store for prototype

async function callGeminiStructured(text, schema) {
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;


const body = {
  contents: [
    {
      parts: [
        {
          text: `You are a notes-only assistant. Return only valid JSON.

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
    maxOutputTokens: 1200
  }
};

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const data = await resp.json();

  if (!resp.ok) {
    throw new Error(JSON.stringify(data));
  }

  // Gemini returns text inside candidates array
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawText) {
    throw new Error("No text returned from Gemini");
  }

  // sanitize rawText that may be wrapped in Markdown code fences or other noise,
// then parse to JSON
function sanitizeAndParseJSON(raw) {
  if (!raw || typeof raw !== "string") throw new Error("No text to parse");

  // 1) Remove code fences like ```json and ```
  let s = raw.replace(/```json/g, "").replace(/```/g, "").trim();

  // 2) If still contains leading/trailing backticks, strip them
  s = s.replace(/^`+/, "").replace(/`+$/, "").trim();

  // 3) Sometimes assistant returns text with a preface; try to extract the
  // first {...} JSON block (greedy).
  const firstBrace = s.indexOf("{");
  const lastBrace = s.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    s = s.slice(firstBrace, lastBrace + 1);
  }

  // 4) Final trim and parse
  s = s.trim();
  return JSON.parse(s);
}

try {
  return sanitizeAndParseJSON(rawText);
} catch (err) {
  // If parsing still fails, include some context but avoid exposing secrets.
  console.warn("Failed parsing model output; rawText preview:", rawText?.slice(0, 500));
  throw new Error("Failed to parse model JSON output: " + err.message);}
}



app.post("/api/notes", upload.single("file"), async (req, res) => {
  try {
    const f = req.file;
    if (!f) return res.status(400).json({ error: "no file uploaded" });

    const jobId = uuidv4();
    console.log("POST received, creating job:", jobId);

    JOBS[jobId] = { status: "processing", createdAt: Date.now() };
    console.log("JOBS after storing:", JOBS);

    // Process asynchronously but started immediately (synchronous prototype's processing launched in background)
    (async () => {
      try {
        const text = await extractTextFromFile(f.path, f.mimetype);
        await fs.unlink(f.path).catch(() => {});
        const chunks = chunkText(text, { maxChars: 30000, overlapChars: 500 });

        const chunkOutputs = [];
        for (const c of chunks) {
          let structured = null;
          try {
            const genResp = await callGeminiStructured(c, NOTES_SCHEMA);
            // try to locate structured output in response
            structured =
              genResp?.candidates?.[0]?.content?.[0]?.structuredOutput ||
              genResp?.output?.[0]?.content?.[0]?.structuredOutput ||
              genResp;
          } catch (err) {
            // retry once with stricter instruction
            const retryResp = await callGeminiStructured("SYSTEM: Return only valid JSON.\n\n" + c, NOTES_SCHEMA);
            structured = retryResp;
          }

          try {
            const obj = typeof structured === "string" ? JSON.parse(structured) : structured;
            chunkOutputs.push(obj);

          } catch (err) {
            console.warn("Chunk validation failed, skipping chunk:", err);
          }
        }

        if (chunkOutputs.length === 0) throw new Error("No valid chunk outputs");

        const merged = mergeNotes(chunkOutputs);

        const outPath = path.join("server/storage", `${jobId}.json`);
        await fs.mkdir(path.dirname(outPath), { recursive: true });
        await fs.writeFile(outPath, JSON.stringify(merged, null, 2), "utf8");

        JOBS[jobId] = { status: "done", createdAt: Date.now(), resultPath: outPath };
      } catch (err) {
        JOBS[jobId] = { status: "error", createdAt: Date.now(), error: String(err) };
      }
    })();

    return res.json({ jobId, status: "processing" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: String(err) });
  }
});

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

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Notes service running on ${PORT}`));
