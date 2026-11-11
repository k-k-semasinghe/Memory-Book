import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRootNavigationState, useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { colors } from '../src/constants/theme';
import {
  configureReminderNotifications,
  getLastReminderCrash,
  REMINDER_DONE_ACTION,
} from '../src/notifications';
import { hasSeenPermissionOnboarding } from '../src/permissions/onboarding';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      retry: 1,
    },
  },
});

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppShell />
    </SafeAreaProvider>
  );
}

function AppShell() {
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const checkedPermissionsOnboarding = useRef(false);

  useEffect(() => {
    void getLastReminderCrash().then((log) => {
      if (log) {
        Alert.alert('Reminder crash log', log);
      }
    });
  }, []);

  useEffect(() => {
    if (!rootNavigationState?.key || checkedPermissionsOnboarding.current) {
      return;
    }
    checkedPermissionsOnboarding.current = true;
    void (async () => {
      if (!(await hasSeenPermissionOnboarding())) {
        router.push({
          pathname: '/permissions',
          params: { firstRun: '1' },
        });
      }
    })();
  }, [rootNavigationState?.key, router]);

  useEffect(() => {
    void configureReminderNotifications();
    const receivedSubscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        const reminderId = notification.request.content.data?.reminderId;
        if (typeof reminderId === 'string') {
          void Notifications.dismissNotificationAsync(notification.request.identifier);
          router.push({
            pathname: '/reminder-alert',
            params: { reminderId },
          });
        }
      },
    );
    const handleResponse = (
      response: Notifications.NotificationResponse,
    ) => {
      const notificationId = response.notification.request.identifier;
      if (response.actionIdentifier === REMINDER_DONE_ACTION) {
        void Notifications.dismissNotificationAsync(notificationId);
        return;
      }
      const reminderId = response.notification.request.content.data?.reminderId;
      if (typeof reminderId === 'string') {
        router.push({
          pathname: '/reminder-alert',
          params: { reminderId },
        });
      }
    };
    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener(handleResponse);
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) handleResponse(response);
    });
    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, [router]);

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.background },
            headerShadowVisible: false,
            headerTintColor: colors.text,
            headerTitleStyle: { fontWeight: '700' },
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="capture"
            options={{ presentation: 'modal', headerShown: false }}
          />
          <Stack.Screen
            name="edit/[id]"
            options={{ presentation: 'modal', headerShown: false }}
          />
          <Stack.Screen name="note/[id]" options={{ title: 'Note' }} />
          <Stack.Screen name="ask" options={{ title: 'Ask AI' }} />
          <Stack.Screen name="ai-settings" options={{ title: 'AI settings' }} />
          <Stack.Screen name="extract/[noteId]" options={{ title: 'AI suggestions' }} />
          <Stack.Screen name="settings" options={{ title: 'Settings' }} />
          <Stack.Screen name="categories" options={{ title: 'Categories' }} />
          <Stack.Screen name="tags" options={{ title: 'Tags' }} />
          <Stack.Screen name="storage" options={{ title: 'Storage & cleanup' }} />
          <Stack.Screen name="trash" options={{ title: 'Trash' }} />
          <Stack.Screen name="reminders" options={{ title: 'Reminders' }} />
          <Stack.Screen
            name="permissions"
            options={{ presentation: 'fullScreenModal', headerShown: false }}
          />
          <Stack.Screen
            name="reminder-alert"
            options={{ presentation: 'fullScreenModal', headerShown: false }}
          />
        </Stack>
    </QueryClientProvider>
  );
}
