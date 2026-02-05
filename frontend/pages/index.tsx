import { useState } from "react";
import FlowView from "../src/components/FlowView";

export default function Home() {
  const [text, setText] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [transcriptId, setTranscriptId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  async function submit() {
    const res = await fetch("/api/proxy/transcripts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text }),
    });
    const j = await res.json();
    setJobId(j.jobId);
    setTranscriptId(j.transcriptId);
    pollJob(j.jobId);
  }

  async function pollJob(id: string) {
    const interval = setInterval(async () => {
      const r = await fetch(`/api/proxy/jobs/${id}`);
      const body = await r.json();
      if (body.status === "completed") {
        clearInterval(interval);
        if (body.result?.tasks) setTasks(body.result.tasks);
        // fallback: fetch transcript
        if (!body.result?.tasks && transcriptId) {
          const t = await fetch(`/api/proxy/transcripts/${transcriptId}`);
          const tb = await t.json();
          setTasks(tb.tasks || []);
        }
      }
    }, 1000);
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>InsightBoard — Dependency Viewer</h1>
      <textarea
        rows={8}
        style={{ width: "100%" }}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste meeting transcript here..."
      />
      <div style={{ marginTop: 12 }}>
        <button onClick={submit}>Submit Transcript</button>
      </div>
      <div className="mt-6">
        <h2 className="text-lg font-semibold">Task Graph</h2>
        <FlowView
          tasks={tasks}
          completedIds={Array.from(completed)}
          onComplete={(id: string) => {
            setCompleted((prev) => new Set(prev).add(id));
            // unlock dependents client-side
            // recompute statuses locally for UI only
            setTasks((prev) =>
              prev.map((t) => {
                if (t.id === id) return { ...t, status: "ready" };
                const deps = t.dependencies || [];
                const allDone = deps.every((d: string) => Array.from(completed).concat([id]).includes(d));
                if (allDone && t.status !== "ready") return { ...t, status: "ready" };
                return t;
              })
            );
          }}
        />
      </div>
    </div>
  );
}

