import { CATEGORY_COLORS } from '../../constants/categories';
import type { Category, CategoryInput } from '../../types';
import { nowIso } from '../../utils/dates';
import { newId } from '../../utils/id';
import type { SQLiteDatabase } from 'expo-sqlite';
import { getDb } from '../database';
import { rebuildNoteFts } from '../fts';
import { mapCategory, type CategoryRow } from '../mappers';

export async function listCategories(): Promise<Category[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<CategoryRow>(
    'SELECT * FROM categories WHERE deleted_at IS NULL ORDER BY is_default DESC, name ASC',
  );
  return rows.map(mapCategory);
}

export async function getCategory(id: string): Promise<Category | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<CategoryRow>(
    'SELECT * FROM categories WHERE id = ? AND deleted_at IS NULL',
    [id],
  );
  return row ? mapCategory(row) : null;
}

export async function createCategory(input: CategoryInput): Promise<Category> {
  const name = input.name.trim();
  if (!name) throw new Error('Category name is required.');

  const db = await getDb();
  const existing = await db.getFirstAsync<CategoryRow>(
    'SELECT * FROM categories WHERE lower(name) = lower(?) AND deleted_at IS NULL',
    [name],
  );
  if (existing) return mapCategory(existing);

  const id = newId();
  const createdAt = nowIso();
  const color = input.color ?? CATEGORY_COLORS[0];
  const icon = input.icon ?? 'pricetag-outline';

  await db.runAsync(
    'INSERT INTO categories (id, name, color, icon, is_default, created_at) VALUES (?, ?, ?, ?, 0, ?)',
    [id, name, color, icon, createdAt],
  );

  return { id, name, color, icon, isDefault: false, createdAt };
}

export async function updateCategory(
  id: string,
  patch: Partial<CategoryInput>,
): Promise<void> {
  const db = await getDb();
  const fields: string[] = [];
  const params: Array<string> = [];

  if (patch.name !== undefined) {
    const name = patch.name.trim();
    if (!name) throw new Error('Category name is required.');
    fields.push('name = ?');
    params.push(name);
  }
  if (patch.color !== undefined) {
    fields.push('color = ?');
    params.push(patch.color);
  }
  if (patch.icon !== undefined) {
    fields.push('icon = ?');
    params.push(patch.icon);
  }
  if (!fields.length) return;

  params.push(id);
  await db.runAsync(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?`, params);

  const notes = await db.getAllAsync<{ id: string }>(
    'SELECT id FROM notes WHERE category_id = ?',
    [id],
  );
  for (const note of notes) {
    await rebuildNoteFts(note.id);
  }
}

export async function deleteCategory(id: string): Promise<void> {
  const db = await getDb();
  const affected = await db.getAllAsync<{ id: string }>(
    'SELECT id FROM notes WHERE category_id = ?',
    [id],
  );

  await withTransaction(db, async () => {
    await db.runAsync('UPDATE notes SET category_id = NULL WHERE category_id = ?', [id]);
    await db.runAsync('UPDATE categories SET deleted_at = ? WHERE id = ?', [nowIso(), id]);
  });

  for (const note of affected) {
    await rebuildNoteFts(note.id);
  }
}

async function withTransaction(
  db: SQLiteDatabase,
  work: () => Promise<void>,
): Promise<void> {
  await db.withTransactionAsync(work);
}
