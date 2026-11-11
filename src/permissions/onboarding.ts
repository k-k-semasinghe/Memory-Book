import * as SecureStore from 'expo-secure-store';

const ONBOARDING_KEY = 'memory-book.permissions.onboarding.v2';

export async function hasSeenPermissionOnboarding(): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(ONBOARDING_KEY)) === '1';
  } catch {
    return false;
  }
}

export async function markPermissionOnboardingSeen(): Promise<void> {
  try {
    await SecureStore.setItemAsync(ONBOARDING_KEY, '1');
  } catch {
    return;
  }
}
