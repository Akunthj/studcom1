import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

type Job = { jobId: string; createdAt: number; previewTitle: string };

export default function NotesWidget() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchList();
  }, []);

  async function fetchList() {
    setLoading(true);
    try {
      const res = await fetch("/api/notes");
      const json = await res.json();
      setJobs(json.jobs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="notes-widget card">
      <div className="card-header">
        <h3>Notes</h3>
        <Link to="/notes-center" className="btn-small">Open</Link>
      </div>

      {loading ? (
        <div>Loading…</div>
      ) : (
        <div>
          {jobs.length === 0 ? (
            <div>No notes yet — create one in Notes Maker.</div>
          ) : (
            <ul className="notes-list">
              {jobs.slice(0, 5).map((j) => (
                <li key={j.jobId} className="notes-list-item">
                  <div className="title">{j.previewTitle}</div>
                  <div className="meta">
                    <small>{new Date(j.createdAt).toLocaleString()}</small>
                    <Link to={`/notes-center/${j.jobId}`} className="link">view</Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
