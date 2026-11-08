import type { SQLiteDatabase } from 'expo-sqlite';

import { SCRATCHPAD_DAYS } from '../../constants/categories';
import type { Note, NoteInput, NoteStats, SearchFilters } from '../../types';
import { addDaysIso, deviceTimeZone, nowIso } from '../../utils/dates';
import { newId } from '../../utils/id';
import { getDb, isFtsEnabled } from '../database';
import { rebuildNoteFts, removeNoteFts } from '../fts';
import {
  mapCategory,
  mapNote,
  mapTag,
  type CategoryRow,
  type NoteRow,
  type TagRow,
} from '../mappers';

type BindValue = string | number | null;

export async function getNote(id: string): Promise<Note | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<NoteRow>('SELECT * FROM notes WHERE id = ?', [id]);
  if (!row) return null;
  const [note] = await hydrateNotes([row]);
  return note ?? null;
}

export async function listRecentNotes(limit = 8): Promise<Note[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<NoteRow>(
    `SELECT * FROM notes
     WHERE deleted_at IS NULL AND archived_at IS NULL AND is_scratchpad = 0
     ORDER BY occurred_at DESC
     LIMIT ?`,
    [limit],
  );
  return hydrateNotes(rows);
}

export async function listTimeline(limit = 500): Promise<Note[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<NoteRow>(
    `SELECT * FROM notes
     WHERE deleted_at IS NULL AND archived_at IS NULL AND is_scratchpad = 0
     ORDER BY occurred_at DESC
     LIMIT ?`,
    [limit],
  );
  return hydrateNotes(rows);
}

export async function listScratchpad(): Promise<Note[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<NoteRow>(
    `SELECT * FROM notes
     WHERE deleted_at IS NULL AND is_scratchpad = 1
     ORDER BY expires_at ASC`,
  );
  return hydrateNotes(rows);
}

export async function listTrash(): Promise<Note[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<NoteRow>(
    `SELECT * FROM notes
     WHERE deleted_at IS NOT NULL
     ORDER BY deleted_at DESC`,
  );
  return hydrateNotes(rows);
}

export async function listOldestNotes(limit = 20): Promise<Note[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<NoteRow>(
    `SELECT * FROM notes
     WHERE deleted_at IS NULL AND archived_at IS NULL
     ORDER BY occurred_at ASC
     LIMIT ?`,
    [limit],
  );
  return hydrateNotes(rows);
}

export async function createNote(input: NoteInput): Promise<Note> {
  const body = input.body.trim();
  const title = (input.title ?? '').trim();
  if (!body && !title) throw new Error('Write something before saving.');

  const db = await getDb();
  const now = nowIso();
  const id = newId();
  const occurredAt = input.occurredAt ?? now;
  const isScratchpad = input.isScratchpad ?? false;
  const days = input.scratchpadDays ?? SCRATCHPAD_DAYS;
  const expiresAt = isScratchpad ? addDaysIso(now, days) : null;
  const timezone = deviceTimeZone();

  await withTransaction(db, async () => {
    await db.runAsync(
      `INSERT INTO notes (
        id, title, body, category_id, occurred_at, recorded_at, timezone,
        source_type, record_type, processing_status, is_scratchpad, expires_at,
        archived_at, deleted_at, version, client_id, sync_state, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, 1, ?, 'local', ?, ?)`,
      [
        id,
        title,
        body,
        input.categoryId ?? null,
        occurredAt,
        now,
        timezone,
        input.sourceType ?? 'text',
        input.recordType ?? 'none',
        'pending',
        isScratchpad ? 1 : 0,
        expiresAt,
        id,
        now,
        now,
      ],
    );
    await replaceNoteTags(db, id, input.tagIds ?? []);
  });

  await rebuildNoteFts(id);
  const note = await getNote(id);
  if (!note) throw new Error('Could not save the note.');
  return note;
}

