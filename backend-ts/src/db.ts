import fs from "fs";
import path from "path";
import sqlite3 from "sqlite3";
import { open, Database } from "sqlite";
import { v4 as uuidv4 } from "uuid";

const DATA_DIR = path.join(__dirname, "..", "data");
const DB_PATH = path.join(DATA_DIR, "db.sqlite");

let db: Database<sqlite3.Database, sqlite3.Statement>;

export async function initDb() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS transcripts (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS graphs (
      id TEXT PRIMARY KEY,
      transcript_id TEXT NOT NULL,
      tasks_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (transcript_id) REFERENCES transcripts(id)
    );
  `);
}

export async function saveTranscript(text: string) {
  const id = uuidv4();
  const created_at = new Date().toISOString();
  await db.run(
    `INSERT INTO transcripts (id, text, created_at) VALUES (?, ?, ?)`,
    id,
    text,
    created_at
  );
  return { id, text, created_at };
}

export async function saveGraph(transcriptId: string, tasksJson: string) {
  const id = uuidv4();
  const created_at = new Date().toISOString();
  await db.run(
    `INSERT INTO graphs (id, transcript_id, tasks_json, created_at) VALUES (?, ?, ?, ?)`,
    id,
    transcriptId,
    tasksJson,
    created_at
  );
  return { id, transcriptId, tasksJson, created_at };
}

export async function getGraph(id: string) {
  const row = await db.get(`SELECT * FROM graphs WHERE id = ?`, id);
  return row;
}

export async function getTranscript(id: string) {
  const row = await db.get(`SELECT * FROM transcripts WHERE id = ?`, id);
  return row;
}
