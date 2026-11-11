import type { SQLiteDatabase } from 'expo-sqlite';

import type { Tag } from '../../types';
import { nowIso } from '../../utils/dates';
import { newId } from '../../utils/id';
import { getDb } from '../database';
import { rebuildNoteFts } from '../fts';
import { mapTag, type TagRow } from '../mappers';

export async function listTags(): Promise<Tag[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<TagRow>(
    'SELECT * FROM tags WHERE deleted_at IS NULL ORDER BY name ASC',
  );
  return rows.map(mapTag);
}

export async function createTag(rawName: string): Promise<Tag> {
  const name = rawName.trim();
  if (!name) throw new Error('Tag name is required.');

  const db = await getDb();
  const existing = await db.getFirstAsync<TagRow>(
    'SELECT * FROM tags WHERE lower(name) = lower(?) AND deleted_at IS NULL',
    [name],
  );
  if (existing) return mapTag(existing);

  const id = newId();
  const createdAt = nowIso();
  await db.runAsync(
    'INSERT INTO tags (id, name, created_at) VALUES (?, ?, ?)',
    [id, name, createdAt],
  );
  return { id, name, createdAt };
}

export async function deleteTag(id: string): Promise<void> {
  const db = await getDb();
  const affected = await db.getAllAsync<{ note_id: string }>(
    'SELECT note_id FROM note_tags WHERE tag_id = ?',
    [id],
  );

  await withTransaction(db, async () => {
    await db.runAsync('DELETE FROM note_tags WHERE tag_id = ?', [id]);
    await db.runAsync('UPDATE tags SET deleted_at = ? WHERE id = ?', [nowIso(), id]);
  });

  for (const row of affected) {
    await rebuildNoteFts(row.note_id);
  }
}

async function withTransaction(
  db: SQLiteDatabase,
  work: () => Promise<void>,
): Promise<void> {
  await db.withTransactionAsync(work);
}
