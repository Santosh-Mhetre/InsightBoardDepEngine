import React, { useCallback, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  addEdge,
  useNodesState,
  useEdgesState
} from "react-flow-renderer";

type Task = {
  id: string;
  description: string;
  dependencies: string[];
  status?: string;
};

function toNodesAndEdges(tasks: Task[]) {
  const nodes: Node[] = tasks.map((t, i) => ({
    id: t.id,
    data: { label: `${t.id}: ${t.description}`, status: t.status || "ready" },
    position: { x: (i % 3) * 260, y: Math.floor(i / 3) * 140 },
    style: {
      padding: 12,
      borderRadius: 10,
      background: "#fff",
      boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
      border: t.status === "blocked" ? "2px solid #f87171" : t.status === "completed" ? "2px solid #9ca3af" : "2px solid #10b981"
    }
  }));

  const edges = tasks.flatMap((t) =>
    t.dependencies.map((d) => ({
      id: `${d}-${t.id}`,
      source: d,
      target: t.id,
      animated: false
    }))
  );

  return { nodes, edges };
}

export default function GraphView({ tasks }: { tasks: Task[] }) {
  if (!tasks || tasks.length === 0) {
    return <div className="p-6 text-center text-gray-500">No tasks yet — generate a graph from a transcript.</div>;
  }

  const { nodes: initialNodes, edges: initialEdges } = toNodesAndEdges(tasks);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const onNodeClick = useCallback((event, node) => {
    // dispatch a custom event so parent can handle completion toggle
    const custom = new CustomEvent("toggleComplete", { detail: node.id });
    window.dispatchEvent(custom);
  }, []);

  return (
    <div style={{ height: 560, border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick as any}
      >
        <Background gap={16} />
        <MiniMap />
        <Controls />
      </ReactFlow>
    </div>
  );
}

