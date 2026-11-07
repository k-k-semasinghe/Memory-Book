import type {
  Category,
  Note,
  ProcessingStatus,
  RecordType,
  SourceType,
  SyncState,
  Tag,
} from '../types';

export interface CategoryRow {
  id: string;
  name: string;
  color: string;
  icon: string;
  is_default: number;
  created_at: string;
}

export interface TagRow {
  id: string;
  name: string;
  created_at: string;
}

export interface NoteRow {
  id: string;
  title: string;
  body: string;
  category_id: string | null;
  occurred_at: string;
  recorded_at: string;
  timezone: string;
  source_type: string;
  record_type: string;
  processing_status: string;
  is_scratchpad: number;
  expires_at: string | null;
  archived_at: string | null;
  deleted_at: string | null;
  version: number;
  client_id: string;
  sync_state: string;
  created_at: string;
  updated_at: string;
}

export function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    icon: row.icon,
    isDefault: row.is_default === 1,
    createdAt: row.created_at,
  };
}

export function mapTag(row: TagRow): Tag {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
  };
}

export function mapNote(row: NoteRow, tags: Tag[], category: Category | null): Note {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    categoryId: row.category_id,
    category,
    tags,
    occurredAt: row.occurred_at,
    recordedAt: row.recorded_at,
    timezone: row.timezone,
    sourceType: row.source_type as SourceType,
    recordType: row.record_type as RecordType,
    processingStatus: row.processing_status as ProcessingStatus,
    isScratchpad: row.is_scratchpad === 1,
    expiresAt: row.expires_at,
    archivedAt: row.archived_at,
    deletedAt: row.deleted_at,
    version: row.version,
    clientId: row.client_id,
    syncState: row.sync_state as SyncState,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
