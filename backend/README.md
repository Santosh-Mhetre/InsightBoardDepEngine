# InsightBoard Dependency Engine - Backend

This backend provides endpoints to convert transcripts into validated task DAGs.

Quick start (dev):

1. Install dependencies:

   pip install -r requirements.txt

2. Run locally:

   uvicorn app.main:app --reload --port 8000

Endpoints:
- POST /transcripts { content } -> returns jobId
- GET /jobs/{jobId}
- GET /transcripts/{id}

Notes:
- Uses a Mock LLM adapter by default. Set `LLM_PROVIDER` env var to switch adapters.
- Uses sqlite by default at `./insightboard.db`.

LLM Configuration
-----------------

Environment variables:
- LLM_PROVIDER: one of `mock` (default), `openai`, `anthropic`, `gemini`
- LLM_API_KEY: generic API key (falls back to provider-specific vars)
- OPENAI_API_KEY / ANTHROPIC_API_KEY / GEMINI_API_KEY: provider-specific keys
- OPENAI_MODEL / ANTHROPIC_MODEL: optional model names

When using a real provider, set the provider and the API key before starting the app. Example:

```bash
export LLM_PROVIDER=openai
export OPENAI_API_KEY=sk-...
uvicorn app.main:app --reload
```

The adapter will instruct the LLM to return ONLY JSON (an array of task objects). The backend still validates and sanitizes the model output.


Cycle detection
---------------

After the LLM returns tasks, the backend sanitizes dependencies (removes any dependency ID not present in the task list) and runs a DFS-based cycle detection:

- Maintain `visited` and `recursion stack` sets.
- If a node is reached that's already on the recursion stack, a cycle is reported and affected tasks are marked `blocked`.

Idempotency
----------

On POST /transcripts the server computes a SHA256 hash of the transcript text. If the same hash already exists:

- If a completed job exists for that transcript, its jobId is returned immediately (no LLM call).
- If tasks are already stored but no completed job exists, a completed job snapshot is created and returned.

This prevents duplicate LLM calls and makes submissions idempotent.


