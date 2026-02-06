import express from "express";
import bodyParser from "body-parser";
import crypto from "crypto";
import db from "./db";
import { v4 as uuidv4 } from "uuid";
import { enqueueProcess } from "./worker";

const app = express();
app.use(bodyParser.json());

// POST /transcripts
app.post("/transcripts", (req, res) => {
  const content = (req.body?.content || "").trim();
  if (!content) return res.status(400).json({ detail: "Transcript content is empty" });
  const hash = crypto.createHash("sha256").update(content, "utf8").digest("hex");
  const existing = db.prepare("SELECT * FROM transcripts WHERE hash = ?").get(hash);
  if (existing) {
    // if a completed job exists, return it
    const completedJob = db.prepare("SELECT * FROM jobs WHERE transcript_id = ? AND status = 'completed'").get(existing.id);
    if (completedJob) {
      return res.json({ jobId: completedJob.id, transcriptId: existing.id, cached: true });
    }
    const tasks = db.prepare("SELECT id, description, priority, dependencies, status FROM tasks WHERE transcript_id = ?").all(existing.id);
    if (tasks && tasks.length) {
      const jobId = uuidv4();
      const result = { tasks: tasks.map((t: any) => ({ id: t.id, description: t.description, priority: t.priority, dependencies: JSON.parse(t.dependencies || "[]"), status: t.status })), cycles: [] };
      db.prepare("INSERT INTO jobs (id, transcript_id, status, result) VALUES (?, ?, ?, ?)").run(jobId, existing.id, "completed", JSON.stringify(result));
      return res.json({ jobId, transcriptId: existing.id, cached: true });
    }
    // otherwise create job and enqueue processing
    const jobId = uuidv4();
    db.prepare("INSERT INTO jobs (id, transcript_id, status) VALUES (?, ?, ?)").run(jobId, existing.id, "pending");
    enqueueProcess(existing.id, jobId);
    return res.json({ jobId, transcriptId: existing.id, cached: false });
  }
  const id = uuidv4();
  db.prepare("INSERT INTO transcripts (id, content, hash) VALUES (?, ?, ?)").run(id, content, hash);
  const jobId = uuidv4();
  db.prepare("INSERT INTO jobs (id, transcript_id, status) VALUES (?, ?, ?)").run(jobId, id, "pending");
  enqueueProcess(id, jobId);
  return res.json({ jobId, transcriptId: id, cached: false });
});

// GET /jobs/:id
app.get("/jobs/:id", (req, res) => {
  const job = db.prepare("SELECT * FROM jobs WHERE id = ?").get(req.params.id);
  if (!job) return res.status(404).json({ detail: "Job not found" });
  let parsed = job.result;
  try { parsed = job.result ? JSON.parse(job.result) : null; } catch (e) { parsed = job.result; }
  return res.json({ id: job.id, status: job.status, transcript_id: job.transcript_id, result: parsed });
});

// GET /transcripts/:id
app.get("/transcripts/:id", (req, res) => {
  const t = db.prepare("SELECT * FROM transcripts WHERE id = ?").get(req.params.id);
  if (!t) return res.status(404).json({ detail: "Transcript not found" });
  const tasks = db.prepare("SELECT * FROM tasks WHERE transcript_id = ?").all(req.params.id);
  const task_list = tasks.map((task: any) => ({ id: task.id, description: task.description, priority: task.priority, dependencies: JSON.parse(task.dependencies || "[]"), status: task.status }));
  return res.json({ id: t.id, content: t.content, created_at: t.created_at, tasks: task_list });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

