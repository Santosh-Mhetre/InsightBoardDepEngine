# InsightBoard Dependency Engine — Repository

This repository contains the backend for the InsightBoard Dependency Engine take-home assignment.

Status
- Level completed: Level 1 and Level 2 (basic async via BackgroundTasks and idempotency). Level 3 frontend is optional.
- Backend: FastAPI, Python, SQLite
- LLM: pluggable adapters (Mock by default; OpenAI/Anthropic adapters present)

Local dev
1. Create venv and install:
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r backend/requirements.txt
2. Run server:
   cd backend
   uvicorn app.main:app --reload --port 8000
3. Open http://localhost:8000/docs

Deployment (Render)
- A sample `backend/render.yaml` is included. Connect a GitHub repo to Render and use that file or create a Web Service using the Dockerfile.
- Env vars to set on Render:
  - LLM_PROVIDER=mock
  - (later) OPENAI_API_KEY or ANTHROPIC_API_KEY when switching to real provider
  - (optional) CELERY_BROKER_URL if you enable Celery+Redis

CI
- GitHub Actions workflow runs unit tests in `backend` on push and PRs.

Notes
- The repository will accept a provider API key later and switch adapters without code changes.
- See `backend/README.md` for backend-specific details.

# InsightBoardDepEngine
