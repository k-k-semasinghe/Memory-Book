import * as SQLite from 'expo-sqlite';

import { DEFAULT_CATEGORIES } from '../constants/categories';
import { nowIso } from '../utils/dates';
import { parseStringArray } from '../utils/json';
import { FTS_SQL, INDEX_SQL, MIGRATION_V2_SQL, SCHEMA_SQL } from './schema';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
let ftsReady = false;

export function isFtsEnabled(): boolean {
  return ftsReady;
}

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = openAndPrepare();
  }
  return dbPromise;
}

async function openAndPrepare(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync('memory-book.db');
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await db.execAsync('PRAGMA busy_timeout = 5000;');

  await db.execAsync(SCHEMA_SQL);
  await db.execAsync(INDEX_SQL);
  await migrate(db);

  try {
    await db.execAsync(FTS_SQL);
    ftsReady = true;
  } catch {
    ftsReady = false;
  }

  await seedCategories(db);

  if (ftsReady) {
    await ensureFtsPopulated(db);
  }

  return db;
}

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.runAsync('INSERT OR IGNORE INTO meta (key, value) VALUES (?, ?)', [
    'schema_version',
    '1',
  ]);
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM meta WHERE key = 'schema_version'",
  );
  const version = Number(row?.value ?? 1);

  if (!(await columnExists(db, 'ai_messages', 'provider'))) {
    await db.execAsync('ALTER TABLE ai_messages ADD COLUMN provider TEXT;');
  }
  if (!(await columnExists(db, 'ai_messages', 'model'))) {
    await db.execAsync('ALTER TABLE ai_messages ADD COLUMN model TEXT;');
  }
  if (!(await columnExists(db, 'ai_conversations', 'updated_at'))) {
    await db.execAsync('ALTER TABLE ai_conversations ADD COLUMN updated_at TEXT;');
  }
  await db.runAsync(
    'UPDATE ai_conversations SET updated_at = created_at WHERE updated_at IS NULL',
  );

  const ftsColumns = await db.getAllAsync<{ name: string }>(
    'PRAGMA table_info(notes_fts)',
  );
  const staleFts =
    ftsColumns.length > 0 && !ftsColumns.some((column) => column.name === 'keywords');
  if (staleFts) {
    await db.execAsync(MIGRATION_V2_SQL);
  }

  if (version < 2) {
    await db.runAsync(
      "INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '2')",
    );
  }
}

async function columnExists(
  db: SQLite.SQLiteDatabase,
  table: string,
  column: string,
): Promise<boolean> {
  const rows = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  return rows.some((row) => row.name === column);
}

async function seedCategories(db: SQLite.SQLiteDatabase): Promise<void> {
  const createdAt = nowIso();
  for (const category of DEFAULT_CATEGORIES) {
    await db.runAsync(
      'INSERT OR IGNORE INTO categories (id, name, color, icon, is_default, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [category.id, category.name, category.color, category.icon, 1, createdAt],
    );
  }
}

async function ensureFtsPopulated(db: SQLite.SQLiteDatabase): Promise<void> {
  const noteCount = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM notes',
  );
  const ftsCount = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM notes_fts',
  );
  if ((noteCount?.count ?? 0) === (ftsCount?.count ?? 0)) return;

  await db.execAsync('DELETE FROM notes_fts;');
  const rows = await db.getAllAsync<{
    id: string;
    title: string;
    body: string;
    category_name: string | null;
    tag_names: string | null;
    keywords_json: string | null;
  }>(
    `SELECT n.id, n.title, n.body,
            c.name as category_name,
            (SELECT group_concat(t.name, ' ') FROM note_tags nt JOIN tags t ON t.id = nt.tag_id WHERE nt.note_id = n.id) as tag_names,
            e.keywords_json as keywords_json
     FROM notes n
     LEFT JOIN categories c ON c.id = n.category_id
     LEFT JOIN note_enrichments e ON e.note_id = n.id`,
  );
  for (const row of rows) {
    await db.runAsync(
      'INSERT INTO notes_fts (note_id, title, body, tags, category, keywords) VALUES (?, ?, ?, ?, ?, ?)',
      [
        row.id,
        row.title,
        row.body,
        row.tag_names ?? '',
        row.category_name ?? '',
        parseStringArray(row.keywords_json).join(' '),
      ],
    );
  }
}
