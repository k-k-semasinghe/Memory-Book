import { getAIConfig, resolveModel } from './config';
import { AIError } from './errors';
import { isOnlineNow } from './network';
import {
  buildAskPrompt,
  buildExtractionPrompt,
  EXTRACTION_JSON_SCHEMA,
  extractCitationIndices,
  parseExtraction,
} from './prompts';
import { completeAI } from './providers';
import type { AIExtraction, AIProviderId, AskResult, AskSource } from './types';
import { getNote, searchNotesAnyTerms } from '../db/repositories/notes';
import { listCategories } from '../db/repositories/categories';
import { listTags } from '../db/repositories/tags';
import {
  appendAIMessage,
  createAIConversation,
  recordAIUsage,
} from '../db/repositories/ai';

export async function askNotes(
  question: string,
  conversationId?: string | null,
): Promise<AskResult> {
  const trimmed = question.trim();
  if (!trimmed) throw new AIError('invalid_response', 'Enter a question.');

  const config = await getAIConfig();
  if (!config.enabled) {
    throw new AIError('not_configured', 'AI is disabled.');
  }
  if (!(await isOnlineNow())) {
    throw new AIError('offline', 'You are offline.');
  }

  const notes = await searchNotesAnyTerms(trimmed, 6);
  if (!notes.length) {
    return {
      answer: 'I could not find that in your notes.',
      sources: [],
      citedNoteIds: [],
      conversationId: conversationId ?? null,
    };
  }

  const sources: AskSource[] = notes.map((note, index) => ({
    index: index + 1,
    note,
  }));
  const prompt = buildAskPrompt(trimmed, sources);
  const provider = config.provider;
  const model = resolveModel(config, provider);
  const answer = await completeAI(provider, model, {
    ...prompt,
    temperature: 0.2,
    maxOutputTokens: 1200,
  });

  await recordAIUsage(provider, model);
  const cited = extractCitationIndices(answer, sources.length);
  const citedNoteIds = cited.map((index) => sources[index - 1].note.id);

  let activeConversationId = conversationId ?? null;
  if (!activeConversationId) {
    activeConversationId = await createAIConversation(trimmed);
  }
  await appendAIMessage({
    conversationId: activeConversationId,
    role: 'user',
    content: trimmed,
  });
  await appendAIMessage({
    conversationId: activeConversationId,
    role: 'assistant',
    content: answer,
    citedNoteIds,
    provider,
    model,
  });

  return {
    answer,
    sources,
    citedNoteIds,
    conversationId: activeConversationId,
  };
}

export async function extractNoteMetadata(
  noteId: string,
): Promise<{ extraction: AIExtraction; provider: AIProviderId; model: string }> {
  const config = await getAIConfig();
  if (!config.enabled) {
    throw new AIError('not_configured', 'AI is disabled.');
  }
  if (!(await isOnlineNow())) {
    throw new AIError('offline', 'You are offline.');
  }

  const note = await getNote(noteId);
  if (!note) throw new AIError('invalid_response', 'Note not found.');

  const [categories, tags] = await Promise.all([listCategories(), listTags()]);
  const prompt = buildExtractionPrompt(note, categories, tags);
  const provider = config.provider;
  const model = resolveModel(config, provider);
  const text = await completeAI(provider, model, {
    ...prompt,
    temperature: 0.1,
    maxOutputTokens: 2048,
    jsonSchema: EXTRACTION_JSON_SCHEMA,
  });

  const extraction = parseExtraction(text);
  if (
    extraction.categoryId &&
    !categories.some((category) => category.id === extraction.categoryId)
  ) {
    extraction.categoryId = null;
  }

  await recordAIUsage(provider, model);
  return { extraction, provider, model };
}
