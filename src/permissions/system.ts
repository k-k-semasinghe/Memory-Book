import * as Notifications from 'expo-notifications';
import { Linking, NativeModules, Platform } from 'react-native';

export type NotificationAccess = 'granted' | 'denied' | 'undetermined';
export type SpecialAccess = 'granted' | 'denied' | 'not_required';

export interface PermissionState {
  notifications: NotificationAccess;
  notificationsCanAskAgain: boolean;
  exactAlarms: SpecialAccess;
  fullScreenIntent: SpecialAccess;
  overlay: SpecialAccess;
}

interface FullScreenReminderPermissionModule {
  getPermissionStatus(): Promise<{
    exactAlarms: boolean;
    fullScreenIntent: boolean;
    overlay: boolean;
  }>;
  openExactAlarmSettings(): Promise<boolean>;
  openFullScreenIntentSettings(): Promise<boolean>;
  openOverlaySettings(): Promise<boolean>;
  openNotificationSettings(): Promise<boolean>;
}

const nativePermissions =
  Platform.OS === 'android'
    ? (NativeModules.FullScreenReminder as
        | FullScreenReminderPermissionModule
        | undefined)
    : undefined;

const androidApiLevel =
  Platform.OS === 'android' ? Number(Platform.Version) : 0;

export async function getPermissionState(): Promise<PermissionState> {
  const notifications = await Notifications.getPermissionsAsync();
  let exactAlarms: SpecialAccess = 'not_required';
  let fullScreenIntent: SpecialAccess = 'not_required';
  let overlay: SpecialAccess = 'not_required';

  if (Platform.OS === 'android' && nativePermissions) {
    try {
      const nativeStatus = await nativePermissions.getPermissionStatus();
      if (androidApiLevel >= 31) {
        exactAlarms = nativeStatus.exactAlarms ? 'granted' : 'denied';
      }
      if (androidApiLevel >= 34) {
        fullScreenIntent = nativeStatus.fullScreenIntent ? 'granted' : 'denied';
      }
      if (androidApiLevel >= 23) {
        overlay = nativeStatus.overlay ? 'granted' : 'denied';
      }
    } catch {
      if (androidApiLevel >= 31) exactAlarms = 'denied';
      if (androidApiLevel >= 34) fullScreenIntent = 'denied';
      if (androidApiLevel >= 23) overlay = 'denied';
    }
  }

  const notificationAccess: NotificationAccess = notifications.granted
    ? 'granted'
    : notifications.status === 'undetermined'
      ? 'undetermined'
      : 'denied';

  return {
    notifications: notificationAccess,
    notificationsCanAskAgain: notifications.canAskAgain,
    exactAlarms,
    fullScreenIntent,
    overlay,
  };
}

export async function requestNotificationPermission(): Promise<void> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return;
  if (!current.canAskAgain) {
    await openNotificationSettings();
    return;
  }
  await Notifications.requestPermissionsAsync();
}

export async function openExactAlarmSettings(): Promise<boolean> {
  if (
    Platform.OS !== 'android' ||
    !nativePermissions ||
    androidApiLevel < 31
  ) {
    return false;
  }
  return nativePermissions.openExactAlarmSettings();
}

export async function openFullScreenIntentSettings(): Promise<boolean> {
  if (
    Platform.OS !== 'android' ||
    !nativePermissions ||
    androidApiLevel < 34
  ) {
    return false;
  }
  return nativePermissions.openFullScreenIntentSettings();
}

export async function openOverlaySettings(): Promise<boolean> {
  if (
    Platform.OS !== 'android' ||
    !nativePermissions ||
    androidApiLevel < 23
  ) {
    return false;
  }
  return nativePermissions.openOverlaySettings();
}

export async function openNotificationSettings(): Promise<boolean> {
  if (Platform.OS === 'android' && nativePermissions) {
    return nativePermissions.openNotificationSettings();
  }
  await Linking.openSettings();
  return true;
}