export async function updateNote(id: string, input: NoteInput): Promise<Note> {
  const db = await getDb();
  const existing = await db.getFirstAsync<NoteRow>('SELECT * FROM notes WHERE id = ?', [id]);
  if (!existing) throw new Error('Note not found.');

  const now = nowIso();
  const body = input.body.trim();
  const title = (input.title ?? '').trim();
  if (!body && !title) throw new Error('Write something before saving.');

  const isScratchpad = input.isScratchpad ?? existing.is_scratchpad === 1;
  const days = input.scratchpadDays ?? SCRATCHPAD_DAYS;
  const expiresAt = isScratchpad ? addDaysIso(now, days) : null;

  await withTransaction(db, async () => {
    await db.runAsync(
      `UPDATE notes SET
        title = ?, body = ?, category_id = ?, occurred_at = ?,
        source_type = ?, record_type = ?,
        is_scratchpad = ?, expires_at = ?,
        version = version + 1, updated_at = ?
      WHERE id = ?`,
      [
        title,
        body,
        input.categoryId ?? null,
        input.occurredAt ?? existing.occurred_at,
        input.sourceType ?? existing.source_type,
        input.recordType ?? existing.record_type,
        isScratchpad ? 1 : 0,
        expiresAt,
        now,
        id,
      ],
    );
    if (input.tagIds !== undefined) {
      await replaceNoteTags(db, id, input.tagIds);
    }
  });

  await rebuildNoteFts(id);
  const note = await getNote(id);
  if (!note) throw new Error('Note not found.');
  return note;
}

export async function softDeleteNote(id: string): Promise<void> {
  const db = await getDb();
  const now = nowIso();
  await db.runAsync(
    'UPDATE notes SET deleted_at = ?, updated_at = ?, version = version + 1 WHERE id = ?',
    [now, now, id],
  );
}

export async function restoreNote(id: string): Promise<void> {
  const db = await getDb();
  const now = nowIso();
  await db.runAsync(
    'UPDATE notes SET deleted_at = NULL, updated_at = ?, version = version + 1 WHERE id = ?',
    [now, id],
  );
}

export async function deleteNoteForever(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM notes WHERE id = ?', [id]);
  await removeNoteFts(id);
}

export async function emptyTrash(): Promise<number> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ id: string }>(
    'SELECT id FROM notes WHERE deleted_at IS NOT NULL',
  );
  await db.runAsync('DELETE FROM notes WHERE deleted_at IS NOT NULL');
  for (const row of rows) {
    await removeNoteFts(row.id);
  }
  return rows.length;
}

export async function archiveNote(id: string): Promise<void> {
  const db = await getDb();
  const now = nowIso();
  await db.runAsync(
    'UPDATE notes SET archived_at = ?, updated_at = ?, version = version + 1 WHERE id = ?',
    [now, now, id],
  );
}

export async function unarchiveNote(id: string): Promise<void> {
  const db = await getDb();
  const now = nowIso();
  await db.runAsync(
    'UPDATE notes SET archived_at = NULL, updated_at = ?, version = version + 1 WHERE id = ?',
    [now, id],
  );
}

export async function extendScratchpad(id: string, days = SCRATCHPAD_DAYS): Promise<void> {
  const db = await getDb();
  const now = nowIso();
  await db.runAsync(
    'UPDATE notes SET expires_at = ?, updated_at = ?, version = version + 1 WHERE id = ?',
    [addDaysIso(now, days), now, id],
  );
}

export async function makePermanent(id: string): Promise<void> {
  const db = await getDb();
  const now = nowIso();
  await db.runAsync(
    'UPDATE notes SET is_scratchpad = 0, expires_at = NULL, updated_at = ?, version = version + 1 WHERE id = ?',
    [now, id],
  );
}

