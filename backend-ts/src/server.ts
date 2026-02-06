import express from "express";
import dotenv from "dotenv";
import morgan from "morgan";
import cors from "cors";
import { initDb, saveTranscript, saveGraph, getGraph } from "./db";
import { generateTasksFromLLM } from "./llm_adapter";
import { sanitizeDependencies, detectCycles, markBlockedTasks } from "./validator";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";

dotenv.config();
const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(morgan("combined"));
app.use(cors());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

async function start() {
  await initDb();

  app.post("/api/parse", async (req, res) => {
    const { transcript } = req.body;
    if (!transcript || typeof transcript !== "string") {
      return res.status(400).json({ error: "transcript (string) required" });
    }

    // save transcript (always)
    const saved = await saveTranscript(transcript);

    try {
      // call LLM
      const rawTasks = await generateTasksFromLLM(transcript);

      // sanitize hallucinated dependency ids
      const sanitized = sanitizeDependencies(rawTasks);

      // detect cycles
      const cycleSet = detectCycles(sanitized);

      // mark blocked tasks if cycle detected
      const finalTasks = markBlockedTasks(sanitized, cycleSet);

      // persist graph
      const graphId = (await saveGraph(saved.id, JSON.stringify(finalTasks))).id;

      return res.json({
        graphId,
        transcript: saved.text,
        transcriptId: saved.id,
        tasks: finalTasks,
        blockedTaskIds: Array.from(cycleSet)
      });
    } catch (err: any) {
      console.error("LLM error:", err?.message || err);
      return res.status(502).json({
        error: "llm_error",
        message: err?.message || "LLM generation failed",
        transcriptId: saved.id
      });
    }
  });

  app.get("/api/graph/:id", async (req, res) => {
    const id = req.params.id;
    const row = await getGraph(id);
    if (!row) return res.status(404).json({ error: "not_found" });
    return res.json({
      id: row.id,
      transcriptId: row.transcript_id,
      tasks: JSON.parse(row.tasks_json),
      createdAt: row.created_at
    });
  });

  app.listen(PORT, () => {
    console.log(`Backend listening on http://localhost:${PORT}`);
  });
}

start().catch((e) => {
  console.error("Failed to start server", e);
  process.exit(1);
});

