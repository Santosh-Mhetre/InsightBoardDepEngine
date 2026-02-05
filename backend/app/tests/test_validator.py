from app.validator import sanitize_and_detect

def test_sanitize_removes_unknown_deps():
    tasks = [
        {"id": "a", "dependencies": ["b", "x"], "status": "ready", "description": "A", "priority": "low"},
        {"id": "b", "dependencies": [], "status": "ready", "description": "B", "priority": "low"},
    ]
    sanitized, cycles = sanitize_and_detect(tasks)
    assert all("x" not in t.get("dependencies", []) for t in sanitized)
    assert cycles == []


def test_detects_cycle_and_marks_blocked():
    tasks = [
        {"id": "a", "dependencies": ["b"], "status": "ready", "description": "A", "priority": "low"},
        {"id": "b", "dependencies": ["a"], "status": "ready", "description": "B", "priority": "low"},
    ]
    sanitized, cycles = sanitize_and_detect(tasks)
    assert len(cycles) >= 1
    ids_blocked = {t["id"] for t in sanitized if t["status"] == "blocked"}
    assert ids_blocked == {"a", "b"}

