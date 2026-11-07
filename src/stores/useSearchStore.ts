import { create } from 'zustand';

import type { RecordType, ScratchpadMode, SearchFilters } from '../types';

interface SearchState extends SearchFilters {
  setText: (text: string) => void;
  setCategory: (categoryId: string | null) => void;
  toggleTag: (tagId: string) => void;
  setDateRange: (from: string | null, to: string | null) => void;
  setScratchpadMode: (mode: ScratchpadMode) => void;
  setRecordType: (type: RecordType | null) => void;
  reset: () => void;
}

const initialFilters: SearchFilters = {
  text: '',
  categoryId: null,
  tagIds: [],
  from: null,
  to: null,
  scratchpadMode: 'exclude',
  recordType: null,
};

export const useSearchStore = create<SearchState>((set) => ({
  ...initialFilters,
  setText: (text) => set({ text }),
  setCategory: (categoryId) => set({ categoryId }),
  toggleTag: (tagId) =>
    set((state) => ({
      tagIds: state.tagIds.includes(tagId)
        ? state.tagIds.filter((id) => id !== tagId)
        : [...state.tagIds, tagId],
    })),
  setDateRange: (from, to) => set({ from, to }),
  setScratchpadMode: (scratchpadMode) => set({ scratchpadMode }),
  setRecordType: (recordType) => set({ recordType }),
  reset: () => set({ ...initialFilters }),
}));
