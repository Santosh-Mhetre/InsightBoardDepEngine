import { v4 as uuidv4 } from "uuid";
import { Configuration, OpenAIApi } from "openai";

export type TaskItem = {
  id: string;
  description: string;
  priority: "low" | "medium" | "high";
  dependencies: string[];
  status: "ready" | "blocked";
};

export class MockAdapter {
  async extractTasks(transcript: string): Promise<TaskItem[]> {
    const lines = transcript.split("\n").map((l) => l.trim()).filter(Boolean);
    const tasks: TaskItem[] = [];
    for (let i = 0; i < Math.min(lines.length, 6); i++) {
      const tid = `t${i + 1}`;
      tasks.push({
        id: tid,
        description: lines[i].slice(0, 200),
        priority: i % 2 === 0 ? "medium" : "low",
        dependencies: i > 0 ? [`t${i}`] : [],
        status: "ready"
      });
    }
    if (tasks.length) {
      // include a hallucinated dependency to test sanitization
      tasks[0].dependencies.push("unknown_task_id");
    }
    return tasks;
  }
}

export class OpenAIAdapter {
  client: OpenAIApi;
  model: string;
  constructor(apiKey: string) {
    const conf = new Configuration({ apiKey });
    this.client = new OpenAIApi(conf);
    this.model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  }

  async extractTasks(transcript: string): Promise<TaskItem[]> {
    const prompt = `You are an assistant that extracts actionable tasks from meeting transcripts. Return ONLY a JSON array of task objects following this schema: { "id": "string", "description": "string", "priority": "low|medium|high", "dependencies": ["task-id-1"], "status": "ready|blocked" }. Transcript:\n\n${transcript}\n\nReturn JSON array only.`;
    const resp = await this.client.createChatCompletion({
      model: this.model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.0,
      max_tokens: 1500,
    } as any);
    let content = "";
    try {
      content = (resp.data.choices?.[0] as any)?.message?.content ?? (resp.data.choices?.[0] as any)?.text ?? "";
    } catch (e) {
      content = "";
    }
    // try parse
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return parsed;
      if (parsed?.tasks && Array.isArray(parsed.tasks)) return parsed.tasks;
    } catch {
      // fallback find first array
      const m = content.match(/\[[\s\S]*\]/);
      if (m) {
        try {
          return JSON.parse(m[0]);
        } catch {}
      }
    }
    return [];
  }
}

export function getAdapter() {
  const provider = (process.env.LLM_PROVIDER || "mock").toLowerCase();
  if (provider === "openai") {
    const key = process.env.OPENAI_API_KEY || process.env.LLM_API_KEY;
    if (!key) throw new Error("OPENAI_API_KEY required for openai provider");
    return new OpenAIAdapter(key);
  }
  return new MockAdapter();
}

