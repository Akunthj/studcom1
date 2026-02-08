import { useState, useRef } from "react";

/**
 * Safe JSON parse from fetch response (handles empty body, JSON parse errors)
 */
async function safeFetchJson(resp) {
  if (!resp) return { status: "error", error: "no_response" };
  try {
    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      const parsed = txt ? (() => { try { return JSON.parse(txt); } catch { return { error: txt }; } })() : {};
      return { status: "error", error: parsed.error || `HTTP_${resp.status}`, details: parsed.details };
    }
    const raw = await resp.text().catch(() => "");
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    console.warn("[safeFetchJson] Error:", e);
    return { status: "error", error: "parse_failed" };
  }
}

/**
 * Poll job status with timeout (5 minutes max)
 */
async function pollJobStatus(jobId, onUpdate) {
  const start = Date.now();
  const maxDuration = 1000 * 60 * 5; // 5 minutes
  const pollInterval = 2000; // 2 seconds

  while (true) {
    if (Date.now() - start > maxDuration) {
      return { status: "error", error: "timeout", details: "Processing exceeded 5 minutes" };
    }

    try {
      const resp = await fetch(`/api/notes/${jobId}`);
      const data = await safeFetchJson(resp);
      onUpdate?.(data);

      if (data.status === "done" || data.status === "error") {
        return data;
      }
    } catch (e) {
      console.warn("[pollJobStatus] Network error:", e);
      // continue polling on transient errors
    }

    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }
}

export default function NotesMaker() {
  const [notes, setNotes] = useState<any | null>(null);
  const [status, setStatus] = useState<string>("idle");
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const uploadFile = async () => {
    const file = inputRef.current?.files?.[0];
    if (!file) return alert("Choose a file first");

    setStatus("uploading");
    setError(null);

    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/notes", {
        method: "POST",
        body: fd,
      });

      const json = await safeFetchJson(res);

      if (json.status === "error" || !json.jobId) {
        setError(json.error || json.details || "Upload failed");
        setStatus("error");
        return;
      }

      setJobId(json.jobId);
      setStatus("processing");

      // Use async polling
      const result = await pollJobStatus(json.jobId, (update) => {
        // onUpdate callback for real-time status
        if (update.status !== "done" && update.status !== "error") {
          setStatus(`processing: ${update.message || "..."}`);        }
      });

      if (result.status === "done") {
        setNotes(result.notes);
        setStatus("done");
      } else {
        setError(result.error || result.details || "Processing failed");
        setStatus("error");
      }
    } catch (err) {
      setError("Unexpected error: " + String(err).slice(0, 100));
      setStatus("error");
    }
  };

  // Legacy polling function (now replaced by async pollJobStatus above)
  // Keeping as backup but not used in uploadFile
  const poll = (id: string) => {
    // Deprecated: use pollJobStatus in uploadFile instead
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Notes Maker</h1>

      <input type="file" ref={inputRef} />
      <button onClick={uploadFile}>Upload & Generate</button>

      <div style={{ marginTop: 10 }}>
        <strong>Status:</strong> {status}
      </div>

      {error && <div style={{ color: "red" }}>{error}</div>}

      {notes && (
        <div style={{ marginTop: 20 }}>
          <h2>{notes.title}</h2>
          <p>{notes.summary}</p>
        </div>
      )}
    </div>
  );
}
