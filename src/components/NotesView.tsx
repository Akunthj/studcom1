import React from "react";

export default function NotesView({ notes }: { notes: any | null }) {
  if (!notes) {
    return (
      <section style={{ marginTop: 20 }}>
        <h2>Notes</h2>
        <div>No notes yet — upload a file to start.</div>
      </section>
    );
  }

  const downloadJSON = () => {
    const blob = new Blob([JSON.stringify(notes, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(notes.title || "notes").replace(/\s+/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section style={{ marginTop: 20 }}>
      <h2>Notes</h2>

      <div className="notes-card">
        <div className="notes-header">
          <h3>{notes.title || "Notes"}</h3>
          <button onClick={downloadJSON}>Download JSON</button>
        </div>

        {notes.tl_dr ? (
          <>
            <h4>tl;dr</h4>
            <p>{notes.tl_dr}</p>
          </>
        ) : null}

        {notes.summary ? (
          <>
            <h4>Summary</h4>
            <p>{notes.summary}</p>
          </>
        ) : null}

        {Array.isArray(notes.sections) && notes.sections.length > 0 ? (
          <>
            <h4>Sections</h4>
            <div>
              {notes.sections.map((s: any, i: number) => (
                <div key={i} className="section">
                  <h5>{s.heading || `Section ${i + 1}`}</h5>
                  {s.summary && <p>{s.summary}</p>}
                  {Array.isArray(s.bullets) && (
                    <ul>
                      {s.bullets.map((b: string, j: number) => (
                        <li key={j}>{b}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : null}

        {Array.isArray(notes.action_items) && notes.action_items.length > 0 && (
          <>
            <h4>Action Items</h4>
            <ul>
              {notes.action_items.map((a: string, i: number) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </>
        )}

        {Array.isArray(notes.flashcards) && notes.flashcards.length > 0 && (
          <>
            <h4>Flashcards</h4>
            <div className="flashcards">
              {notes.flashcards.map((f: any, i: number) => (
                <div key={i} className="card">
                  <strong>Q:</strong> {f.question}
                  <br />
                  <strong>A:</strong> {f.answer}
                </div>
              ))}
            </div>
          </>
        )}

        {Array.isArray(notes.questions) && notes.questions.length > 0 && (
          <>
            <h4>Questions</h4>
            <ul>
              {notes.questions.map((q: string, i: number) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
