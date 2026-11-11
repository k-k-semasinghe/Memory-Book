package com.memorybook.app;

import android.app.AlarmManager;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;
import java.util.Map;

public final class FullScreenReminderScheduler {
  private static final String PREFS_NAME = "memory_book_reminders";
  private static final String KEY_PREFIX = "reminder_";

  private FullScreenReminderScheduler() {}

  public static void schedule(Context context, JSONObject reminder, boolean fullScreen) {
    try {
      reminder.put(FullScreenReminderReceiver.EXTRA_FULL_SCREEN, fullScreen);
    } catch (JSONException ignored) {
    }
    save(context, reminder);
    scheduleAlarm(context, reminder, fullScreen);
  }

  public static void save(Context context, JSONObject reminder) {
    String id = reminder.optString(FullScreenReminderReceiver.EXTRA_ID, "");
    if (id.isEmpty()) {
      return;
    }
    preferences(context).edit().putString(KEY_PREFIX + id, reminder.toString()).apply();
  }

  public static void removeRecord(Context context, String id) {
    preferences(context).edit().remove(KEY_PREFIX + id).apply();
  }

  public static void cancel(Context context, String id) {
    removeRecord(context, id);
    cancelAlarm(context, id);
    NotificationManager manager =
        (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
    if (manager != null) {
      manager.cancel(id.hashCode());
    }
  }

  public static void scheduleAlarm(Context context, JSONObject reminder, boolean fullScreen) {
    String id = reminder.optString(FullScreenReminderReceiver.EXTRA_ID, "");
    if (id.isEmpty()) {
      return;
    }

    long dueAt = reminder.optLong(FullScreenReminderReceiver.EXTRA_DUE_AT, 0);
    String recurrence = reminder.optString(FullScreenReminderReceiver.EXTRA_RECURRENCE, "none");
    long now = System.currentTimeMillis();
    long triggerAt = dueAt;
    if (triggerAt <= now) {
      long next = nextTriggerAt(dueAt, recurrence, now);
      triggerAt = next > 0 ? next : now + 1000L;
    }

    Intent intent = new Intent(context, FullScreenReminderReceiver.class)
        .setAction(FullScreenReminderReceiver.ACTION_FIRE)
        .putExtra(FullScreenReminderReceiver.EXTRA_ID, id)
        .putExtra(
            FullScreenReminderReceiver.EXTRA_TITLE,
            reminder.optString(FullScreenReminderReceiver.EXTRA_TITLE, ""))
        .putExtra(
            FullScreenReminderReceiver.EXTRA_DESCRIPTION,
            reminder.optString(FullScreenReminderReceiver.EXTRA_DESCRIPTION, ""))
        .putExtra(FullScreenReminderReceiver.EXTRA_DUE_AT, triggerAt)
        .putExtra(FullScreenReminderReceiver.EXTRA_RECURRENCE, recurrence)
        .putExtra(FullScreenReminderReceiver.EXTRA_FULL_SCREEN, fullScreen);

    PendingIntent pendingIntent =
        PendingIntent.getBroadcast(
            context,
            id.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    AlarmManager alarmManager =
        (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
    if (alarmManager == null) {
      return;
    }

    try {
      boolean canScheduleExact =
          Build.VERSION.SDK_INT < Build.VERSION_CODES.S
              || alarmManager.canScheduleExactAlarms();
      if (canScheduleExact) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
          alarmManager.setExactAndAllowWhileIdle(
              AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent);
        } else {
          alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent);
        }
      } else {
        setInexactAlarm(alarmManager, triggerAt, pendingIntent);
      }
    } catch (SecurityException error) {
      setInexactAlarm(alarmManager, triggerAt, pendingIntent);
    }
  }

  public static long nextTriggerAt(long dueAt, String recurrence, long now) {
    if (recurrence == null || "none".equals(recurrence)) {
      return -1L;
    }

    Calendar calendar = Calendar.getInstance();
    calendar.setTimeInMillis(dueAt);
    int guard = 0;
    while (calendar.getTimeInMillis() <= now && guard < 100000) {
      switch (recurrence) {
        case "hourly":
          calendar.add(Calendar.HOUR_OF_DAY, 1);
          break;
        case "daily":
          calendar.add(Calendar.DAY_OF_YEAR, 1);
          break;
        case "weekly":
          calendar.add(Calendar.WEEK_OF_YEAR, 1);
          break;
        case "yearly":
          calendar.add(Calendar.YEAR, 1);
          break;
        default:
          return -1L;
      }
      guard++;
    }
    return calendar.getTimeInMillis() > now ? calendar.getTimeInMillis() : -1L;
  }

  public static List<JSONObject> getAll(Context context) {
    List<JSONObject> reminders = new ArrayList<>();
    Map<String, ?> values = preferences(context).getAll();
    for (Object value : values.values()) {
      if (!(value instanceof String)) {
        continue;
      }
      try {
        reminders.add(new JSONObject((String) value));
      } catch (JSONException ignored) {
      }
    }
    return reminders;
  }

  private static void cancelAlarm(Context context, String id) {
    Intent intent = new Intent(context, FullScreenReminderReceiver.class)
        .setAction(FullScreenReminderReceiver.ACTION_FIRE);
    PendingIntent pendingIntent =
        PendingIntent.getBroadcast(
            context,
            id.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    AlarmManager alarmManager =
        (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
    if (alarmManager != null) {
      alarmManager.cancel(pendingIntent);
    }
    pendingIntent.cancel();
  }

  private static void setInexactAlarm(
      AlarmManager alarmManager, long triggerAt, PendingIntent pendingIntent) {
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent);
      } else {
        alarmManager.set(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent);
      }
    } catch (SecurityException ignored) {
    }
  }

  private static SharedPreferences preferences(Context context) {
    return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
  }
}
