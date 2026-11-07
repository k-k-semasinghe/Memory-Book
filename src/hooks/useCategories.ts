import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from '../db/repositories/categories';
import type { CategoryInput } from '../types';

export const categoryKeys = {
  all: ['categories'] as const,
};

export function useCategories() {
  return useQuery({ queryKey: categoryKeys.all, queryFn: listCategories });
}

function useInvalidateCategories() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    void queryClient.invalidateQueries({ queryKey: ['notes'] });
  };
}

export function useCreateCategory() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: (input: CategoryInput) => createCategory(input),
    onSuccess: invalidate,
  });
}

export function useUpdateCategory() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<CategoryInput> }) =>
      updateCategory(id, patch),
    onSuccess: invalidate,
  });
}

export function useDeleteCategory() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: deleteCategory,
    onSuccess: invalidate,
  });
}
