import { useState, useRef } from "react";


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

    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch("/api/notes", {
      method: "POST",
      body: fd,
    });

    const json = await res.json();

    if (!res.ok) {
      setError(json.error || "Upload failed");
      setStatus("error");
      return;
    }

    setJobId(json.jobId);
    setStatus("processing");

    poll(json.jobId);
  };

  const poll = (id: string) => {
    const maxAttempts = 150; // 5 minutes at 2-second intervals
    let attempts = 0;

    const interval = setInterval(async () => {
      attempts++;

      try {
        const res = await fetch(`/api/notes/${id}`);
        const json = await res.json();

        if (!res.ok) {
          clearInterval(interval);
          setError(json.error || "Failed to check job status");
          setStatus("error");
          return;
        }

        if (json.status === "done") {
          clearInterval(interval);
          setNotes(json.notes);
          setStatus("done");
          return;
        }

        if (json.status === "error") {
          clearInterval(interval);
          // Surface the backend error message
          setError(json.error || "Processing failed");
          setStatus("error");
          return;
        }

        // Check timeout
        if (attempts >= maxAttempts) {
          clearInterval(interval);
          setError("Processing timeout (5 minutes exceeded)");
          setStatus("error");
          return;
        }
      } catch (err) {
        clearInterval(interval);
        setError("Network error: " + String(err).slice(0, 100));
        setStatus("error");
      }
    }, 2000);
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
