import { TaskItem } from "./llm_adapter";

export function sanitizeAndDetect(tasks: TaskItem[]): { tasks: TaskItem[]; cycles: string[][] } {
  const ids = new Set(tasks.map((t) => t.id));
  // sanitize
  for (const t of tasks) {
    t.dependencies = (t.dependencies || []).filter((d) => ids.has(d));
  }

  const graph: Record<string, string[]> = {};
  for (const t of tasks) graph[t.id] = t.dependencies || [];

  const visited = new Set<string>();
  const recStack = new Set<string>();
  const cycles: string[][] = [];

  function dfs(node: string, path: string[]) {
    if (recStack.has(node)) {
      const idx = path.indexOf(node);
      cycles.push(path.slice(idx).concat(node));
      return;
    }
    if (visited.has(node)) return;
    visited.add(node);
    recStack.add(node);
    for (const nei of graph[node] || []) {
      dfs(nei, path.concat(nei));
    }
    recStack.delete(node);
  }

  for (const n of Object.keys(graph)) {
    if (!visited.has(n)) dfs(n, [n]);
  }

  const nodesInCycles = new Set(cycles.flat());
  for (const t of tasks) {
    if (nodesInCycles.has(t.id)) t.status = "blocked";
  }
  return { tasks, cycles };
}

