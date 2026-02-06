export type Task = {
  id: string;
  description: string;
  priority?: string | number;
  dependencies: string[];
  status?: "ready" | "blocked" | "error";
};

export type GeneratedGraph = {
  id: string;
  tasks: Task[];
  createdAt: string;
};
