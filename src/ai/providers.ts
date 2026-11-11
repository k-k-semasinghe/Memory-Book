import { AIError } from './errors';
import { getAIKey } from './keys';
import type { AICompletionRequest, AIProviderId } from './types';

const TIMEOUT_MS = 30_000;

async function postJson<T>(
  url: string,
  headers: Record<string, string>,
  body: unknown,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new AIError('auth', 'API key rejected.', response.status);
      }
      if (response.status === 429) {
        throw new AIError('rate_limit', 'Provider rate limit reached.', 429);
      }
      throw new AIError(
        'provider',
        `Provider request failed (${response.status}).`,
        response.status,
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof AIError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new AIError('network', 'The AI request timed out.');
    }
    throw new AIError('network', 'Could not reach the AI provider.');
  } finally {
    clearTimeout(timer);
  }
}

type GeminiResponse = {
  candidates?: {
    content?: { parts?: { text?: string; thought?: boolean }[] };
    finishReason?: string;
  }[];
  promptFeedback?: { blockReason?: string };
};

type GroqResponse = {
  choices?: { message?: { content?: string | null } }[];
  error?: { message?: string };
};

async function completeGemini(
  model: string,
  key: string,
  request: AICompletionRequest,
): Promise<string> {
  const generationConfig: Record<string, unknown> = {
    temperature: request.temperature ?? 0.2,
    maxOutputTokens: request.maxOutputTokens ?? 1024,
  };
  if (request.jsonSchema) {
    generationConfig.responseMimeType = 'application/json';
    generationConfig.responseSchema = request.jsonSchema;
  }

  const data = await postJson<GeminiResponse>(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    { 'x-goog-api-key': key },
    {
      systemInstruction: { parts: [{ text: request.system }] },
      contents: [{ role: 'user', parts: [{ text: request.user }] }],
      generationConfig,
    },
  );

  if (data.promptFeedback?.blockReason) {
    throw new AIError('provider', 'The provider blocked this request.');
  }
  const text = data.candidates
    ?.flatMap((candidate) => candidate.content?.parts ?? [])
    .filter((part) => !part.thought)
    .map((part) => part.text ?? '')
    .join('')
    .trim();
  if (!text) {
    throw new AIError('invalid_response', 'Gemini returned an empty response.');
  }
  return text;
}

async function completeGroq(
  model: string,
  key: string,
  request: AICompletionRequest,
): Promise<string> {
  const body: Record<string, unknown> = {
    model,
    temperature: request.temperature ?? 0.2,
    max_tokens: request.maxOutputTokens ?? 1024,
    messages: [
      { role: 'system', content: request.system },
      { role: 'user', content: request.user },
    ],
  };
  if (request.jsonSchema) {
    body.response_format = { type: 'json_object' };
  }

  const data = await postJson<GroqResponse>(
    'https://api.groq.com/openai/v1/chat/completions',
    { Authorization: `Bearer ${key}` },
    body,
  );

  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new AIError(
      'invalid_response',
      data.error?.message ?? 'Groq returned an empty response.',
    );
  }
  return text;
}

export async function completeAI(
  provider: AIProviderId,
  model: string,
  request: AICompletionRequest,
): Promise<string> {
  const key = await getAIKey(provider);
  if (!key) throw new AIError('not_configured', 'No API key configured.');
  return provider === 'groq'
    ? completeGroq(model, key, request)
    : completeGemini(model, key, request);
}

export async function testAIConnection(
  provider: AIProviderId,
  model: string,
  key: string,
): Promise<void> {
  const request: AICompletionRequest = {
    system: 'You are a connection test. Reply with the single word OK.',
    user: 'Reply with OK.',
    temperature: 0,
    maxOutputTokens: 64,
  };
  if (provider === 'groq') {
    await completeGroq(model, key.trim(), request);
  } else {
    await completeGemini(model, key.trim(), request);
  }
}
