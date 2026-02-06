# InsightBoard — Dependency Engine (Backend)

Level: 1 (Required) — Robust Backend

Overview
- Converts meeting transcripts into a validated dependency graph using an LLM.
- Ensures data integrity: sanitizes hallucinated dependency IDs and detects cycles.
- Stores original transcript and generated graph in SQLite.

Endpoints
- POST /api/parse
  - Body: { "transcript": "<text>" }
  - Success: 200 JSON { graphId, transcript, transcriptId, tasks, blockedTaskIds }
  - LLM errors: 502 JSON { error: "llm_error", message, transcriptId }

- GET /api/graph/:id
  - Returns stored graph by id.

- GET /api/health
  - Simple health check.

Local dev
1. Install deps
   npm install
2. Copy .env.example -> .env and set OPENAI_API_KEY
3. Dev server
   npm run dev

Production
- Build: `npm run build`
- Start: `npm run start` (or use the included Dockerfile / Procfile)
- Ensure `.env` has OPENAI_API_KEY and PORT set on host.

Design notes
- Strict schema: Zod validates each task has `id`, `description`, optional `priority`, and `dependencies` array.
- Sanitization: backend removes dependencies referencing missing IDs and self-dependencies.
- Cycle detection: DFS-based detection collects nodes participating in cycles and marks them as `blocked` in the returned tasks.

Deployment
- This repo includes a `Dockerfile` compatible with Render / Docker-based hosts and a `Procfile` for Heroku.
- SQLite is used for persistence. On some hosts ensure a persistent filesystem or use a managed DB if needed.

