import React, { useMemo } from "react";
import ReactFlow, { MiniMap, Controls, Background, Node, Edge } from "reactflow";
import "reactflow/dist/style.css";

function toElements(tasks: any[], completed: Set<string>) {
  const nodes: Node[] = tasks.map((t: any, i: number) => {
    const blocked = t.status === "blocked";
    const done = completed.has(t.id);
    const allDepsDone = (t.dependencies || []).every((d: string) => completed.has(d));
    const bg = done ? "bg-green-500" : blocked ? "bg-red-500" : allDepsDone ? "bg-emerald-300" : "bg-gray-200";
    return {
      id: t.id,
      data: { label: `${t.id}: ${t.description}` },
      position: { x: (i % 5) * 220, y: Math.floor(i / 5) * 120 },
      style: { padding: 8 },
      className: `${bg} p-2 rounded shadow`,
    } as Node;
  });
  const edges: Edge[] = [];
  tasks.forEach((t: any) => {
    (t.dependencies || []).forEach((d: string) => {
      edges.push({ id: `${d}-${t.id}`, source: d, target: t.id });
    });
  });
  return { nodes, edges };
}

export default function FlowView({
  tasks,
  onComplete,
  completedIds,
}: {
  tasks: any[];
  onComplete: (id: string) => void;
  completedIds: string[];
}) {
  const completed = useMemo(() => new Set(completedIds || []), [completedIds]);
  const { nodes, edges } = toElements(tasks || [], completed);

  return (
    <div className="h-[420px] border rounded">
      <ReactFlow nodes={nodes} edges={edges} onNodeClick={(_, node) => onComplete(node.id)}>
        <MiniMap />
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
}

