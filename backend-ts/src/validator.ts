import { Task } from "./types";

// remove dependencies that reference non-existent ids or self-dependencies
export function sanitizeDependencies(tasks: Task[]): Task[] {
  const ids = new Set(tasks.map((t) => t.id));
  return tasks.map((t) => {
    const deps = (t.dependencies || []).filter(
      (d) => d && d !== t.id && ids.has(d)
    );
    return { ...t, dependencies: deps };
  });
}

// returns set of task ids that are part of a cycle
export function detectCycles(tasks: Task[]): Set<string> {
  const adj = new Map<string, string[]>();
  for (const t of tasks) {
    adj.set(t.id, t.dependencies || []);
  }

  const visited = new Set<string>();
  const inCycle = new Set<string>();

  const stack: string[] = [];

  function dfs(node: string) {
    visited.add(node);
    stack.push(node);
    const neighbors = adj.get(node) || [];
    for (const nb of neighbors) {
      if (!adj.has(nb)) continue; // ignore missing nodes (sanitization should handle this)
      if (!visited.has(nb)) {
        dfs(nb);
      } else {
        // if neighbor is on stack, we've found a back-edge -> cycle
        const idx = stack.indexOf(nb);
        if (idx !== -1) {
          for (let i = idx; i < stack.length; i++) {
            inCycle.add(stack[i]);
          }
        }
      }
    }
    stack.pop();
  }

  for (const id of adj.keys()) {
    if (!visited.has(id)) dfs(id);
  }

  return inCycle;
}

export function markBlockedTasks(tasks: Task[], blockedIds: Set<string>) {
  return tasks.map((t) => {
    if (blockedIds.has(t.id)) {
      return { ...t, status: "blocked" as const };
    }
    return { ...t, status: t.status || "ready" };
  });
}
