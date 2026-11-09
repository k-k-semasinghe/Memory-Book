import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { cancelReminder, scheduleReminder } from '../notifications';
import {
  createReminder,
  deleteReminder,
  listReminders,
  listRemindersForNote,
} from '../db/repositories/reminders';
import type { Reminder, ReminderInput } from '../types';

export const reminderKeys = {
  all: ['reminders'] as const,
  note: (noteId: string) => ['reminders', 'note', noteId] as const,
};

function invalidateReminders(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: reminderKeys.all });
}

export function useReminders() {
  return useQuery({ queryKey: reminderKeys.all, queryFn: listReminders });
}

export function useNoteReminders(noteId: string | null | undefined) {
  return useQuery({
    queryKey: reminderKeys.note(noteId ?? ''),
    queryFn: () => listRemindersForNote(noteId ?? ''),
    enabled: Boolean(noteId),
  });
}

export function useCreateReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ReminderInput) => {
      const reminder = await createReminder(input);
      try {
        await scheduleReminder(reminder);
      } catch (error) {
        await deleteReminder(reminder.id);
        throw error;
      }
      return reminder;
    },
    onSuccess: (reminder) => {
      invalidateReminders(queryClient);
      if (reminder.noteId) void queryClient.invalidateQueries({ queryKey: reminderKeys.note(reminder.noteId) });
    },
  });
}

export function useDeleteReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reminder: Reminder) => {
      await cancelReminder(reminder);
      await deleteReminder(reminder.id);
      return reminder;
    },
    onSuccess: (reminder) => {
      invalidateReminders(queryClient);
      if (reminder.noteId) void queryClient.invalidateQueries({ queryKey: reminderKeys.note(reminder.noteId) });
    },
  });
}
