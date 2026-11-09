package com.memorybook.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import org.json.JSONException;
import org.json.JSONObject;

public class FullScreenReminderReceiver extends BroadcastReceiver {
  public static final String ACTION_FIRE = "com.memorybook.app.FIRE_REMINDER";
  public static final String EXTRA_ID = "reminderId";
  public static final String EXTRA_TITLE = "title";
  public static final String EXTRA_DESCRIPTION = "description";
  public static final String EXTRA_DUE_AT = "dueAt";
  public static final String EXTRA_RECURRENCE = "recurrence";
  public static final String EXTRA_FULL_SCREEN = "fullScreen";
  private static final String CHANNEL_ID = "memory-book-full-screen-reminders";

  @Override
  public void onReceive(Context context, Intent intent) {
    if (!ACTION_FIRE.equals(intent.getAction())) {
      return;
    }

    String id = intent.getStringExtra(EXTRA_ID);
    if (id == null || id.isEmpty()) {
      return;
    }

    String title = valueOrFallback(intent.getStringExtra(EXTRA_TITLE), "Memory Book reminder");
    String description = valueOrFallback(intent.getStringExtra(EXTRA_DESCRIPTION), "");
    long dueAt = intent.getLongExtra(EXTRA_DUE_AT, System.currentTimeMillis());
    String recurrence = valueOrFallback(intent.getStringExtra(EXTRA_RECURRENCE), "none");
    boolean wantsFullScreen = intent.getBooleanExtra(EXTRA_FULL_SCREEN, true);
    boolean fullScreenNotification = wantsFullScreen && canUseFullScreenIntent(context);
    boolean launchDirectly = wantsFullScreen && canDrawOverlays(context);

    ensureChannel(context);

    Intent openIntent = new Intent(
            Intent.ACTION_VIEW,
            Uri.parse("memorybook://reminder-alert?reminderId=" + Uri.encode(id)))
        .setClass(context, MainActivity.class)
        .addFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK
                | Intent.FLAG_ACTIVITY_CLEAR_TOP
                | Intent.FLAG_ACTIVITY_SINGLE_TOP);
    PendingIntent contentIntent =
        PendingIntent.getActivity(
            context,
            id.hashCode(),
            openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

    Intent alertIntent = new Intent(context, FullScreenReminderActivity.class)
        .putExtras(intent)
        .addFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK
                | Intent.FLAG_ACTIVITY_CLEAR_TOP
                | Intent.FLAG_ACTIVITY_SINGLE_TOP);
    PendingIntent alertPendingIntent =
        PendingIntent.getActivity(
            context,
            id.hashCode() + 1,
            alertIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

    Notification.Builder builder =
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? new Notification.Builder(context, CHANNEL_ID)
            : new Notification.Builder(context);
    builder
        .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
        .setContentTitle(title)
        .setContentText(description.isEmpty() ? "Tap to view this reminder" : description)
        .setContentIntent(contentIntent)
        .setWhen(dueAt)
        .setShowWhen(true)
        .setDefaults(Notification.DEFAULT_ALL)
        .setVisibility(Notification.VISIBILITY_PUBLIC);

    if (fullScreenNotification) {
      builder
          .setCategory(Notification.CATEGORY_ALARM)
          .setPriority(Notification.PRIORITY_MAX)
          .setOngoing(true)
          .setAutoCancel(false)
          .setFullScreenIntent(alertPendingIntent, true);
    } else {
      builder
          .setCategory(Notification.CATEGORY_REMINDER)
          .setPriority(Notification.PRIORITY_HIGH)
          .setOngoing(false)
          .setAutoCancel(true);
    }

    NotificationManager manager =
        (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
    if (manager != null) {
      manager.notify(id.hashCode(), builder.build());
    }

    if (launchDirectly) {
      try {
        context.startActivity(openIntent);
      } catch (RuntimeException ignored) {
      }
    }

    if ("none".equals(recurrence)) {
      FullScreenReminderScheduler.removeRecord(context, id);
      return;
    }

    long next = FullScreenReminderScheduler.nextTriggerAt(
        dueAt, recurrence, System.currentTimeMillis());
    if (next <= 0) {
      FullScreenReminderScheduler.removeRecord(context, id);
      return;
    }

    try {
      JSONObject reminder = new JSONObject()
          .put(EXTRA_ID, id)
          .put(EXTRA_TITLE, title)
          .put(EXTRA_DESCRIPTION, description)
          .put(EXTRA_DUE_AT, next)
          .put(EXTRA_RECURRENCE, recurrence);
      FullScreenReminderScheduler.schedule(context, reminder, false);
    } catch (JSONException error) {
      FullScreenReminderScheduler.removeRecord(context, id);
    }
  }

  private static boolean canUseFullScreenIntent(Context context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      return true;
    }
    NotificationManager manager =
        (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
    return manager != null && manager.canUseFullScreenIntent();
  }

  private static boolean canDrawOverlays(Context context) {
    return Build.VERSION.SDK_INT < Build.VERSION_CODES.M
        || Settings.canDrawOverlays(context);
  }

  private static void ensureChannel(Context context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return;
    }
    NotificationManager manager =
        (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
    if (manager == null) {
      return;
    }
    NotificationChannel channel = new NotificationChannel(
        CHANNEL_ID,
        "Memory Book full-screen reminders",
        NotificationManager.IMPORTANCE_HIGH);
    channel.setDescription("Full-screen reminders and repeating reminder alerts");
    channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
    channel.enableVibration(true);
    channel.setVibrationPattern(new long[] {0, 250, 150, 250});
    manager.createNotificationChannel(channel);
  }

  private static String valueOrFallback(String value, String fallback) {
    return value == null || value.isEmpty() ? fallback : value;
  }
}
