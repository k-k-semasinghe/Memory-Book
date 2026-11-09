import * as Notifications from 'expo-notifications';
import { NativeModules, Platform } from 'react-native';

import type { Reminder } from './types';
import { updateReminderNotification } from './db/repositories/reminders';

export const REMINDER_CATEGORY = 'memory-book-reminder';
export const REMINDER_DONE_ACTION = 'reminder-done';
export const REMINDER_CHANNEL = 'memory-book-reminders';

interface FullScreenReminderNativeModule {
  schedule(
    id: string,
    title: string,
    description: string,
    dueAt: number,
    recurrence: string,
  ): Promise<void>;
  cancel(id: string): Promise<void>;
}

const fullScreenReminder =
  Platform.OS === 'android'
    ? (NativeModules.FullScreenReminder as FullScreenReminderNativeModule | undefined)
    : undefined;

export async function configureReminderNotifications(): Promise<void> {
  await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL, {
    name: 'Memory Book reminders',
    importance: Notifications.AndroidImportance.MAX,
    sound: 'default',
    vibrationPattern: [0, 250, 150, 250],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
  await Notifications.setNotificationCategoryAsync(REMINDER_CATEGORY, [
    {
      identifier: REMINDER_DONE_ACTION,
      buttonTitle: 'Done',
      options: { opensAppToForeground: false },
    },
  ]);
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function scheduleReminder(reminder: Reminder): Promise<void> {
  const permissions = await Notifications.getPermissionsAsync();
  let granted = permissions.granted;
  if (!granted) {
    const requested = await Notifications.requestPermissionsAsync();
    granted = requested.granted;
  }
  if (!granted) throw new Error('Notifications permission is required for reminders.');
  if (reminder.deviceNotificationId) {
    await Notifications.cancelScheduledNotificationAsync(reminder.deviceNotificationId);
  }

  const date = new Date(reminder.dueAt);
  if (Platform.OS === 'android' && fullScreenReminder) {
    await fullScreenReminder.schedule(
      reminder.id,
      reminder.title,
      reminder.description ?? '',
      date.getTime(),
      reminder.recurrence,
    );
    await updateReminderNotification(reminder.id, null);
    return;
  }

  let trigger: Notifications.NotificationTriggerInput;
  switch (reminder.recurrence) {
    case 'hourly':
      trigger = { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 3600, repeats: true };
      break;
    case 'daily':
      trigger = { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: date.getHours(), minute: date.getMinutes() };
      break;
    case 'weekly':
      trigger = { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: date.getDay() + 1, hour: date.getHours(), minute: date.getMinutes() };
      break;
    case 'yearly':
      trigger = { type: Notifications.SchedulableTriggerInputTypes.YEARLY, month: date.getMonth(), day: date.getDate(), hour: date.getHours(), minute: date.getMinutes() };
      break;
    default:
      trigger = { type: Notifications.SchedulableTriggerInputTypes.DATE, date };
  }

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: reminder.title,
      body: reminder.description ?? 'Memory Book reminder',
      data: { reminderId: reminder.id },
      categoryIdentifier: REMINDER_CATEGORY,
      sound: 'default',
      priority: 'max',
      color: '#39E6F2',
      autoDismiss: false,
      sticky: true,
    },
    trigger: {
      ...trigger,
      channelId: REMINDER_CHANNEL,
    },
  });
  await updateReminderNotification(reminder.id, notificationId);
}

export async function cancelReminder(reminder: Reminder): Promise<void> {
  if (Platform.OS === 'android' && fullScreenReminder) {
    await fullScreenReminder.cancel(reminder.id);
  } else if (reminder.deviceNotificationId) {
    await Notifications.cancelScheduledNotificationAsync(reminder.deviceNotificationId);
  }
  await updateReminderNotification(reminder.id, null);
}
