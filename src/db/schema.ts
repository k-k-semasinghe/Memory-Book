export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  icon TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  occurred_at TEXT NOT NULL,
  recorded_at TEXT NOT NULL,
  timezone TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'text',
  record_type TEXT NOT NULL DEFAULT 'none',
  processing_status TEXT NOT NULL DEFAULT 'pending',
  is_scratchpad INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT,
  archived_at TEXT,
  deleted_at TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  client_id TEXT NOT NULL UNIQUE,
  sync_state TEXT NOT NULL DEFAULT 'local',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS note_tags (
  note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (note_id, tag_id)
);

CREATE TABLE IF NOT EXISTS merchants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  note_id TEXT NOT NULL UNIQUE REFERENCES notes(id) ON DELETE CASCADE,
  amount_minor INTEGER,
  currency TEXT NOT NULL,
  merchant_id TEXT REFERENCES merchants(id) ON DELETE SET NULL,
  payment_method TEXT,
  status TEXT NOT NULL DEFAULT 'unknown',
  transaction_date TEXT,
  due_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  note_id TEXT NOT NULL UNIQUE REFERENCES notes(id) ON DELETE CASCADE,
  merchant_id TEXT REFERENCES merchants(id) ON DELETE SET NULL,
  order_reference TEXT,
  items TEXT,
  total_amount_minor INTEGER,
  currency TEXT NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'unknown',
  delivery_status TEXT NOT NULL DEFAULT 'unknown',
  ordered_at TEXT,
  expected_delivery_at TEXT,
  delivered_at TEXT,
  tracking_reference TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY,
  note_id TEXT REFERENCES notes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_at TEXT NOT NULL,
  timezone TEXT NOT NULL,
  recurrence_rule TEXT,
  next_occurrence TEXT,
  notification_enabled INTEGER NOT NULL DEFAULT 1,
  device_notification_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT,
  mime_type TEXT,
  file_size INTEGER,
  upload_state TEXT NOT NULL DEFAULT 'local',
  exif_stripped INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_processing_jobs (
  id TEXT PRIMARY KEY,
  note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  model_name TEXT,
  input_version INTEGER,
  result_json TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS ai_conversations (
  id TEXT PRIMARY KEY,
  title TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  cited_note_ids TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_outbox (
  id TEXT PRIMARY KEY,
  entity TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  payload TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tombstones (
  id TEXT PRIMARY KEY,
  entity TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  deleted_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

export const INDEX_SQL = `
CREATE UNIQUE INDEX IF NOT EXISTS categories_name_unique
  ON categories(lower(name)) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS tags_name_unique
  ON tags(lower(name)) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS notes_occurred_idx ON notes(occurred_at DESC);
CREATE INDEX IF NOT EXISTS notes_category_idx ON notes(category_id);
CREATE INDEX IF NOT EXISTS notes_scratch_idx ON notes(is_scratchpad);
CREATE INDEX IF NOT EXISTS notes_expires_idx ON notes(expires_at);
CREATE INDEX IF NOT EXISTS notes_deleted_idx ON notes(deleted_at);
CREATE INDEX IF NOT EXISTS note_tags_tag_idx ON note_tags(tag_id);
CREATE INDEX IF NOT EXISTS reminders_due_idx ON reminders(due_at);
`;

export const FTS_SQL = `
CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
  note_id UNINDEXED,
  title,
  body,
  tags,
  category,
  tokenize = 'unicode61 remove_diacritics 2'
);
`;
