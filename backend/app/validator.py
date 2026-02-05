from typing import List, Dict, Tuple

def sanitize_and_detect(tasks: List[Dict]) -> Tuple[List[Dict], List[List[str]]]:
    """Remove dependencies that don't exist and detect cycles.

    Returns (sanitized_tasks, cycles)
    """
    ids = {t["id"] for t in tasks}
    # sanitize
    for t in tasks:
        deps = t.get("dependencies", []) or []
        t["dependencies"] = [d for d in deps if d in ids]

    # build adjacency
    graph = {t["id"]: t.get("dependencies", []) for t in tasks}

    visited = set()
    rec_stack = set()
    cycles = []

    def dfs(node, path):
        if node in rec_stack:
            # found cycle; record it
            try:
                idx = path.index(node)
                cycles.append(path[idx:] + [node])
            except ValueError:
                cycles.append(path + [node])
            return
        if node in visited:
            return
        visited.add(node)
        rec_stack.add(node)
        for nei in graph.get(node, []):
            dfs(nei, path + [nei])
        rec_stack.remove(node)

    for n in graph:
        if n not in visited:
            dfs(n, [n])

    # mark tasks involved in cycles as blocked
    nodes_in_cycles = {node for cycle in cycles for node in cycle}
    for t in tasks:
        if t["id"] in nodes_in_cycles:
            t["status"] = "blocked"
    return tasks, cycles

