# InsightBoard Dependency Engine

Level completed: 1 (Robust Backend). Frontend Level 3 visualization scaffold included.

Overview
- Converts meeting transcripts into a validated dependency graph via an LLM.
- Validates and sanitizes hallucinated dependency IDs and detects cycles.
- Stores transcripts and generated graphs in SQLite (backend-ts/data/db.sqlite).

Tech stack
- Backend: Node.js + TypeScript + Express
- LLM: OpenAI (configurable via OPENAI_API_KEY)
- Database: SQLite (simple file persistence)
- Frontend: React (Vite) + Tailwind + React Flow (visualization)

Endpoints
- POST /api/parse
  - Body: { "transcript": "<text>" }
  - Success: 200 { graphId, transcript, transcriptId, tasks, blockedTaskIds }
  - LLM failure: 502 { error: "llm_error", message, transcriptId }

- GET /api/graph/:id
  - Returns stored graph by id.

Local setup
1. Backend
   - cd backend-ts
   - cp .env.example .env and set OPENAI_API_KEY (or add OPENAI_API_KEY in environment)
   - npm install
   - npm run dev

2. Frontend
   - cd frontend
   - npm install
   - npm run dev
   - Open http://localhost:5173 and generate graphs (frontend calls backend at http://localhost:4000)

Deployment notes
- Backend: Dockerfile and Procfile included. For persistent SQLite, deploy to Render/Railway or a VM with persistent disk.
- Frontend: Vite app can be deployed to Vercel/Netlify.
- Do NOT commit .env with secrets to Git; a `.env` exists locally in this project for testing but should be rotated before sharing.

Cycle detection
- DFS-based algorithm identifies nodes participating in cycles and marks them as `blocked` in responses.

What I can do next
- Harden deployment (Render or Vercel + Postgres), add tests, or polish frontend UI and interactions.

