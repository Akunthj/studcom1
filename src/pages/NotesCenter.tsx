import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

type JobMeta = { jobId: string; createdAt: number; previewTitle: string };

export default function NotesCenter() {
  const [jobs, setJobs] = useState<JobMeta[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchJobs();
  }, []);

  async function fetchJobs() {
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
    <div style={{ padding: 20 }}>
      <h1>Notes Center</h1>
      <Link to="/notes" className="btn-small">Create New Notes</Link>
      <div style={{ marginTop: 12 }}>
        {loading ? (
          <div>Loading…</div>
        ) : jobs.length === 0 ? (
          <div>No jobs found.</div>
        ) : (
          <div>
            {jobs.map((j) => (
              <div
                key={j.jobId}
                className="notes-row"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 0",
                  borderBottom: "1px solid #eee"
                }}
              >
                <div>
                  <strong>{j.previewTitle}</strong>
                  <div>
                    <small>{new Date(j.createdAt).toLocaleString()}</small>
                  </div>
                </div>
                <div>
                  <Link to={`/notes-center/${j.jobId}`} className="btn-small">
                    Open
                  </Link>
                  <a
                    href={`/api/notes/${j.jobId}/download`}
                    className="btn-small"
                    style={{ marginLeft: 8 }}
                  >
                    Download JSON
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
