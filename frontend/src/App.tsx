import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import GraphView from "./components/GraphView";

type Task = {
  id: string;
  description: string;
  priority?: string | number;
  dependencies: string[];
  status?: string;
};

export default function App() {
  const [transcript, setTranscript] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [view, setView] = useState<"graph" | "list">("graph");

  useEffect(() => {}, []);

  async function generate() {
    setError(null);
    if (!transcript.trim()) {
      setError("Please paste a meeting transcript before generating.");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post("http://localhost:4000/api/parse", {
        transcript
      }, { timeout: 30000 });
      setTasks(res.data.tasks || []);
      setCompleted(new Set()); // reset completed state for new graph
    } catch (e: any) {
      if (e.response) {
        // server responded with non-2xx
        setError(`API error: ${e.response.status} ${e.response.data?.error || e.response.statusText}`);
      } else if (e.request) {
        // no response received
        setError("Failed to connect to backend. Is the backend running at http://localhost:4000 ?");
      } else {
        setError("Unexpected error: " + e.message);
      }
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }

  // compute statuses based on completed set
  const tasksWithStatus = useMemo(() => {
    const completedSet = new Set(completed);
    return tasks.map((t) => {
      if (completedSet.has(t.id)) return { ...t, status: "completed" };
      const deps = t.dependencies || [];
      const ready = deps.every((d) => completedSet.has(d));
      return { ...t, status: ready ? "ready" : "blocked" };
    });
  }, [tasks, completed]);

  function toggleComplete(id: string) {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">InsightBoard — Dependency Graph</h1>
          <div className="text-sm text-gray-600">Interactive visualization — click nodes to toggle complete</div>
        </header>

        <textarea
          className="w-full p-3 border rounded mb-2 text-sm resize-y"
          rows={6}
          placeholder="Paste meeting transcript here (no mock data)."
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
        />
        <div className="flex gap-2 mb-4">
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded"
            onClick={generate}
            disabled={loading}
          >
            {loading ? "Generating..." : "Generate Graph"}
          </button>
          <div className="ml-auto flex gap-2 items-center">
            <button
              onClick={() => setView("graph")}
              className={`px-3 py-1 rounded ${view === "graph" ? "bg-blue-600 text-white" : "bg-white border"}`}
            >
              Graph
            </button>
            <button
              onClick={() => setView("list")}
              className={`px-3 py-1 rounded ${view === "list" ? "bg-blue-600 text-white" : "bg-white border"}`}
            >
              List
            </button>
          </div>
        </div>
        {error && <div className="mb-4 p-3 bg-red-100 text-red-800 rounded">{error}</div>}
        <div className="mb-4 flex gap-3">
          <div className="px-3 py-2 rounded bg-white border text-sm">
            <span className="inline-block w-3 h-3 bg-green-400 mr-2 align-middle rounded" /> Ready
          </div>
          <div className="px-3 py-2 rounded bg-white border text-sm">
            <span className="inline-block w-3 h-3 bg-red-400 mr-2 align-middle rounded" /> Blocked
          </div>
          <div className="px-3 py-2 rounded bg-white border text-sm">
            <span className="inline-block w-3 h-3 bg-gray-400 mr-2 align-middle rounded" /> Completed
          </div>
        </div>

        {view === "graph" ? (
          <GraphView tasks={tasksWithStatus} onToggleComplete={toggleComplete} />
        ) : (
          <div className="bg-white p-4 rounded border">
            {tasksWithStatus.length === 0 ? (
              <div className="text-gray-500">No tasks yet — generate a graph from a transcript.</div>
            ) : (
              <ul className="space-y-3">
                {tasksWithStatus.map((t) => (
                  <li key={t.id} className="p-3 border rounded flex items-start justify-between">
                    <div>
                      <div className="font-medium">
                        {t.id} — {t.description}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">Depends on: {t.dependencies.join(", ") || "—"}</div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="text-sm">
                        <span className={`px-2 py-1 rounded text-white text-xs ${t.status === "ready" ? "bg-green-500" : t.status === "blocked" ? "bg-red-500" : "bg-gray-500"}`}>
                          {t.status}
                        </span>
                      </div>
                      <button
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
                        onClick={() => toggleComplete(t.id)}
                      >
                        {t.status === "completed" ? "Undo" : "Complete"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

