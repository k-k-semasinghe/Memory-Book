import type { Note } from '../types';

export type AIProviderId = 'gemini' | 'groq';

export type AIConfig = {
  enabled: boolean;
  provider: AIProviderId;
  models: Record<AIProviderId, string>;
};

export type AIKeyStatus = Record<AIProviderId, boolean>;

export type AIStatus = 'loading' | 'disabled' | 'offline' | 'no_key' | 'ready';

export type AIErrorKind =
  | 'not_configured'
  | 'offline'
  | 'auth'
  | 'rate_limit'
  | 'provider'
  | 'network'
  | 'invalid_response';

export type AICompletionRequest = {
  system: string;
  user: string;
  maxOutputTokens?: number;
  temperature?: number;
  jsonSchema?: Record<string, unknown>;
};

export type AIExtraction = {
  summary: string;
  keyPoints: string[];
  categoryId: string | null;
  tagNames: string[];
  keywords: string[];
};

export type NoteEnrichment = {
  noteId: string;
  summary: string | null;
  keyPoints: string[];
  suggestedCategoryId: string | null;
  suggestedTagIds: string[];
  keywords: string[];
  provider: string | null;
  model: string | null;
  updatedAt: string;
};

export type AIEnrichmentApply = {
  summary?: string;
  keyPoints?: string[];
  categoryId?: string | null;
  tagNames?: string[];
  keywords?: string[];
  provider: string;
  model: string;
};

export type AskSource = {
  index: number;
  note: Note;
};

export type AskResult = {
  answer: string;
  sources: AskSource[];
  citedNoteIds: string[];
  conversationId: string | null;
};
