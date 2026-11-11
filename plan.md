# Memory Book — v1 Product & Development Plan

**Working title:** Memory Book
**Product type:** Mobile-only personal notes and memory application
**Platforms:** Android and iOS (React Native + Expo)
**Core promise:** Capture anything in seconds, organize it only if you want, and find it again by words, category, tag, or date.

---

## 1. Product definition

Memory Book is a private, offline-first notes app. Users add notes quickly, optionally assign one category and any number of tags, and retrieve anything through full-text search and filters. A separate Scratchpad holds short-lived notes. AI assists with organizing and answering questions, but never invents facts and never deletes anything without explicit confirmation.

**Capture first, organize optionally, retrieve reliably.**

---

## 2. Final decisions

| Area | Decision |
| --- | --- |
| Platform | React Native + Expo, Android and iOS only |
| Language | English-only voice and UI in v1 |
| Navigation | 4 tabs (Home, Timeline, Search/Ask, Scratchpad) + persistent capture FAB |
| Notes | One category per note (optional) + many tags (optional), both creatable inline |
| Search | Full-text over title/body/tag/category names + filters (category, tags, date, attachment, record type/status) |
| Scratchpad | 7 days from last edit (overridable); flag + notify; user decides |
| Deletion | No auto-delete anywhere; manual Empty Trash; confirmed account purge |
| AI | Extraction + natural-language Q&A with citations; editable preview |
| AI access | Anonymous (no account required); optional account upgrade |
| Payments/orders | Basic fields + status; one note -> at most one structured record |
| Currency | Single currency per user |
| Storage | Local-first; optional cloud sync |
| Sync | Custom outbox, per-field last-write-wins + tombstones |
| Security | Encrypted local DB and files; EXIF/GPS stripped from uploads |
| Backup | Encrypted export/import; restore skips expired/trashed items |
| Reminders | Local-only scheduling; overdue derived from due date |

---

## 3. v1 scope

### 3.1 Capture

- Short text note with optional title.
- Voice recording (English) with queued offline transcription.
- Photo or document attachment.
- Manual payment/order form (optional structured entry).
- Persistent `+` floating action button on every main screen.
- A note saves to local storage immediately; AI enrichment never blocks saving.

### 3.2 Organize

- One optional category per note.
- Any number of optional tags per note.
- Create, rename, recolor, and delete categories inline.
- Create tags inline while typing.
- Seeded default categories: Personal, Work, Ideas, Payments, Purchases, Education, People, Travel, Appointments, Tasks.

### 3.3 Find

- Full-text search over title, body, tag names, and category names.
- Filters: category, tags, date range, has attachment, record type/status, include Scratchpad.
- Sort by event date or last updated.
- Empty query shows recent notes.

### 3.4 Scratchpad

- Separate section for short-lived notes.
- `expires_at` defaults to last edit + 7 days; per-note override allowed.
- At expiry, the note is flagged and the user is notified. User chooses: Delete, Keep 7 more days, or Make permanent.
- Never auto-deleted.
- Included in search and AI while alive.
- Cannot have payments, orders, or reminders attached.

### 3.5 Reminders

- One-time and recurring reminders linked to a note.
- Local notifications only; overdue is derived from `due_at`, never stored.
- Snooze, reschedule, complete, dismiss.

### 3.6 Payments and orders

- Payment: amount, currency, merchant, method, status, date, due date.
- Order: merchant, reference, items, total, currency, payment status, delivery status, dates, tracking.
- A note may have at most one structured record.
- Single currency per user; all amounts stored as integer minor units.

### 3.7 AI assistant

- On save: suggest category, tags, dates, amounts, merchant, and status.
- Suggestions are staged and shown in an editable review before committing.
- Ask: natural-language question -> constrained retrieval -> answer grounded in records -> tappable source links.
- Honest "no matching record" response; ambiguous matches shown as candidates.
- Never infers a completed payment from an intention; unknown values stay null.
- AI output stored separately from original user text.

### 3.8 Sync, backup, security

- Optional cloud account with outbox-based synchronization.
- Fully usable offline without an account.
- Encrypted local database and attachment files.
- Encrypted export/import for backup and migration.
- Account/data deletion requires re-authentication and explicit confirmation.

---

## 4. Screens and navigation

Bottom tabs (4) plus a persistent capture FAB:

1. **Home** — today, recent notes, upcoming and overdue reminders, shortcuts to Settings and Reminders.
2. **Timeline** — chronological notes, day/week/month grouping, calendar navigation, filters.
3. **Search / Ask** — keyword search with filters; AI question mode with citations.
4. **Scratchpad** — expiring notes and their status.

