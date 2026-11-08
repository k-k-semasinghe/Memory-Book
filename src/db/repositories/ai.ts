import type { SQLiteDatabase } from 'expo-sqlite';

import type { AIEnrichmentApply, NoteEnrichment } from '../../ai/types';
import { nowIso } from '../../utils/dates';
import { newId } from '../../utils/id';
import { parseStringArray } from '../../utils/json';
import { getDb } from '../database';
import { rebuildAllFts, rebuildNoteFts } from '../fts';

type EnrichmentRow = {
  note_id: string;
  summary: string | null;
  key_points_json: string | null;
  suggested_category_id: string | null;
  suggested_tag_ids_json: string | null;
  keywords_json: string | null;
  provider: string | null;
  model: string | null;
  updated_at: string;
};

export async function getNoteEnrichment(
  noteId: string,
): Promise<NoteEnrichment | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<EnrichmentRow>(
    'SELECT * FROM note_enrichments WHERE note_id = ?',
    [noteId],
  );
  return row ? mapEnrichment(row) : null;
}

export async function applyNoteEnrichment(
  noteId: string,
  input: AIEnrichmentApply,
): Promise<NoteEnrichment> {
  const db = await getDb();
  const existing = await getNoteEnrichment(noteId);
  const now = nowIso();

  let categoryId = existing?.suggestedCategoryId ?? null;
  let tagIds = existing?.suggestedTagIds ?? [];
  let keywords = existing?.keywords ?? [];
  let summary = existing?.summary ?? null;
  let keyPoints = existing?.keyPoints ?? [];

  await db.withTransactionAsync(async () => {
    if (input.categoryId !== undefined) {
      if (input.categoryId) {
        const category = await db.getFirstAsync<{ id: string }>(
          'SELECT id FROM categories WHERE id = ? AND deleted_at IS NULL',
          [input.categoryId],
        );
        categoryId = category?.id ?? null;
      } else {
        categoryId = null;
      }
      await db.runAsync('UPDATE notes SET category_id = ?, updated_at = ? WHERE id = ?', [
        categoryId,
        now,
        noteId,
      ]);
    }

    if (input.tagNames !== undefined) {
      tagIds = await resolveTagIds(db, input.tagNames);
      for (const tagId of tagIds) {
        await db.runAsync(
          'INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?, ?)',
          [noteId, tagId],
        );
      }
    }

    if (input.keywords !== undefined) keywords = input.keywords;
    if (input.summary !== undefined) summary = input.summary;
    if (input.keyPoints !== undefined) keyPoints = input.keyPoints;

    await db.runAsync(
      `INSERT INTO note_enrichments (
        note_id, summary, key_points_json, suggested_category_id,
        suggested_tag_ids_json, keywords_json, provider, model, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(note_id) DO UPDATE SET
        summary = excluded.summary,
        key_points_json = excluded.key_points_json,
        suggested_category_id = excluded.suggested_category_id,
        suggested_tag_ids_json = excluded.suggested_tag_ids_json,
        keywords_json = excluded.keywords_json,
        provider = excluded.provider,
        model = excluded.model,
        updated_at = excluded.updated_at`,
      [
        noteId,
        summary,
        JSON.stringify(keyPoints),
        categoryId,
        JSON.stringify(tagIds),
        JSON.stringify(keywords),
        input.provider,
        input.model,
        now,
      ],
    );
  });

  await rebuildNoteFts(noteId);
  return (await getNoteEnrichment(noteId)) as NoteEnrichment;
}

export async function deleteNoteEnrichment(noteId: string): Promise<void> {
  const db = await getDb();
  const existing = await getNoteEnrichment(noteId);
  await db.runAsync('DELETE FROM note_enrichments WHERE note_id = ?', [noteId]);

  if (existing?.suggestedCategoryId) {
    await db.runAsync(
      'UPDATE notes SET category_id = NULL, updated_at = ? WHERE id = ? AND category_id = ?',
      [nowIso(), noteId, existing.suggestedCategoryId],
    );
  }
  if (existing?.suggestedTagIds.length) {
    for (const tagId of existing.suggestedTagIds) {
      await db.runAsync('DELETE FROM note_tags WHERE note_id = ? AND tag_id = ?', [
        noteId,
        tagId,
      ]);
    }
  }
  await rebuildNoteFts(noteId);
}

export async function recordAIUsage(
  provider: string,
  model: string,
): Promise<void> {
  const db = await getDb();
  const day = new Date().toISOString().slice(0, 10);
  const now = nowIso();
  await db.runAsync(
    `INSERT INTO ai_usage (id, day, provider, model, request_count, updated_at)
     VALUES (?, ?, ?, ?, 1, ?)
     ON CONFLICT(day, provider) DO UPDATE SET
       model = excluded.model,
       request_count = request_count + 1,
       updated_at = excluded.updated_at`,
    [newId(), day, provider, model, now],
  );
}

export async function getAIUsageToday(): Promise<number> {
  const db = await getDb();
  const day = new Date().toISOString().slice(0, 10);
  const row = await db.getFirstAsync<{ total: number | null }>(
    'SELECT SUM(request_count) as total FROM ai_usage WHERE day = ?',
    [day],
  );
  return row?.total ?? 0;
}

export async function createAIConversation(title: string): Promise<string> {
  const db = await getDb();
  const id = newId();
  const now = nowIso();
  await db.runAsync(
    'INSERT INTO ai_conversations (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)',
    [id, title.trim().slice(0, 120) || 'New conversation', now, now],
  );
  return id;
}

export async function appendAIMessage(input: {
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  citedNoteIds?: string[];
  provider?: string;
  model?: string;
}): Promise<void> {
  const db = await getDb();
  const now = nowIso();
  await db.runAsync(
    `INSERT INTO ai_messages (
      id, conversation_id, role, content, cited_note_ids, provider, model, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      newId(),
      input.conversationId,
      input.role,
      input.content,
      JSON.stringify(input.citedNoteIds ?? []),
      input.provider ?? null,
      input.model ?? null,
      now,
    ],
  );
  await db.runAsync('UPDATE ai_conversations SET updated_at = ? WHERE id = ?', [
    now,
    input.conversationId,
  ]);
}

export async function deleteAllAIData(): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.execAsync('DELETE FROM ai_messages;');
    await db.execAsync('DELETE FROM ai_conversations;');
    await db.execAsync('DELETE FROM note_enrichments;');
    await db.execAsync('DELETE FROM ai_usage;');
  });
  await rebuildAllFts();
}

async function resolveTagIds(
  db: SQLiteDatabase,
  rawNames: string[],
): Promise<string[]> {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const rawName of rawNames) {
    const name = rawName.trim().replace(/^#+/, '');
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());

    const existing = await db.getFirstAsync<{ id: string }>(
      'SELECT id FROM tags WHERE lower(name) = lower(?) AND deleted_at IS NULL',
      [name],
    );
    if (existing) {
      ids.push(existing.id);
      continue;
    }

    const id = newId();
    await db.runAsync(
      'INSERT INTO tags (id, name, created_at) VALUES (?, ?, ?)',
      [id, name, nowIso()],
    );
    ids.push(id);
  }
  return ids;
}

function mapEnrichment(row: EnrichmentRow): NoteEnrichment {
  return {
    noteId: row.note_id,
    summary: row.summary,
    keyPoints: parseStringArray(row.key_points_json),
    suggestedCategoryId: row.suggested_category_id,
    suggestedTagIds: parseStringArray(row.suggested_tag_ids_json),
    keywords: parseStringArray(row.keywords_json),
    provider: row.provider,
    model: row.model,
    updatedAt: row.updated_at,
  };
}
