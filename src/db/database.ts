import * as SQLite from 'expo-sqlite';

import { DEFAULT_CATEGORIES } from '../constants/categories';
import { nowIso } from '../utils/dates';
import { FTS_SQL, INDEX_SQL, SCHEMA_SQL } from './schema';

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

  try {
    await db.execAsync(FTS_SQL);
    ftsReady = true;
  } catch {
    ftsReady = false;
  }

  await seedCategories(db);
  await db.runAsync('INSERT OR IGNORE INTO meta (key, value) VALUES (?, ?)', [
    'schema_version',
    '1',
  ]);

  if (ftsReady) {
    await ensureFtsPopulated(db);
  }

  return db;
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
  }>(
    `SELECT n.id, n.title, n.body,
            c.name as category_name,
            (SELECT group_concat(t.name, ' ') FROM note_tags nt JOIN tags t ON t.id = nt.tag_id WHERE nt.note_id = n.id) as tag_names
     FROM notes n
     LEFT JOIN categories c ON c.id = n.category_id`,
  );
  for (const row of rows) {
    await db.runAsync(
      'INSERT INTO notes_fts (note_id, title, body, tags, category) VALUES (?, ?, ?, ?, ?)',
      [row.id, row.title, row.body, row.tag_names ?? '', row.category_name ?? ''],
    );
  }
}
