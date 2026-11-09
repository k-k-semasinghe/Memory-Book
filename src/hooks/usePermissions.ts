import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import {
  getPermissionState,
  openExactAlarmSettings,
  openFullScreenIntentSettings,
  openNotificationSettings,
  openOverlaySettings,
  requestNotificationPermission,
  type PermissionState,
} from '../permissions/system';

export function usePermissions() {
  const [state, setState] = useState<PermissionState | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setState(await getPermissionState());
    } catch {
      setState(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') void refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  const requestNotifications = useCallback(async () => {
    await requestNotificationPermission();
    await refresh();
  }, [refresh]);

  const openExactAlarms = useCallback(
    async () => openExactAlarmSettings(),
    [],
  );

  const openFullScreen = useCallback(
    async () => openFullScreenIntentSettings(),
    [],
  );

  const openNotifications = useCallback(
    async () => openNotificationSettings(),
    [],
  );

  const openOverlay = useCallback(
    async () => openOverlaySettings(),
    [],
  );

  return {
    state,
    loading,
    refresh,
    requestNotifications,
    openExactAlarms,
    openFullScreen,
    openNotifications,
    openOverlay,
  };
}