export async function searchNotes(filters: SearchFilters): Promise<Note[]> {
  const db = await getDb();
  const clauses: string[] = ['n.deleted_at IS NULL', 'n.archived_at IS NULL'];
  const params: BindValue[] = [];

  if (filters.scratchpadMode === 'exclude') clauses.push('n.is_scratchpad = 0');
  if (filters.scratchpadMode === 'only') clauses.push('n.is_scratchpad = 1');

  if (filters.categoryId) {
    clauses.push('n.category_id = ?');
    params.push(filters.categoryId);
  }
  if (filters.recordType) {
    clauses.push('n.record_type = ?');
    params.push(filters.recordType);
  }
  if (filters.from) {
    clauses.push('n.occurred_at >= ?');
    params.push(filters.from);
  }
  if (filters.to) {
    clauses.push('n.occurred_at <= ?');
    params.push(filters.to);
  }
  if (filters.tagIds.length) {
    const placeholders = filters.tagIds.map(() => '?').join(', ');
    clauses.push(
      `(SELECT COUNT(DISTINCT nt.tag_id) FROM note_tags nt WHERE nt.note_id = n.id AND nt.tag_id IN (${placeholders})) = ?`,
    );
    params.push(...filters.tagIds, filters.tagIds.length);
  }

  const text = filters.text.trim();
  if (text) {
    const ftsQuery = toFtsQuery(text);
    if (ftsQuery && isFtsEnabled()) {
      try {
        const rows = await db.getAllAsync<NoteRow>(
          `SELECT n.* FROM notes_fts JOIN notes n ON n.id = notes_fts.note_id
           WHERE notes_fts MATCH ? AND ${clauses.join(' AND ')}
           ORDER BY bm25(notes_fts)
           LIMIT 300`,
          [ftsQuery, ...params],
        );
        return hydrateNotes(rows);
      } catch {
        // Fall through to LIKE search if the FTS query is invalid.
      }
    }

    const like = `%${text}%`;
    clauses.push(
      `(n.title LIKE ? OR n.body LIKE ?
        OR EXISTS (SELECT 1 FROM note_tags nt JOIN tags t ON t.id = nt.tag_id WHERE nt.note_id = n.id AND t.name LIKE ?)
        OR EXISTS (SELECT 1 FROM categories c WHERE c.id = n.category_id AND c.name LIKE ?)
        OR EXISTS (SELECT 1 FROM note_enrichments e WHERE e.note_id = n.id AND e.keywords_json LIKE ?))`,
    );
    params.push(like, like, like, like, like);
  }

  const rows = await db.getAllAsync<NoteRow>(
    `SELECT n.* FROM notes n
     WHERE ${clauses.join(' AND ')}
     ORDER BY n.occurred_at DESC
     LIMIT 300`,
    params,
  );
  return hydrateNotes(rows);
}

export async function searchNotesAnyTerms(
  text: string,
  limit = 6,
): Promise<Note[]> {
  const db = await getDb();
  const tokens = tokenizeForSearch(text).slice(0, 12);
  if (!tokens.length) return listRecentNotes(limit);

  if (isFtsEnabled()) {
    try {
      const query = tokens.map((token) => `${token}*`).join(' OR ');
      const rows = await db.getAllAsync<NoteRow>(
        `SELECT n.* FROM notes_fts JOIN notes n ON n.id = notes_fts.note_id
         WHERE notes_fts MATCH ?
           AND n.deleted_at IS NULL
           AND n.archived_at IS NULL
         ORDER BY bm25(notes_fts), n.occurred_at DESC
         LIMIT ?`,
        [query, limit],
      );
      if (rows.length) return hydrateNotes(rows);
    } catch {
      // Fall through to LIKE search.
    }
  }

  const conditions: string[] = [];
  const params: BindValue[] = [];
  for (const token of tokens) {
    const like = `%${token}%`;
    conditions.push(
      `(n.title LIKE ? OR n.body LIKE ?
        OR EXISTS (SELECT 1 FROM note_tags nt JOIN tags t ON t.id = nt.tag_id WHERE nt.note_id = n.id AND t.name LIKE ?)
        OR EXISTS (SELECT 1 FROM note_enrichments e WHERE e.note_id = n.id AND e.keywords_json LIKE ?))`,
    );
    params.push(like, like, like, like);
  }
  params.push(limit);
  const rows = await db.getAllAsync<NoteRow>(
    `SELECT n.* FROM notes n
     WHERE n.deleted_at IS NULL AND n.archived_at IS NULL
       AND (${conditions.join(' OR ')})
     ORDER BY n.occurred_at DESC
     LIMIT ?`,
    params,
  );
  return rows.length ? hydrateNotes(rows) : listRecentNotes(limit);
}

