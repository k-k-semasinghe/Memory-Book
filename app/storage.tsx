import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, radius, spacing, typography } from '../src/constants/theme';
import {
  useDeleteNote,
  useEmptyTrash,
  useNoteStats,
  useOldestNotes,
} from '../src/hooks/useNotes';
import { formatShortDate } from '../src/utils/dates';
import { noteTitle } from '../src/utils/format';

export default function StorageScreen() {
  const router = useRouter();
  const stats = useNoteStats();
  const oldest = useOldestNotes(20);
  const deleteNote = useDeleteNote();
  const emptyTrash = useEmptyTrash();

  const trashCount = stats.data?.trash ?? 0;

  const confirmEmptyTrash = () => {
    if (!trashCount) return;
    Alert.alert(
      'Empty trash?',
      `Permanently delete ${trashCount} item${trashCount === 1 ? '' : 's'}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Empty trash',
          style: 'destructive',
          onPress: async () => {
            const removed = await emptyTrash.mutateAsync();
            Alert.alert('Trash emptied', `${removed} item${removed === 1 ? '' : 's'} removed.`);
          },
        },
      ],
    );
  };

  const confirmDelete = (id: string) => {
    Alert.alert('Move to trash?', 'You can restore it from Trash.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Move to trash',
        style: 'destructive',
        onPress: () => void deleteNote.mutateAsync(id),
      },
    ]);
  };

  return (
    <ScrollView style={[styles.screen, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <View style={styles.infoCard}>
        <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
        <Text style={styles.infoText}>
          Nothing is deleted automatically. Cleanup here is a suggestion — you always
          confirm before anything leaves your notes.
        </Text>
      </View>

      <View style={styles.statsRow}>
        <Stat label="Notes" value={stats.data?.total ?? 0} />
        <Stat label="Scratchpad" value={stats.data?.scratchpad ?? 0} />
        <Stat label="Trash" value={trashCount} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Trash</Text>
        <View style={styles.card}>
          <View style={styles.trashRow}>
            <View style={styles.trashText}>
              <Text style={styles.rowTitle}>{trashCount} items in trash</Text>
              <Text style={styles.rowSubtitle}>
                Never empties on its own. Review items before deleting forever.
              </Text>
            </View>
            <Pressable
              onPress={() => router.push('/trash')}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryText}>Review</Text>
            </Pressable>
          </View>
          <Pressable
            onPress={confirmEmptyTrash}
            disabled={!trashCount}
            style={[
              styles.dangerButton,
              !trashCount && styles.dangerButtonDisabled,
            ]}
          >
            <Text
              style={[
                styles.dangerText,
                !trashCount && styles.dangerTextDisabled,
              ]}
            >
              Empty trash
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Oldest notes</Text>
        <Text style={styles.sectionHint}>
          A place to review what you have kept the longest. Deleting moves a note to
          Trash.
        </Text>
        <View style={styles.card}>
          {(oldest.data ?? []).map((note, index) => (
            <View key={note.id}>
              {index > 0 ? <View style={styles.divider} /> : null}
              <View style={styles.noteRow}>
                <Pressable
                  style={styles.noteText}
                  onPress={() => router.push(`/note/${note.id}`)}
                >
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {noteTitle(note)}
                  </Text>
                  <Text style={styles.rowSubtitle}>
                    {formatShortDate(note.occurredAt)}
                    {note.category ? ` · ${note.category.name}` : ''}
                  </Text>
                </Pressable>
                <Pressable
                  hitSlop={8}
                  onPress={() => confirmDelete(note.id)}
                >
                  <Ionicons
                    name="trash-outline"
                    size={18}
                    color={colors.danger}
                  />
                </Pressable>
              </View>
            </View>
          ))}
          {!oldest.isLoading && !oldest.data?.length ? (
            <Text style={styles.empty}>No notes yet.</Text>
          ) : null}
        </View>
      </View>
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxl * 2,
    gap: spacing.xl,
  },
  infoCard: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  infoText: {
    ...typography.small,
    color: colors.textMuted,
    flex: 1,
    lineHeight: 19,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xxs,
  },
  statValue: {
    ...typography.title,
    color: colors.text,
  },
  statLabel: {
    ...typography.tiny,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.section,
    color: colors.text,
  },
  sectionHint: {
    ...typography.small,
    color: colors.textMuted,
    lineHeight: 18,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
    overflow: 'hidden',
  },
  trashRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  trashText: {
    flex: 1,
    gap: spacing.xxs,
  },
  rowTitle: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  rowSubtitle: {
    ...typography.small,
    color: colors.textMuted,
  },
  secondaryButton: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  secondaryText: {
    ...typography.small,
    color: colors.text,
    fontWeight: '600',
  },
  dangerButton: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  dangerButtonDisabled: {
    backgroundColor: colors.surfaceMuted,
  },
  dangerText: {
    ...typography.bodyStrong,
    color: colors.danger,
  },
  dangerTextDisabled: {
    color: colors.textFaint,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  noteText: {
    flex: 1,
    gap: spacing.xxs,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  empty: {
    ...typography.small,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
