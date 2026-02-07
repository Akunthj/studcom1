import React, { useState } from "react";
import NotesUpload from "./components/NotesUpload";
import NotesView from "./components/NotesView";

export default function NotesApp() {
  const [notesData, setNotesData] = useState<any | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  return (
    <div className="app">
      <header>
        <h1>Notes Maker</h1>
        <p>Upload a file and get structured notes (Gemini-powered)</p>
      </header>

      <main>
        <NotesUpload
          onJobCreated={(id) => {
            setJobId(id);
            setStatus("processing");
            setNotesData(null);
          }}
          onPollingResult={(s, notes) => {
            setStatus(s);
            if (notes) setNotesData(notes);
          }}
        />

        <section style={{ marginTop: 20 }}>
          <h2>Job status</h2>
          <div>
            <strong>Job ID:</strong> {jobId ?? "—"}
          </div>
          <div>
            <strong>Status:</strong> {status ?? "idle"}
          </div>
        </section>

        <NotesView notes={notesData} />
      </main>

      <footer>
        <small>Backend must be running at http://localhost:4000</small>
      </footer>
    </div>
  );
}
