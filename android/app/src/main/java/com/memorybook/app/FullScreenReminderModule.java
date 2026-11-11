package com.memorybook.app;

import android.app.AlarmManager;
import android.app.NotificationManager;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;

import org.json.JSONException;
import org.json.JSONObject;

public class FullScreenReminderModule extends ReactContextBaseJavaModule {
  private static final String MODULE_NAME = "FullScreenReminder";

  public FullScreenReminderModule(ReactApplicationContext context) {
    super(context);
  }

  @NonNull
  @Override
  public String getName() {
    return MODULE_NAME;
  }

  @ReactMethod
  public void schedule(
      String id,
      String title,
      String description,
      double dueAt,
      String recurrence,
      Promise promise) {
    try {
      JSONObject reminder = new JSONObject()
          .put(FullScreenReminderReceiver.EXTRA_ID, id)
          .put(FullScreenReminderReceiver.EXTRA_TITLE, title)
          .put(FullScreenReminderReceiver.EXTRA_DESCRIPTION, description)
          .put(FullScreenReminderReceiver.EXTRA_DUE_AT, (long) dueAt)
          .put(FullScreenReminderReceiver.EXTRA_RECURRENCE, recurrence);
      FullScreenReminderScheduler.schedule(
          getReactApplicationContext(), reminder, true);
      promise.resolve(null);
    } catch (JSONException | RuntimeException error) {
      promise.reject("reminder_schedule_failed", error);
    }
  }

  @ReactMethod
  public void cancel(String id, Promise promise) {
    try {
      FullScreenReminderScheduler.cancel(getReactApplicationContext(), id);
      promise.resolve(null);
    } catch (RuntimeException error) {
      promise.reject("reminder_cancel_failed", error);
    }
  }

  @ReactMethod
  public void clearPending(String id, Promise promise) {
    try {
      PendingReminderStore.clear(getReactApplicationContext(), id);
      promise.resolve(null);
    } catch (RuntimeException error) {
      promise.reject("reminder_pending_failed", error);
    }
  }

  @ReactMethod
  public void dismissNotification(String id, Promise promise) {
    try {
      NotificationManager manager =
          (NotificationManager) getReactApplicationContext()
              .getSystemService(Context.NOTIFICATION_SERVICE);
      if (manager != null) {
        manager.cancel(id.hashCode());
      }
      promise.resolve(null);
    } catch (RuntimeException error) {
      promise.reject("reminder_dismiss_failed", error);
    }
  }

  @ReactMethod
  public void getLastCrash(Promise promise) {
    try {
      promise.resolve(CrashLogger.readAndClear(getReactApplicationContext()));
    } catch (RuntimeException error) {
      promise.reject("crash_log_failed", error);
    }
  }

  @ReactMethod
  public void getPermissionStatus(Promise promise) {
    try {
      WritableMap status = Arguments.createMap();
      boolean exactAlarms = true;
      boolean fullScreenIntent = true;
      boolean overlay = true;
      Context context = getReactApplicationContext();

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        AlarmManager alarmManager =
            (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        exactAlarms = alarmManager != null && alarmManager.canScheduleExactAlarms();
      }
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
        NotificationManager notificationManager =
            (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        fullScreenIntent =
            notificationManager != null && notificationManager.canUseFullScreenIntent();
      }
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        overlay = Settings.canDrawOverlays(context);
      }

      status.putBoolean("exactAlarms", exactAlarms);
      status.putBoolean("fullScreenIntent", fullScreenIntent);
      status.putBoolean("overlay", overlay);
      promise.resolve(status);
    } catch (RuntimeException error) {
      promise.reject("permission_status_failed", error);
    }
  }

  @ReactMethod
  public void openExactAlarmSettings(Promise promise) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
      promise.resolve(false);
      return;
    }
    Context context = getReactApplicationContext();
    Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM)
        .setData(Uri.parse("package:" + context.getPackageName()));
    openSettingsIntent(intent, promise);
  }

  @ReactMethod
  public void openFullScreenIntentSettings(Promise promise) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      promise.resolve(false);
      return;
    }
    Context context = getReactApplicationContext();
    Intent intent = new Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT)
        .setData(Uri.parse("package:" + context.getPackageName()));
    openSettingsIntent(intent, promise);
  }

  @ReactMethod
  public void openOverlaySettings(Promise promise) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
      promise.resolve(false);
      return;
    }
    Context context = getReactApplicationContext();
    Intent intent = new Intent(
            Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
            Uri.parse("package:" + context.getPackageName()));
    openSettingsIntent(intent, promise);
  }

  @ReactMethod
  public void openNotificationSettings(Promise promise) {
    Context context = getReactApplicationContext();
    Intent intent = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
        .putExtra(Settings.EXTRA_APP_PACKAGE, context.getPackageName());
    openSettingsIntent(intent, promise);
  }

  private void openSettingsIntent(Intent intent, Promise promise) {
    Context context = getReactApplicationContext();
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
    try {
      context.startActivity(intent);
      promise.resolve(true);
    } catch (ActivityNotFoundException error) {
      Intent details = new Intent(
              Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
              Uri.parse("package:" + context.getPackageName()))
          .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
      try {
        context.startActivity(details);
        promise.resolve(true);
      } catch (ActivityNotFoundException fallbackError) {
        promise.resolve(false);
      }
    }
  }
}
