package com.memorybook.app;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;

public final class ReminderLauncher {
  private ReminderLauncher() {}

  public static Intent createOpenIntent(Context context, String id) {
    return new Intent(
            Intent.ACTION_VIEW,
            Uri.parse("memorybook://reminder-alert?reminderId=" + Uri.encode(id)))
        .setClass(context, MainActivity.class)
        .addFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK
                | Intent.FLAG_ACTIVITY_CLEAR_TOP
                | Intent.FLAG_ACTIVITY_SINGLE_TOP);
  }

  public static boolean open(Context context, String id) {
    try {
      context.startActivity(createOpenIntent(context, id));
      return true;
    } catch (RuntimeException error) {
      return false;
    }
  }
}
