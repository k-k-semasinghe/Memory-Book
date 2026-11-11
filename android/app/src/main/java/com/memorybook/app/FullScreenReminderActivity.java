package com.memorybook.app;

import android.app.Activity;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

public class FullScreenReminderActivity extends Activity {
  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    getWindow().addFlags(
        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
            | WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
            | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
            | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
    );
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      setShowWhenLocked(true);
      setTurnScreenOn(true);
    }
    renderReminder();
    enterImmersiveMode();
    clearPendingReminder();
  }

  @Override
  public void onBackPressed() {
    cancelNotification();
    finishAndRemoveTask();
  }

  @Override
  protected void onNewIntent(Intent intent) {
    super.onNewIntent(intent);
    setIntent(intent);
    renderReminder();
    clearPendingReminder();
  }

  private void clearPendingReminder() {
    String id = getIntent().getStringExtra(FullScreenReminderReceiver.EXTRA_ID);
    if (id != null && !id.isEmpty()) {
      PendingReminderStore.clear(this, id);
    }
  }

  private void renderReminder() {
    int padding = (int) (getResources().getDisplayMetrics().density * 24);
    LinearLayout layout = new LinearLayout(this);
    layout.setOrientation(LinearLayout.VERTICAL);
    layout.setGravity(Gravity.CENTER);
    layout.setPadding(padding, padding, padding, padding);
    layout.setBackgroundColor(0xFF070A2A);

    TextView label = new TextView(this);
    label.setText("REMINDER");
    label.setTextColor(0xFF39E6F2);
    label.setTextSize(14);
    label.setGravity(Gravity.CENTER);
    layout.addView(label);

    TextView title = new TextView(this);
    title.setText(getIntent().getStringExtra(FullScreenReminderReceiver.EXTRA_TITLE));
    title.setTextColor(0xFFFFF9E8);
    title.setTextSize(30);
    title.setGravity(Gravity.CENTER);
    LinearLayout.LayoutParams titleParams = new LinearLayout.LayoutParams(-1, -2);
    titleParams.setMargins(0, padding, 0, padding);
    layout.addView(title, titleParams);

    String description = getIntent().getStringExtra(FullScreenReminderReceiver.EXTRA_DESCRIPTION);
    if (description != null && !description.isEmpty()) {
      TextView body = new TextView(this);
      body.setText(description);
      body.setTextColor(0xFFB9C9F4);
      body.setTextSize(16);
      body.setGravity(Gravity.CENTER);
      layout.addView(body);
    }

    Button done = new Button(this);
    done.setText("Done");
    done.setOnClickListener(view -> {
      cancelNotification();
      finishAndRemoveTask();
    });

    Button openApp = new Button(this);
    openApp.setText("Open app");
    openApp.setOnClickListener(view -> {
      cancelNotification();
      String id = getIntent().getStringExtra(FullScreenReminderReceiver.EXTRA_ID);
      startActivity(ReminderLauncher.createOpenIntent(this, id != null ? id : ""));
      finishAndRemoveTask();
    });

    LinearLayout buttons = new LinearLayout(this);
    buttons.setOrientation(LinearLayout.HORIZONTAL);
    LinearLayout.LayoutParams doneParams = new LinearLayout.LayoutParams(0, -2, 1f);
    doneParams.setMargins(0, padding * 2, padding / 2, 0);
    LinearLayout.LayoutParams openParams = new LinearLayout.LayoutParams(0, -2, 1f);
    openParams.setMargins(padding / 2, padding * 2, 0, 0);
    buttons.addView(done, doneParams);
    buttons.addView(openApp, openParams);
    layout.addView(buttons);
    setContentView(layout);
  }

  private void cancelNotification() {
    String id = getIntent().getStringExtra(FullScreenReminderReceiver.EXTRA_ID);
    if (id == null || id.isEmpty()) {
      return;
    }
    NotificationManager manager =
        (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
    if (manager != null) {
      manager.cancel(id.hashCode());
    }
  }

  private void enterImmersiveMode() {
    getWindow().getDecorView().post(() -> {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        getWindow().setDecorFitsSystemWindows(false);
        WindowInsetsController controller = getWindow().getInsetsController();
        if (controller != null) {
          controller.hide(
              WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
          controller.setSystemBarsBehavior(
              WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        }
        return;
      }

      getWindow().getDecorView().setSystemUiVisibility(
          View.SYSTEM_UI_FLAG_FULLSCREEN
              | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
              | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
              | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
              | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
              | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
    });
  }
}
