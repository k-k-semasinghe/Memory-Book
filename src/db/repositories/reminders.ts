import type { Reminder, ReminderInput, ReminderRecurrence } from '../../types';
import { deviceTimeZone, nowIso } from '../../utils/dates';
import { newId } from '../../utils/id';
import { getDb } from '../database';

type ReminderRow = {
  id: string;
  note_id: string | null;
  title: string;
  description: string | null;
  due_at: string;
  timezone: string;
  recurrence_rule: string | null;
  next_occurrence: string | null;
  notification_enabled: number;
  device_notification_id: string | null;
  created_at: string;
  updated_at: string;
};

function mapReminder(row: ReminderRow): Reminder {
  return {
    id: row.id,
    noteId: row.note_id,
    title: row.title,
    description: row.description,
    dueAt: row.due_at,
    timezone: row.timezone,
    recurrence: (row.recurrence_rule as ReminderRecurrence | null) ?? 'none',
    nextOccurrence: row.next_occurrence,
    notificationEnabled: row.notification_enabled === 1,
    deviceNotificationId: row.device_notification_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listReminders(): Promise<Reminder[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ReminderRow>(
    'SELECT * FROM reminders ORDER BY due_at ASC',
  );
  return rows.map(mapReminder);
}

export async function listRemindersForNote(noteId: string): Promise<Reminder[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ReminderRow>(
    'SELECT * FROM reminders WHERE note_id = ? ORDER BY due_at ASC',
    [noteId],
  );
  return rows.map(mapReminder);
}

export async function createReminder(input: ReminderInput): Promise<Reminder> {
  const title = input.title.trim();
  if (!title) throw new Error('Enter a reminder title.');
  const db = await getDb();
  const id = newId();
  const now = nowIso();
  await db.runAsync(
    `INSERT INTO reminders (
      id, note_id, title, description, due_at, timezone, recurrence_rule,
      next_occurrence, notification_enabled, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    [
      id,
      input.noteId ?? null,
      title,
      input.description?.trim() || null,
      input.dueAt,
      deviceTimeZone(),
      input.recurrence,
      input.dueAt,
      now,
      now,
    ],
  );
  const reminder = await getReminder(id);
  if (!reminder) throw new Error('Could not save the reminder.');
  return reminder;
}

export async function getReminder(id: string): Promise<Reminder | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<ReminderRow>(
    'SELECT * FROM reminders WHERE id = ?',
    [id],
  );
  return row ? mapReminder(row) : null;
}

export async function updateReminderNotification(
  id: string,
  deviceNotificationId: string | null,
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE reminders SET device_notification_id = ?, updated_at = ? WHERE id = ?',
    [deviceNotificationId, nowIso(), id],
  );
}

export async function deleteReminder(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM reminders WHERE id = ?', [id]);
}