export async function getNoteStats(): Promise<NoteStats> {
  const db = await getDb();
  const now = nowIso();
  const row = await db.getFirstAsync<{
    total: number;
    scratchpad: number;
    expired: number;
    trash: number;
    categories: number;
    tags: number;
  }>(
    `SELECT
      (SELECT COUNT(*) FROM notes WHERE deleted_at IS NULL AND archived_at IS NULL) as total,
      (SELECT COUNT(*) FROM notes WHERE deleted_at IS NULL AND is_scratchpad = 1) as scratchpad,
      (SELECT COUNT(*) FROM notes WHERE deleted_at IS NULL AND is_scratchpad = 1 AND expires_at IS NOT NULL AND expires_at <= ?) as expired,
      (SELECT COUNT(*) FROM notes WHERE deleted_at IS NOT NULL) as trash,
      (SELECT COUNT(*) FROM categories WHERE deleted_at IS NULL) as categories,
      (SELECT COUNT(*) FROM tags WHERE deleted_at IS NULL) as tags`,
    [now],
  );

  return {
    total: row?.total ?? 0,
    scratchpad: row?.scratchpad ?? 0,
    expired: row?.expired ?? 0,
    trash: row?.trash ?? 0,
    categories: row?.categories ?? 0,
    tags: row?.tags ?? 0,
  };
}

async function hydrateNotes(rows: NoteRow[]): Promise<Note[]> {
  if (!rows.length) return [];
  const db = await getDb();
  const ids = rows.map((row) => row.id);
  const placeholders = ids.map(() => '?').join(', ');

  const tagRows = await db.getAllAsync<TagRow & { note_id: string }>(
    `SELECT nt.note_id, t.id, t.name, t.created_at
     FROM note_tags nt
     JOIN tags t ON t.id = nt.tag_id
     WHERE nt.note_id IN (${placeholders}) AND t.deleted_at IS NULL
     ORDER BY t.name ASC`,
    ids,
  );

  const tagsByNote = new Map<string, ReturnType<typeof mapTag>[]>();
  for (const row of tagRows) {
    const list = tagsByNote.get(row.note_id) ?? [];
    list.push(mapTag(row));
    tagsByNote.set(row.note_id, list);
  }

  const categoryRows = await db.getAllAsync<CategoryRow>(
    'SELECT * FROM categories WHERE deleted_at IS NULL',
  );
  const categories = new Map(categoryRows.map((row) => [row.id, mapCategory(row)]));

  return rows.map((row) =>
    mapNote(
      row,
      tagsByNote.get(row.id) ?? [],
      row.category_id ? categories.get(row.category_id) ?? null : null,
    ),
  );
}

async function replaceNoteTags(
  db: SQLiteDatabase,
  noteId: string,
  tagIds: string[],
): Promise<void> {
  await db.runAsync('DELETE FROM note_tags WHERE note_id = ?', [noteId]);
  const unique = Array.from(new Set(tagIds.filter(Boolean)));
  for (const tagId of unique) {
    await db.runAsync(
      'INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?, ?)',
      [noteId, tagId],
    );
  }
}

const SEARCH_STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'about',
  'did',
  'do',
  'does',
  'for',
  'from',
  'had',
  'has',
  'have',
  'how',
  'i',
  'in',
  'is',
  'it',
  'me',
  'my',
  'of',
  'on',
  'or',
  'that',
  'the',
  'this',
  'to',
  'was',
  'were',
  'what',
  'when',
  'where',
  'which',
  'who',
  'why',
  'with',
]);

function tokenizeForSearch(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !SEARCH_STOP_WORDS.has(token));
}

function toFtsQuery(text: string): string | null {
  const tokens = text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .map((token) => token.trim())
    .filter(Boolean)
    .slice(0, 10);

  if (!tokens.length) return null;
  return tokens.map((token) => `${token.replace(/"/g, '')}*`).join(' AND ');
}

async function withTransaction(
  db: SQLiteDatabase,
  work: () => Promise<void>,
): Promise<void> {
  await db.withTransactionAsync(work);
}
