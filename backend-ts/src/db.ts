import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = process.env.DATABASE_FILE || path.join(__dirname, "..", "data", "insightboard.sqlite");
// ensure directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(DB_PATH);

// Initialize tables
db.exec(`
CREATE TABLE IF NOT EXISTS transcripts (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  hash TEXT UNIQUE NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  transcript_id TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL,
  dependencies TEXT,
  status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  transcript_id TEXT,
  status TEXT NOT NULL,
  result TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
`);

export default db;

