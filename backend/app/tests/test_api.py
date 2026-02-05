import time
from fastapi.testclient import TestClient
from app.main import app
from app import llm_adapter


def test_sanitization_and_completion():
    client = TestClient(app)
    # Use mock adapter (default) which appends an unknown dependency
    resp = client.post("/transcripts", json={"content": "Task one\nTask two"})
    assert resp.status_code == 200
    data = resp.json()
    job_id = data["jobId"]
    transcript_id = data["transcriptId"]

    # poll for completion
    for _ in range(20):
        r = client.get(f"/jobs/{job_id}")
        assert r.status_code == 200
        if r.json().get("status") == "completed":
            break
        time.sleep(0.1)
    assert r.json().get("status") == "completed"

    # fetch tasks and ensure unknown dependency was removed
    t = client.get(f"/transcripts/{transcript_id}")
    assert t.status_code == 200
    tasks = t.json().get("tasks", [])
    for task in tasks:
        assert "unknown_task_id" not in task.get("dependencies", [])


def test_cycle_detection(monkeypatch):
    class CycleAdapter:
        def extract_tasks(self, transcript_text: str):
            return [
                {"id": "a", "description": "A", "priority": "low", "dependencies": ["b"], "status": "ready"},
                {"id": "b", "description": "B", "priority": "low", "dependencies": ["a"], "status": "ready"},
            ]

    monkeypatch.setattr(llm_adapter, "get_adapter", lambda: CycleAdapter())
    client = TestClient(app)
    resp = client.post("/transcripts", json={"content": "cycle test"})
    assert resp.status_code == 200
    job_id = resp.json()["jobId"]
    transcript_id = resp.json()["transcriptId"]

    for _ in range(20):
        r = client.get(f"/jobs/{job_id}")
        if r.json().get("status") == "completed":
            break
        time.sleep(0.1)
    assert r.json().get("status") == "completed"

    res = client.get(f"/transcripts/{transcript_id}")
    tasks = res.json().get("tasks", [])
    blocked = {t["id"] for t in tasks if t["status"] == "blocked"}
    assert blocked == {"a", "b"}

