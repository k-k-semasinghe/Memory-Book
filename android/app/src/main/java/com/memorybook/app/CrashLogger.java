package com.memorybook.app;

import android.content.Context;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;

public final class CrashLogger {
  private static final String FILE_NAME = "last-crash.txt";

  private CrashLogger() {}

  public static void install(Context context) {
    final Context appContext = context.getApplicationContext();
    final Thread.UncaughtExceptionHandler previous =
        Thread.getDefaultUncaughtExceptionHandler();
    Thread.setDefaultUncaughtExceptionHandler(
        (thread, throwable) -> {
          try (FileOutputStream stream =
                   appContext.openFileOutput(FILE_NAME, Context.MODE_PRIVATE);
               PrintWriter writer =
                   new PrintWriter(new OutputStreamWriter(stream))) {
            throwable.printStackTrace(writer);
          } catch (Exception ignored) {
          }
          if (previous != null) {
            previous.uncaughtException(thread, throwable);
          }
        });
  }

  public static String readAndClear(Context context) {
    File file = new File(context.getFilesDir(), FILE_NAME);
    if (!file.exists()) {
      return null;
    }
    StringBuilder text = new StringBuilder();
    try (BufferedReader reader =
             new BufferedReader(
                 new InputStreamReader(new FileInputStream(file)))) {
      String line;
      while ((line = reader.readLine()) != null) {
        text.append(line).append('\n');
      }
    } catch (Exception error) {
      return null;
    } finally {
      file.delete();
    }
    return text.length() == 0 ? null : text.toString();
  }
}
