POSTMORTEM: Repeated identical GET requests investigation

Summary:
- Problem: Clients observed repeated identical GET requests to notes endpoints.
- Work done: Added request instrumentation, added /favicon.ico handler, scanned codebase for likely causes, and prepared diagnostics and verification steps.

Immediate findings:
- Frontend contains polling logic (setInterval) in `src/components/NotesUpload.tsx` and `src/pages/NotesMaker.tsx` which poll `/api/notes/:id` while jobs are processing. This is expected behavior and will produce repeated identical GETs until job completes.
- Multiple frontend components call `/api/notes` on mount (`NotesWidget`, `NotesCenter`), which can lead to duplicate requests if multiple components mount simultaneously.
- No redirect loops were found in `server/notes/index.js`.
- No occurrences of `res.redirect()` in server code.
- Browser `favicon.ico` was not handled and could cause repeated 404 requests; added a 204 handler.

Evidence:
- See `diagnostics/candidates.txt` for list of matches and notes.
- The server could not be started inside the diagnostic environment due to dependency installation failure (see `diagnostics/reproduce.log` for npm errors). This prevented live instrumented captures here.

Code changes (high-level):
- Added request logger middleware to `server/notes/index.js` to log a unique request id and request/response details.
- Added a `GET /favicon.ico` handler returning 204 to avoid repeated browser favicon requests.
- Recorded search candidates in `diagnostics/candidates.txt`.

Why these changes help:
- The request logger provides a reliable way to correlate client actions to server logs and determine whether duplicated requests originate from the client (polling/multiple components) or are reissued by middleware or proxies.
- The favicon handler eliminates a common source of repeated 404 traffic.

Next steps & recommendations:
1. Run the instrumented server in the production environment or a local dev environment where dependencies install successfully and reproduce the issue. Capture 60–120s of logs for correlation.
2. If duplicated requests are caused by client polling: add debounce, single shared poller, or switch to server-sent events / websockets to avoid repeated GET traffic.
3. If multiple frontend components fetch the same resource on mount, centralize fetching or use a shared context/provider to avoid duplicate simultaneous requests.
4. If traffic stems from load balancer probes or reverse-proxy misconfiguration, move healthchecks to `/healthz` and adjust probe path and frequency.
5. Consider adding rate-limiting middleware for a short-term mitigation.

Risks:
- Adding the request logger increases verbosity in logs; keep it gated (e.g., only on debug mode) for long-term production.
- Rate-limiting may mask root causes; use it as a mitigation not a fix.

If you want, I can:
- Re-run the instrumentation after fixing the `npm install` issue in `server/`.
- Implement a minimal frontend change to centralize polling and add cleanup in `useEffect`.

