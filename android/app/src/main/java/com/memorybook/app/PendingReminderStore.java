package com.memorybook.app;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONException;
import org.json.JSONObject;

public final class PendingReminderStore {
  private static final String PREFS_NAME = "memory_book_pending_reminder";
  private static final String KEY_PENDING = "pending";

  private PendingReminderStore() {}

  public static void save(
      Context context, String id, String title, String description, long dueAt) {
    try {
      JSONObject pending = new JSONObject()
          .put(FullScreenReminderReceiver.EXTRA_ID, id)
          .put(FullScreenReminderReceiver.EXTRA_TITLE, title)
          .put(FullScreenReminderReceiver.EXTRA_DESCRIPTION, description)
          .put(FullScreenReminderReceiver.EXTRA_DUE_AT, dueAt);
      preferences(context).edit().putString(KEY_PENDING, pending.toString()).apply();
    } catch (JSONException ignored) {
    }
  }

  public static JSONObject get(Context context) {
    String raw = preferences(context).getString(KEY_PENDING, null);
    if (raw == null || raw.isEmpty()) {
      return null;
    }
    try {
      return new JSONObject(raw);
    } catch (JSONException error) {
      clear(context);
      return null;
    }
  }

  public static void clear(Context context) {
    preferences(context).edit().remove(KEY_PENDING).apply();
  }

  public static void clear(Context context, String id) {
    JSONObject pending = get(context);
    if (pending != null && id.equals(pending.optString(FullScreenReminderReceiver.EXTRA_ID, ""))) {
      clear(context);
    }
  }

  private static SharedPreferences preferences(Context context) {
    return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
  }
}
