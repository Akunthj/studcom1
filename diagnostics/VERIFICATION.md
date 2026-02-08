Verification steps to reproduce and verify the repeated-GET investigation

Prerequisites:
- Ensure server dependencies installed in `server/` (run `npm install` in server/)
- Ensure `server/.env` contains a valid `GOOGLE_API_KEY`

Start server (no nodemon):

```bash
cd server
npm run start-no-nodemon
# or
node notes/index.js
```

1) Reproduce initial behavior (pre-instrumentation):

# In a separate terminal, trigger endpoints
curl -v http://localhost:4000/api/notes
curl -v http://localhost:4000/
curl -v http://localhost:4000/favicon.ico

Observe server logs for repeated identical GET entries.

2) Instrumented run (what we committed):
- The server now logs each request with a request id and response details.
- To reproduce and capture logs:

```bash
# Start server
cd server
npm run start-no-nodemon &
# Wait a few seconds for server startup
# Trigger requests
curl -v http://localhost:4000/api/notes
curl -v http://localhost:4000/
curl -v http://localhost:4000/favicon.ico

# Server output will include [REQ] and [RES] lines with request ids
```

Expected: Each client action should produce a single `[REQ]` and `[RES]` pair with matching request id. If multiple `[REQ]` lines appear for a single client action, consult the frontend polling logic and any reverse-proxy health checks.

Notes about environment failure during automated run:
- Automated dependency installation failed due to `node-fetch@^3.4.2` not available in registry for this environment. Install dependencies locally and rerun the reproduction steps.

If you need me to run the instrumented reproduction here after dependencies are fixed, I can do that and attach `diagnostics/instrumented.log` and `diagnostics/reproduce.log`.
