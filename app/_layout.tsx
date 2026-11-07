import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { colors } from '../src/constants/theme';

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
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />
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
          <Stack.Screen name="settings" options={{ title: 'Settings' }} />
          <Stack.Screen name="categories" options={{ title: 'Categories' }} />
          <Stack.Screen name="tags" options={{ title: 'Tags' }} />
          <Stack.Screen name="storage" options={{ title: 'Storage & cleanup' }} />
          <Stack.Screen name="trash" options={{ title: 'Trash' }} />
          <Stack.Screen name="reminders" options={{ title: 'Reminders' }} />
        </Stack>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