Additional screens (modals or pushed routes):

- Capture (text/voice/photo).
- Note detail and editor.
- Payment/order form.
- AI review sheet.
- AI conversation.
- Reminders.
- Settings: categories, tags, AI preferences, privacy, storage & cleanup, export/restore, delete data.

---

## 5. Data model

All tables use UUID primary keys, `user_id` ownership, and Row Level Security in the cloud.

### `profiles`

- `id` — matches authenticated user ID
- `display_name`
- `timezone`
- `currency`
- `is_anonymous`
- `upgraded_at`
- `created_at`

### `notes`

- `id`
- `user_id`
- `title`
- `body`
- `category_id` — optional
- `occurred_at`
- `recorded_at`
- `timezone`
- `source_type` — text, voice, photo, document, manual
- `record_type` — none, payment, order
- `processing_status` — pending, processed, needs_review, failed
- `is_scratchpad`
- `expires_at`
- `archived_at`
- `deleted_at`
- `version`
- `client_id` — idempotency key
- `sync_state`
- `created_at`
- `updated_at`

### `categories`

- `id`, `user_id`, `name`, `color`, `icon`, `is_default`, `created_at`

### `tags`

- `id`, `user_id`, `name`, `created_at`

### `note_tags`

- `note_id`, `tag_id`

### `note_fts`

- Full-text index over title, body, and derived tag/category text (SQLite FTS5 / Postgres `tsvector`).

### `attachments`

- `id`, `note_id`, `storage_path`, `file_name`, `mime_type`, `file_size`, `upload_state`, `exif_stripped`, `created_at`

### `transactions`

- `id`, `note_id`, `amount_minor`, `currency`, `merchant_id`, `payment_method`, `status`, `transaction_date`, `due_date`, `created_at`, `updated_at`

### `merchants`

- `id`, `user_id`, `name`, `created_at`

### `orders`

- `id`, `note_id`, `merchant_id`, `order_reference`, `items` (JSONB), `total_amount_minor`, `currency`, `payment_status`, `delivery_status`, `ordered_at`, `expected_delivery_at`, `delivered_at`, `tracking_reference`, `created_at`, `updated_at`

### `reminders`

- `id`, `note_id`, `title`, `description`, `due_at`, `timezone`, `recurrence_rule`, `next_occurrence`, `notification_enabled`, `device_notification_id`, `created_at`, `updated_at`

### `ai_processing_jobs`

- `id`, `note_id`, `job_type`, `status`, `model_name`, `input_version`, `result_json`, `error_message`, `created_at`, `completed_at`

### `ai_conversations` / `ai_messages`

- Local by default: questions, answers, cited note IDs.

### Local-only tables

- `sync_outbox` — pending changes
- `tombstones` — deletions to propagate
- `sync_meta` — cursors and device identity

**Rules:** timestamps in UTC with IANA timezone retained; soft deletion with manual purge; AI output separate from original text; validated JSON schemas for structured metadata; indexes on `user_id`, `occurred_at`, `category_id`, `expires_at`, `due_at`.

---

## 6. Search and AI design

### Keyword search

- FTS5 locally, `tsvector` in Postgres.
- Filters compose with FTS.
- Results ranked by relevance, then date.
- Tag and category names are searchable.

### AI extraction

- Strict JSON schema output.
- Per-field confidence and `confirmed` flag; unknown values stay null.
- Never turn an intention into a completed payment.
- User confirmation is always available; low-confidence fields are highlighted.

### AI question answering

1. Parse intent into an allowlisted filter set.
2. Build a safe query server-side (never raw SQL from the model).
3. Retrieve matching records and source notes.
4. Generate an answer only from retrieved evidence.
5. Return cited note IDs and short excerpts.
6. If nothing matches, say so honestly.

### Safety and cost

- AI requests go through a secure backend; provider keys never ship in the app.
- Anonymous access uses Supabase anonymous auth for a stable identity and RLS.
- Per-user and per-IP quotas; device attestation where available.
- Prompt-injection defenses: note and receipt text is always treated as data.
- First-use consent; no model training on personal data; minimal logging.

---

## 7. Offline and synchronization

1. Save new notes and edits to encrypted SQLite immediately.
2. Write an outbox row in the same transaction.
3. Sync when connectivity is available; replay is idempotent via `client_id`.
4. Resolve conflicts per field: last-write-wins, with server winning AI fields and client winning user edits.
5. Deletions use tombstones; deletes always win.
6. Show sync status and failures to the user.
7. AI and cloud-wide search require connectivity; all capture and browsing work offline.

