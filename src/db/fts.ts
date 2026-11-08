import { parseStringArray } from '../utils/json';
import { getDb, isFtsEnabled } from './database';

export async function rebuildNoteFts(noteId: string): Promise<void> {
  if (!isFtsEnabled()) return;
  const db = await getDb();
  const row = await db.getFirstAsync<{
    title: string;
    body: string;
    category_name: string | null;
    tag_names: string | null;
    keywords_json: string | null;
  }>(
    `SELECT n.title, n.body,
            c.name as category_name,
            (SELECT group_concat(t.name, ' ') FROM note_tags nt JOIN tags t ON t.id = nt.tag_id WHERE nt.note_id = n.id) as tag_names,
            e.keywords_json as keywords_json
     FROM notes n
     LEFT JOIN categories c ON c.id = n.category_id
     LEFT JOIN note_enrichments e ON e.note_id = n.id
     WHERE n.id = ?`,
    [noteId],
  );

  await db.runAsync('DELETE FROM notes_fts WHERE note_id = ?', [noteId]);
  if (!row) return;

  await db.runAsync(
    'INSERT INTO notes_fts (note_id, title, body, tags, category, keywords) VALUES (?, ?, ?, ?, ?, ?)',
    [
      noteId,
      row.title,
      row.body,
      row.tag_names ?? '',
      row.category_name ?? '',
      parseStringArray(row.keywords_json).join(' '),
    ],
  );
}

export async function removeNoteFts(noteId: string): Promise<void> {
  if (!isFtsEnabled()) return;
  const db = await getDb();
  await db.runAsync('DELETE FROM notes_fts WHERE note_id = ?', [noteId]);
}

export async function rebuildAllFts(): Promise<void> {
  if (!isFtsEnabled()) return;
  const db = await getDb();
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
