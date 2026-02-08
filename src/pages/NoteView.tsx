import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

export default function NoteView() {
  const { id } = useParams();
  const [note, setNote] = useState<any | null>(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let cancelled = false;

    async function loadNote() {
      if (!id) return;
      try {
        const res = await fetch(`/api/notes/${id}`, { cache: 'no-cache' });
        if (!cancelled && res.ok) {
          const json = await res.json();
          setNote(json.notes);
          setStatus(json.status === "done" ? "done" : json.status || "error");
        } else if (!cancelled) {
          setStatus("error");
        }
      } catch (err) {
        if (!cancelled) {
          console.error(err);
          setStatus("error");
        }
      }
    }

    // Fetch exactly once per noteId change, no polling.
    // The cancelled flag prevents state updates if component unmounts during fetch.
    loadNote();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!id) return <div>No job selected</div>;
  if (status === "loading") return <div>Loading…</div>;
  if (status === "processing") return <div>Processing… come back soon</div>;
  if (status === "error") return <div>Error loading note</div>;

  const downloadMarkdown = () => {
    const md = [
      `# ${note.title || "Notes"}`,
      note.tl_dr ? `## tl;dr\n\n${note.tl_dr}\n` : "",
      note.summary ? `## Summary\n\n${note.summary}\n` : "",
      ...(note.sections || []).map(
        (s: any, i: number) =>
          `### ${s.heading || `Section ${i + 1}`}\n\n${s.summary || ""}\n\n${(s.bullets || [])
            .map((b: string) => `- ${b}`)
            .join("\n")}\n`
      )
    ].join("\n\n");
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(note.title || "notes").replace(/\s+/g, "_")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>{note.title}</h1>
      {note.tl_dr && (
        <section>
          <h3>tl;dr</h3>
          <p>{note.tl_dr}</p>
        </section>
      )}
      {note.summary && (
        <section>
          <h3>Summary</h3>
          <p>{note.summary}</p>
        </section>
      )}

      {Array.isArray(note.sections) &&
        note.sections.map((s: any, i: number) => (
          <article key={i} style={{ marginBottom: 12 }}>
            <h4>{s.heading}</h4>
            {s.summary && <p>{s.summary}</p>}
            {Array.isArray(s.bullets) && (
              <ul>
                {s.bullets.map((b: string, bi: number) => (
                  <li key={bi}>{b}</li>
                ))}
              </ul>
            )}
          </article>
        ))}

      <div style={{ marginTop: 12 }}>
        <button onClick={downloadMarkdown} className="btn-small">
          Export Markdown
        </button>
        <a style={{ marginLeft: 8 }} href={`/api/notes/${id}/download`} className="btn-small">
          Download JSON
        </a>
      </div>
    </div>
  );
}
