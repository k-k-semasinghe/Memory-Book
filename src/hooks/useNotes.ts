import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  archiveNote,
  createNote,
  deleteNoteForever,
  emptyTrash,
  extendScratchpad,
  getNote,
  getNoteStats,
  listOldestNotes,
  listRecentNotes,
  listScratchpad,
  listTimeline,
  listTrash,
  makePermanent,
  restoreNote,
  searchNotes,
  softDeleteNote,
  unarchiveNote,
  updateNote,
} from '../db/repositories/notes';
import type { NoteInput, SearchFilters } from '../types';
import { categoryKeys } from './useCategories';

export const noteKeys = {
  all: ['notes'] as const,
  recent: (limit: number) => ['notes', 'recent', limit] as const,
  timeline: ['notes', 'timeline'] as const,
  scratchpad: ['notes', 'scratchpad'] as const,
  trash: ['notes', 'trash'] as const,
  oldest: (limit: number) => ['notes', 'oldest', limit] as const,
  detail: (id: string) => ['notes', 'detail', id] as const,
  search: (filters: SearchFilters) => ['notes', 'search', filters] as const,
  stats: ['notes', 'stats'] as const,
};

function useInvalidateNotes() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['notes'] });
    void queryClient.invalidateQueries({ queryKey: noteKeys.stats });
    void queryClient.invalidateQueries({ queryKey: categoryKeys.all });
  };
}

export function useRecentNotes(limit = 8) {
  return useQuery({
    queryKey: noteKeys.recent(limit),
    queryFn: () => listRecentNotes(limit),
  });
}

export function useTimeline() {
  return useQuery({
    queryKey: noteKeys.timeline,
    queryFn: () => listTimeline(),
  });
}

export function useScratchpad() {
  return useQuery({
    queryKey: noteKeys.scratchpad,
    queryFn: listScratchpad,
  });
}

export function useTrash() {
  return useQuery({
    queryKey: noteKeys.trash,
    queryFn: listTrash,
  });
}

export function useOldestNotes(limit = 20) {
  return useQuery({
    queryKey: noteKeys.oldest(limit),
    queryFn: () => listOldestNotes(limit),
  });
}

export function useNote(id: string | null | undefined) {
  return useQuery({
    queryKey: noteKeys.detail(id ?? ''),
    queryFn: () => getNote(id ?? ''),
    enabled: Boolean(id),
  });
}

export function useSearchNotes(filters: SearchFilters) {
  return useQuery({
    queryKey: noteKeys.search(filters),
    queryFn: () => searchNotes(filters),
  });
}

export function useNoteStats() {
  return useQuery({
    queryKey: noteKeys.stats,
    queryFn: getNoteStats,
  });
}

export function useCreateNote() {
  const invalidate = useInvalidateNotes();
  return useMutation({
    mutationFn: (input: NoteInput) => createNote(input),
    onSuccess: invalidate,
  });
}

export function useUpdateNote() {
  const invalidate = useInvalidateNotes();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: NoteInput }) => updateNote(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteNote() {
  const invalidate = useInvalidateNotes();
  return useMutation({
    mutationFn: softDeleteNote,
    onSuccess: invalidate,
  });
}

export function useRestoreNote() {
  const invalidate = useInvalidateNotes();
  return useMutation({
    mutationFn: restoreNote,
    onSuccess: invalidate,
  });
}

export function useDeleteForever() {
  const invalidate = useInvalidateNotes();
  return useMutation({
    mutationFn: deleteNoteForever,
    onSuccess: invalidate,
  });
}

export function useEmptyTrash() {
  const invalidate = useInvalidateNotes();
  return useMutation({
    mutationFn: emptyTrash,
    onSuccess: invalidate,
  });
}

export function useExtendScratchpad() {
  const invalidate = useInvalidateNotes();
  return useMutation({
    mutationFn: ({ id, days }: { id: string; days?: number }) =>
      extendScratchpad(id, days),
    onSuccess: invalidate,
  });
}

export function useMakePermanent() {
  const invalidate = useInvalidateNotes();
  return useMutation({
    mutationFn: makePermanent,
    onSuccess: invalidate,
  });
}

export function useArchiveNote() {
  const invalidate = useInvalidateNotes();
  return useMutation({
    mutationFn: ({ id, archived }: { id: string; archived: boolean }) =>
      archived ? archiveNote(id) : unarchiveNote(id),
    onSuccess: invalidate,
  });
}
