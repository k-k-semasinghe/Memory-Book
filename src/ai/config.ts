import { getDb } from '../db/database';
import { parseJsonObject } from '../utils/json';
import type { AIConfig, AIProviderId } from './types';

export const AI_MODELS: Record<AIProviderId, string> = {
  gemini: 'gemini-3.5-flash-lite',
  groq: 'openai/gpt-oss-20b',
};

const LEGACY_GEMINI_MODELS = new Set(['gemini-2.5-flash-lite']);

export const DEFAULT_AI_CONFIG: AIConfig = {
  enabled: false,
  provider: 'gemini',
  models: { ...AI_MODELS },
};

const CONFIG_META_KEY = 'ai_config';

export async function getAIConfig(): Promise<AIConfig> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM meta WHERE key = ?',
    [CONFIG_META_KEY],
  );
  const raw = parseJsonObject(row?.value);
  const models = parseJsonObject(
    typeof raw.models === 'string' ? raw.models : JSON.stringify(raw.models ?? {}),
  );

  return {
    enabled: raw.enabled === true,
    provider: raw.provider === 'groq' ? 'groq' : 'gemini',
    models: {
      gemini: normalizeGeminiModel(
        typeof models.gemini === 'string' ? models.gemini : '',
      ),
      groq:
        typeof models.groq === 'string' && models.groq.trim()
          ? models.groq.trim()
          : AI_MODELS.groq,
    },
  };
}

function normalizeGeminiModel(value: string): string {
  const model = value.trim();
  if (!model || LEGACY_GEMINI_MODELS.has(model)) return AI_MODELS.gemini;
  return model;
}

export async function saveAIConfig(config: AIConfig): Promise<void> {
  const db = await getDb();
  const normalized: AIConfig = {
    enabled: config.enabled,
    provider: config.provider === 'groq' ? 'groq' : 'gemini',
    models: {
      gemini: config.models.gemini.trim() || AI_MODELS.gemini,
      groq: config.models.groq.trim() || AI_MODELS.groq,
    },
  };
  await db.runAsync('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', [
    CONFIG_META_KEY,
    JSON.stringify(normalized),
  ]);
}

export function resolveModel(config: AIConfig, provider: AIProviderId): string {
  return config.models[provider]?.trim() || AI_MODELS[provider];
}
