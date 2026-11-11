import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createTag, deleteTag, listTags } from '../db/repositories/tags';

export const tagKeys = {
  all: ['tags'] as const,
};

export function useTags() {
  return useQuery({ queryKey: tagKeys.all, queryFn: listTags });
}

function useInvalidateTags() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: tagKeys.all });
    void queryClient.invalidateQueries({ queryKey: ['notes'] });
  };
}

export function useCreateTag() {
  const invalidate = useInvalidateTags();
  return useMutation({
    mutationFn: createTag,
    onSuccess: invalidate,
  });
}

export function useDeleteTag() {
  const invalidate = useInvalidateTags();
  return useMutation({
    mutationFn: deleteTag,
    onSuccess: invalidate,
  });
}
