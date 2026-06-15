import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createRequire } from "node:module";
import type * as SqliteNS from "node:sqlite";
import type { PlayerState } from "./store.js";

// Load the experimental builtin at runtime via an indirect specifier so bundlers
// (vite/vitest) don't try to statically resolve it. Requires --experimental-sqlite.
const nodeRequire = createRequire(import.meta.url);
const sqliteSpecifier = "node:sqlite";
const { DatabaseSync } = nodeRequire(sqliteSpecifier) as typeof SqliteNS;
type Database = InstanceType<typeof SqliteNS.DatabaseSync>;

/**
 * Durable storage via Node's built-in SQLite (no native deps).
 * Run with NODE_OPTIONS=--experimental-sqlite (wired into package scripts).
 * Player state is stored as a JSON blob keyed by id — simple and schema-light
 * for the prototype; we can normalise later if we need server-side queries.
 */
const DB_PATH = process.env.CC_DB_PATH ?? "data/cc.sqlite";

function openDb(): Database {
  if (DB_PATH !== ":memory:") {
    mkdirSync(dirname(DB_PATH), { recursive: true });
  }
  const db = new DatabaseSync(DB_PATH);
  db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id      TEXT PRIMARY KEY,
      data    TEXT NOT NULL,
      updated INTEGER NOT NULL
    );
  `);
  return db;
}

const db = openDb();

const upsertStmt = db.prepare(
  `INSERT INTO players (id, data, updated) VALUES (?, ?, ?)
   ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated = excluded.updated`,
);
const allStmt = db.prepare(`SELECT data FROM players`);
const deleteStmt = db.prepare(`DELETE FROM players WHERE id = ?`);
const clearStmt = db.prepare(`DELETE FROM players`);

export function dbUpsert(p: PlayerState): void {
  upsertStmt.run(p.id, JSON.stringify(p), Date.now());
}

export function dbLoadAll(): PlayerState[] {
  const rows = allStmt.all() as { data: string }[];
  return rows.map((r) => JSON.parse(r.data) as PlayerState);
}

export function dbDelete(id: string): void {
  deleteStmt.run(id);
}

export function dbClear(): void {
  clearStmt.run();
}
