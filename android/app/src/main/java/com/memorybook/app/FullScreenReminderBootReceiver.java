package com.memorybook.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.List;

public class FullScreenReminderBootReceiver extends BroadcastReceiver {
  @Override
  public void onReceive(Context context, Intent intent) {
    String action = intent.getAction();
    if (!Intent.ACTION_BOOT_COMPLETED.equals(action)
        && !Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) {
      return;
    }

    long now = System.currentTimeMillis();
    List<JSONObject> reminders = FullScreenReminderScheduler.getAll(context);
    for (JSONObject reminder : reminders) {
      try {
        String id = reminder.optString(FullScreenReminderReceiver.EXTRA_ID, "");
        if (id.isEmpty()) {
          FullScreenReminderScheduler.removeRecord(context, id);
          continue;
        }

        String recurrence =
            reminder.optString(FullScreenReminderReceiver.EXTRA_RECURRENCE, "none");
        long dueAt = reminder.optLong(FullScreenReminderReceiver.EXTRA_DUE_AT, 0);
        if (dueAt <= now) {
          if ("none".equals(recurrence)) {
            FullScreenReminderScheduler.removeRecord(context, id);
            continue;
          }
          long next = FullScreenReminderScheduler.nextTriggerAt(dueAt, recurrence, now);
          if (next <= 0) {
            FullScreenReminderScheduler.removeRecord(context, id);
            continue;
          }
          reminder.put(FullScreenReminderReceiver.EXTRA_DUE_AT, next);
          reminder.put(FullScreenReminderReceiver.EXTRA_FULL_SCREEN, false);
          FullScreenReminderScheduler.save(context, reminder);
        }

        FullScreenReminderScheduler.scheduleAlarm(
            context,
            reminder,
            reminder.optBoolean(FullScreenReminderReceiver.EXTRA_FULL_SCREEN, false));
      } catch (JSONException error) {
        FullScreenReminderScheduler.removeRecord(
            context, reminder.optString(FullScreenReminderReceiver.EXTRA_ID, ""));
      }
    }
  }
}
