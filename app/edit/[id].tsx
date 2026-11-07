import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { NoteForm } from '../../src/components/notes/NoteForm';
import { colors, spacing, typography } from '../../src/constants/theme';
import { useNote, useUpdateNote } from '../../src/hooks/useNotes';
import type { NoteInput } from '../../src/types';

export default function EditNoteScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const note = useNote(id);
  const updateNote = useUpdateNote();

  if (note.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!note.data || !id) {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>Note not found.</Text>
      </View>
    );
  }

  const submit = async (input: NoteInput) => {
    await updateNote.mutateAsync({ id, input });
    router.back();
  };

  return (
    <NoteForm
      heading="Edit note"
      initial={note.data}
      onSubmit={submit}
      onCancel={() => router.back()}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  message: {
    ...typography.body,
    color: colors.textMuted,
    padding: spacing.xl,
  },
});
