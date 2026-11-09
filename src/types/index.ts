export type SourceType = 'text' | 'voice' | 'photo' | 'document' | 'manual';

export type RecordType = 'none' | 'payment' | 'order';

export type ProcessingStatus = 'pending' | 'processed' | 'needs_review' | 'failed';

export type SyncState = 'local' | 'pending' | 'synced' | 'error';

export type ScratchpadMode = 'exclude' | 'only' | 'include';

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  isDefault: boolean;
  createdAt: string;
}

export interface Tag {
  id: string;
  name: string;
  createdAt: string;
}

export interface Note {
  id: string;
  title: string;
  body: string;
  categoryId: string | null;
  category: Category | null;
  tags: Tag[];
  occurredAt: string;
  recordedAt: string;
  timezone: string;
  sourceType: SourceType;
  recordType: RecordType;
  processingStatus: ProcessingStatus;
  isScratchpad: boolean;
  expiresAt: string | null;
  archivedAt: string | null;
  deletedAt: string | null;
  version: number;
  clientId: string;
  syncState: SyncState;
  createdAt: string;
  updatedAt: string;
}

export interface NoteInput {
  title?: string;
  body: string;
  categoryId?: string | null;
  tagIds?: string[];
  occurredAt?: string;
  isScratchpad?: boolean;
  scratchpadDays?: number;
  sourceType?: SourceType;
  recordType?: RecordType;
}

export type ReminderRecurrence =
  | 'none'
  | 'hourly'
  | 'daily'
  | 'weekly'
  | 'yearly';

export interface Reminder {
  id: string;
  noteId: string | null;
  title: string;
  description: string | null;
  dueAt: string;
  timezone: string;
  recurrence: ReminderRecurrence;
  nextOccurrence: string | null;
  notificationEnabled: boolean;
  deviceNotificationId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReminderInput {
  noteId?: string | null;
  title: string;
  description?: string | null;
  dueAt: string;
  recurrence: ReminderRecurrence;
}

export interface SearchFilters {
  text: string;
  categoryId: string | null;
  tagIds: string[];
  from: string | null;
  to: string | null;
  scratchpadMode: ScratchpadMode;
  recordType: RecordType | null;
}

export interface NoteStats {
  total: number;
  scratchpad: number;
  expired: number;
  trash: number;
  categories: number;
  tags: number;
}

export interface CategoryInput {
  name: string;
  color?: string;
  icon?: string;
}
