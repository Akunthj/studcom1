import React, { useState, useRef } from "react";

type Props = {
  onJobCreated: (id: string) => void;
  onPollingResult: (status: string, notes?: any) => void;
};

export default function Upload({ onJobCreated, onPollingResult }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const pollRef = useRef<number | null>(null);

  const startPolling = (jobId: string) => {
    let tries = 0;
    pollRef.current = window.setInterval(async () => {
      tries++;
      try {
        const res = await fetch(`/api/notes/${jobId}`);
        const json = await res.json();
        if (res.ok && json.status === "done") {
          window.clearInterval(pollRef.current!);
          pollRef.current = null;
          onPollingResult("done", json.notes);
        } else if (res.ok && json.status === "processing") {
          onPollingResult("processing", null);
        } else if (json.error) {
          window.clearInterval(pollRef.current!);
          pollRef.current = null;
          onPollingResult("error", null);
          setError(json.error);
        }
      } catch (err) {
        if (tries > 30) {
          window.clearInterval(pollRef.current!);
          pollRef.current = null;
          onPollingResult("error", null);
          setError("Polling timed out.");
        }
      }
    }, 2000);
  };

  const upload = async () => {
    setError(null);
    const file = inputRef.current?.files?.[0];
    if (!file) {
      setError("Choose a file first.");
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch(`/api/notes`, {
        method: "POST",
        body: fd
      });

      const json = await res.json();
      if (res.ok && json.jobId) {
        onJobCreated(json.jobId);
        startPolling(json.jobId);
      } else {
        setError(json.error || "Upload failed");
      }
    } catch (err) {
      setError("Upload request failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="upload-box">
      <input ref={inputRef} type="file" />
      <button onClick={upload} disabled={uploading}>
        {uploading ? "Uploading…" : "Upload & Generate Notes"}
      </button>
      {error && <div className="error">{error}</div>}
    </div>
  );
}
