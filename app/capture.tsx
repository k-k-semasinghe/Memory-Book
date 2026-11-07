import { useLocalSearchParams, useRouter } from 'expo-router';

import { NoteForm } from '../src/components/notes/NoteForm';
import { useCreateNote } from '../src/hooks/useNotes';
import type { NoteInput } from '../src/types';

export default function CaptureScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ scratchpad?: string }>();
  const createNote = useCreateNote();
  const defaultScratchpad = params.scratchpad === '1';

  const submit = async (input: NoteInput) => {
    await createNote.mutateAsync(input);
    router.back();
  };

  return (
    <NoteForm
      heading="New note"
      defaultScratchpad={defaultScratchpad}
      onSubmit={submit}
      onCancel={() => router.back()}
    />
  );
}
