import os
import json
import uuid
from typing import List

PROVIDER = os.environ.get("LLM_PROVIDER", "mock")


class MockAdapter:
    def extract_tasks(self, transcript_text: str) -> List[dict]:
        # Very simple mock: split transcript into lines and produce tasks
        lines = [l.strip() for l in transcript_text.splitlines() if l.strip()]
        tasks = []
        # create up to 5 tasks
        for i, line in enumerate(lines[:5]):
            tid = f"t{i+1}"
            tasks.append(
                {
                    "id": tid,
                    "description": line[:200],
                    "priority": "medium" if i % 2 == 0 else "low",
                    "dependencies": [f"t{i}"] if i > 0 else [],
                    "status": "ready",
                }
            )
        # Intentionally include a hallucinated dependency to test sanitization
        if tasks:
            tasks[0]["dependencies"].append("unknown_task_id")
        return tasks


class OpenAIAdapter:
    def __init__(self, api_key: str, model: str = None):
        try:
            import openai
        except Exception as e:
            raise RuntimeError("openai package is not installed. Install it to use OpenAIAdapter") from e
        self.openai = openai
        self.api_key = api_key
        self.model = model or os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
        self.openai.api_key = api_key

    def _build_prompt(self, transcript: str) -> str:
        return (
            "You are an assistant that extracts actionable tasks from meeting transcripts. "
            "Return ONLY a JSON array of task objects. No markdown, no commentary.\n\n"
            "Task schema for each item:\n"
            '{ "id": "string", "description": "string", "priority": "low|medium|high", '
            '"dependencies": ["task-id-1", ...], "status": "ready|blocked" }\n\n'
            "Transcript:\n\n"
            f"{transcript}\n\n"
            "Respond with a JSON array only."
        )

    def extract_tasks(self, transcript_text: str) -> List[dict]:
        prompt = self._build_prompt(transcript_text)
        resp = self.openai.ChatCompletion.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.0,
        )
        content = ""
        try:
            # compatible with various OpenAI response shapes
            content = resp["choices"][0]["message"]["content"]
        except Exception:
            content = resp.get("choices", [{}])[0].get("text", "")
        return _parse_json_from_string(content)
def _parse_json_from_string(s: str) -> List[dict]:
    s = s.strip()
    # Try direct parse
    try:
        parsed = json.loads(s)
        if isinstance(parsed, list):
            return parsed
        # if the model returned an object with a top-level 'tasks' key
        if isinstance(parsed, dict) and "tasks" in parsed and isinstance(parsed["tasks"], list):
            return parsed["tasks"]
    except Exception:
        pass
    # Fallback: extract first JSON array substring
    import re

    m = re.search(r"(\[\\s*\\{[\\s\\S]*?\\}\\s*\\])", s)
    if m:
        try:
            return json.loads(m.group(1))
        except Exception:
            pass
    # try find first '[' and last ']' and parse between
    try:
        start = s.index("[")
        end = s.rindex("]") + 1
        return json.loads(s[start:end])
    except Exception:
        pass
    # give up defensively
    return []


def get_adapter():
    prov = os.environ.get("LLM_PROVIDER", PROVIDER).lower()
    if prov == "openai":
        key = os.environ.get("OPENAI_API_KEY") or os.environ.get("LLM_API_KEY")
        if not key:
            raise RuntimeError("OPENAI_API_KEY or LLM_API_KEY required for OpenAI provider")
        return OpenAIAdapter(api_key=key)
    # default to mock
    return MockAdapter()

