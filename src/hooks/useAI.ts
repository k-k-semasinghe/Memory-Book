import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { DEFAULT_AI_CONFIG, getAIConfig, saveAIConfig } from '../ai/config';
import { deleteAIKey, getAIKeyStatus, setAIKey } from '../ai/keys';
import type {
  AIConfig,
  AIEnrichmentApply,
  AIProviderId,
  AIStatus,
  NoteEnrichment,
} from '../ai/types';
import {
  applyNoteEnrichment,
  deleteAllAIData,
  deleteNoteEnrichment,
  getAIUsageToday,
  getNoteEnrichment,
} from '../db/repositories/ai';
import { useNetworkStatus } from './useNetworkStatus';

export const aiKeys = {
  all: ['ai'] as const,
  config: ['ai', 'config'] as const,
  keyStatus: ['ai', 'key-status'] as const,
  usage: ['ai', 'usage-today'] as const,
  enrichment: (noteId: string) => ['ai', 'enrichment', noteId] as const,
};

export function useAIConfig() {
  return useQuery({
    queryKey: aiKeys.config,
    queryFn: getAIConfig,
    placeholderData: DEFAULT_AI_CONFIG,
  });
}

export function useAIKeyStatus() {
  return useQuery({
    queryKey: aiKeys.keyStatus,
    queryFn: getAIKeyStatus,
  });
}

export function useAIUsage() {
  return useQuery({
    queryKey: aiKeys.usage,
    queryFn: getAIUsageToday,
  });
}

export function useAIStatus() {
  const configQuery = useAIConfig();
  const keyQuery = useAIKeyStatus();
  const network = useNetworkStatus();
  const config = configQuery.data ?? DEFAULT_AI_CONFIG;

  let status: AIStatus = 'loading';
  if (configQuery.isLoading || keyQuery.isLoading) {
    status = 'loading';
  } else if (!config.enabled) {
    status = 'disabled';
  } else if (network.isOffline) {
    status = 'offline';
  } else if (network.isUnknown) {
    status = 'loading';
  } else if (!keyQuery.data?.[config.provider]) {
    status = 'no_key';
  } else {
    status = 'ready';
  }

  return {
    status,
    config,
    keyStatus: keyQuery.data,
    isOffline: network.isOffline,
    provider: config.provider,
  };
}

export function useNoteEnrichment(noteId: string | null | undefined) {
  return useQuery({
    queryKey: aiKeys.enrichment(noteId ?? ''),
    queryFn: () => getNoteEnrichment(noteId ?? ''),
    enabled: Boolean(noteId),
  });
}

export function useSaveAIConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (config: AIConfig) => saveAIConfig(config),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: aiKeys.config });
    },
  });
}

export function useSetAIKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ provider, key }: { provider: AIProviderId; key: string }) =>
      setAIKey(provider, key),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: aiKeys.keyStatus });
    },
  });
}

export function useDeleteAIKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (provider: AIProviderId) => deleteAIKey(provider),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: aiKeys.keyStatus });
    },
  });
}

export function useApplyNoteEnrichment(noteId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AIEnrichmentApply) => applyNoteEnrichment(noteId, input),
    onSuccess: (data: NoteEnrichment) => {
      queryClient.setQueryData(aiKeys.enrichment(noteId), data);
      void queryClient.invalidateQueries({ queryKey: ['notes'] });
      void queryClient.invalidateQueries({ queryKey: ['tags'] });
      void queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useDeleteNoteEnrichment(noteId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteNoteEnrichment(noteId),
    onSuccess: () => {
      queryClient.setQueryData(aiKeys.enrichment(noteId), null);
      void queryClient.invalidateQueries({ queryKey: ['notes'] });
      void queryClient.invalidateQueries({ queryKey: ['tags'] });
      void queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useDeleteAllAIData() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAllAIData,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: aiKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['notes'] });
      void queryClient.invalidateQueries({ queryKey: ['tags'] });
      void queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}
