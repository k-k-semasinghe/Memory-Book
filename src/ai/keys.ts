import * as SecureStore from 'expo-secure-store';

import type { AIKeyStatus, AIProviderId } from './types';

const KEY_NAMES: Record<AIProviderId, string> = {
  gemini: 'memory-book.ai.gemini.key',
  groq: 'memory-book.ai.groq.key',
};

export async function getAIKey(provider: AIProviderId): Promise<string | null> {
  try {
    const value = await SecureStore.getItemAsync(KEY_NAMES[provider]);
    return value?.trim() || null;
  } catch {
    return null;
  }
}

export async function setAIKey(
  provider: AIProviderId,
  key: string,
): Promise<void> {
  await SecureStore.setItemAsync(KEY_NAMES[provider], key.trim());
}

export async function deleteAIKey(provider: AIProviderId): Promise<void> {
  await SecureStore.deleteItemAsync(KEY_NAMES[provider]);
}

export async function getAIKeyStatus(): Promise<AIKeyStatus> {
  const [gemini, groq] = await Promise.all([
    getAIKey('gemini'),
    getAIKey('groq'),
  ]);
  return { gemini: Boolean(gemini), groq: Boolean(groq) };
}
