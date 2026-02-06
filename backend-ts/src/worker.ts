import db from "./db";
import { getAdapter, TaskItem } from "./llm_adapter";
import { sanitizeAndDetect } from "./validator";
import { v4 as uuidv4 } from "uuid";

export function enqueueProcess(transcriptId: string, jobId: string) {
  // lightweight background processing using setImmediate
  setImmediate(() => {
    void processTranscript(transcriptId, jobId);
  });
}

export async function processTranscript(transcriptId: string, jobId: string) {
  try {
    const row = db.prepare("SELECT * FROM transcripts WHERE id = ?").get(transcriptId);
    if (!row) {
      db.prepare("UPDATE jobs SET status = ?, result = ? WHERE id = ?").run("failed", "Transcript not found", jobId);
      return;
    }
    const adapter = getAdapter();
    const raw = await adapter.extractTasks(row.content);
    // validate basic shape
    const validated: TaskItem[] = [];
    for (const item of raw) {
      if (typeof item.id === "string" && typeof item.description === "string" && ["low", "medium", "high"].includes(item.priority)) {
        validated.push(item);
      }
    }
    const { tasks, cycles } = sanitizeAndDetect(validated);
    const insertTask = db.prepare("INSERT OR REPLACE INTO tasks (id, transcript_id, description, priority, dependencies, status) VALUES (?, ?, ?, ?, ?, ?)");
    const insertMany = db.transaction((tlist: TaskItem[]) => {
      for (const t of tlist) {
        insertTask.run(t.id, transcriptId, t.description, t.priority, JSON.stringify(t.dependencies || []), t.status);
      }
    });
    insertMany(tasks);
    const result = { tasks, cycles };
    db.prepare("UPDATE jobs SET status = ?, result = ? WHERE id = ?").run("completed", JSON.stringify(result), jobId);
  } catch (e: any) {
    db.prepare("UPDATE jobs SET status = ?, result = ? WHERE id = ?").run("failed", String(e.message || e), jobId);
  }
}

