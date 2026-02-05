import React from "react";
import ReactFlow, { MiniMap, Controls, Background } from "reactflow";
import "reactflow/dist/style.css";

function toElements(tasks: any[]) {
  const nodes = tasks.map((t, i) => ({
    id: t.id,
    data: { label: `${t.id}: ${t.description}` },
    position: { x: i * 200, y: 50 },
    style: { border: t.status === "blocked" ? "2px solid red" : "1px solid #222", padding: 8 },
  }));
  const edges = [];
  tasks.forEach((t) => {
    (t.dependencies || []).forEach((d: string) => {
      edges.push({ id: `${d}-${t.id}`, source: d, target: t.id });
    });
  });
  return { nodes, edges };
}

export default function FlowView({ tasks }: { tasks: any[] }) {
  const { nodes, edges } = toElements(tasks);
  return (
    <div style={{ height: 400, border: "1px solid #eee" }}>
      <ReactFlow nodes={nodes} edges={edges}>
        <MiniMap />
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
}

