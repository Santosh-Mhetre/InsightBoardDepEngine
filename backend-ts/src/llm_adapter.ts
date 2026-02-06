import axios from "axios";
import { z } from "zod";
import { Task } from "./types";

const TaskSchema = z.object({
  id: z.string(),
  description: z.string(),
  priority: z.union([z.string(), z.number()]).optional(),
  dependencies: z.array(z.string()).optional()
});

const ResponseSchema = z.array(TaskSchema);

export async function generateTasksFromLLM(transcript: string): Promise<Task[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  const system = `You are a JSON-only assistant. Given a meeting transcript, return a JSON array of task objects.
Each task object must have:
- id (short unique id, e.g., T1, T2)
- description (string)
- priority (optional)
- dependencies (array of ids)
Return ONLY the JSON array, nothing else.`;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not set");
  }

  const payload = {
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: system },
      { role: "user", content: transcript }
    ],
    temperature: 0.0,
    max_tokens: 800
  };

  const res = await axios.post("https://api.openai.com/v1/chat/completions", payload, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    timeout: 60_000
  });

  const text = res.data?.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error("LLM returned empty response");
  }

  // Try to extract JSON
  const json = extractJson(text);
  const parsed = ResponseSchema.parse(json);
  // normalize dependencies
  return parsed.map((p) => ({
    id: p.id,
    description: p.description,
    priority: p.priority,
    dependencies: p.dependencies || []
  }));
}

function extractJson(text: string) {
  const first = text.indexOf("[");
  const last = text.lastIndexOf("]");
  if (first === -1 || last === -1) throw new Error("No JSON array found in LLM response");
  const sub = text.slice(first, last + 1);
  try {
    return JSON.parse(sub);
  } catch (e) {
    throw new Error("Failed to parse JSON from LLM response: " + (e as Error).message);
  }
}