---

## 8. Lifecycles and deletion

- **Scratchpad:** active -> expiring (notified) -> user action. Nothing auto-deletes.
- **Trash:** manual "Empty trash" with count and size preview; no timed purge.
- **Server and background jobs:** may flag expired, trashed, or old items, but may never delete them.
- **Account/data deletion:** re-authenticate -> explicit confirm -> purge auth record, database rows, storage objects, and vectors. Offer export first.
- **Backups:** user-managed; no automatic backup expiry without confirmation.
- **Restore:** re-applies expiry rules and skips expired or trashed items, informing the user.

---

## 9. Security and privacy

- Encrypted local database (SQLCipher via `op-sqlite`) and encrypted attachment files.
- Per-file keys held in platform secure storage.
- HTTPS for all network traffic.
- RLS enforced and tested on every user-owned table.
- Short-lived signed URLs for private attachments.
- EXIF/GPS metadata stripped before upload.
- No secrets in the mobile bundle.
- No raw note content in logs.
- Clear AI consent and opt-out.
- Documented export format and retention policy.

---

## 10. Technology stack

| Layer | Technology |
| --- | --- |
| Mobile app | React Native + Expo |
| Language | TypeScript |
| Navigation | Expo Router |
| Local database | `op-sqlite` (SQLCipher) + FTS5 |
| Server state | TanStack Query |
| Local state | Zustand |
| Backend | Supabase (Postgres, Auth incl. anonymous, Storage, RLS) |
| AI | LLM API via backend functions |
| Speech | Speech-to-text via backend |
| Notifications | Expo Notifications (local) |
| Error monitoring | Sentry |

Technology may be adjusted during implementation, but the product stays mobile-only.

---

## 11. Suggested project structure

```text
memory-book/
├── app/
│   ├── (tabs)/
│   │   ├── _layout.tsx
│   │   ├── index.tsx        # Home
│   │   ├── timeline.tsx
│   │   ├── search.tsx       # Search / Ask
│   │   └── scratchpad.tsx
│   ├── note/[id].tsx
│   ├── capture.tsx
│   ├── reminders.tsx
│   ├── settings/
│   ├── _layout.tsx
│   └── index.tsx
├── src/
│   ├── components/
│   ├── db/
│   │   ├── schema.ts
│   │   ├── migrations.ts
│   │   └── repositories/
│   ├── services/
│   ├── hooks/
│   ├── stores/
│   ├── types/
│   ├── utils/
│   └── constants/
├── assets/
├── tests/
├── app.json
├── package.json
└── tsconfig.json
```

---

## 12. Build milestones

0. Scaffold Expo/TypeScript/Router, encrypted SQLite, schema, migrations, CI.
1. Notes CRUD, categories, tags (inline creation), Timeline.
2. Search, filters, sorting.
3. Scratchpad, Trash, Storage & cleanup.
4. Photos/documents, offline upload, EXIF stripping.
5. Payments/orders forms, local Reminders.
6. Sync outbox, conflicts, export/import/restore, deletion flows.
7. AI extraction and editable review.
8. AI Ask with citations, quotas, consent.
9. Security review, E2E, performance, accessibility, release.

**Cut order if time is short:** AI Ask -> advanced/semantic search -> payment/order depth -> recurring reminders. Never cut encryption, sync correctness, or backup/restore.

---

## 13. Acceptance criteria

- A note saves instantly and survives an immediate app kill; AI failure never loses it.
- A category or tag can be created inline and used immediately.
- Search finds a note by a word, a tag, a category, and a date range.
- A Scratchpad note past 7 days is flagged, not deleted.
- Money is stored as integer minor units and never mixes currencies.
- AI answers cite source notes; no match yields an honest "none found".
- AI fields require confirmation; original text is unchanged.
- Offline captures sync later without duplicates; edits and deletes follow LWW + tombstones.
- One user cannot read another user's data.
- Local DB and files are encrypted; EXIF is stripped; account purge removes auth, DB, storage, and vectors.

---

## 14. Success metrics

- Median time to create a basic note.
- Notes captured per active user per week.
- Percentage of AI suggestions accepted without correction.
- Search success rate (result opened).
- Percentage of AI answers with valid citations.
- Reminders completed on time.
- Offline sync success rate.
- Crash-free sessions.

Optimize for reliable capture and successful recall, not for AI conversation count.


opencode --session ses_e4b54a11affemCetBjvOP2Bapy