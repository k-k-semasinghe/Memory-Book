import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { EmptyState } from '../src/components/common/EmptyState';
import { colors, radius, spacing, typography } from '../src/constants/theme';
import {
  useDeleteForever,
  useEmptyTrash,
  useRestoreNote,
  useTrash,
} from '../src/hooks/useNotes';
import { formatShortDate } from '../src/utils/dates';
import { noteTitle } from '../src/utils/format';

export default function TrashScreen() {
  const router = useRouter();
  const trash = useTrash();
  const restoreNote = useRestoreNote();
  const deleteForever = useDeleteForever();
  const emptyTrash = useEmptyTrash();

  const notes = trash.data ?? [];

  const confirmDeleteForever = (id: string) => {
    Alert.alert('Delete forever?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete forever',
        style: 'destructive',
        onPress: () => void deleteForever.mutateAsync(id),
      },
    ]);
  };

  const confirmEmpty = () => {
    if (!notes.length) return;
    Alert.alert(
      'Empty trash?',
      `Permanently delete ${notes.length} item${notes.length === 1 ? '' : 's'}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Empty trash',
          style: 'destructive',
          onPress: () => void emptyTrash.mutateAsync(),
        },
      ],
    );
  };

  const header = (
    <View style={styles.header}>
      <View style={styles.infoCard}>
        <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
        <Text style={styles.infoText}>
          Trash never empties on its own. Restore anything, or delete it forever when you
          are sure.
        </Text>
      </View>
      {notes.length ? (
        <Pressable onPress={confirmEmpty} style={styles.emptyButton}>
          <Text style={styles.emptyButtonText}>Empty trash</Text>
        </Pressable>
      ) : null}
    </View>
  );

  return (
    <FlatList
      style={styles.screen}
      data={notes}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.content}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListHeaderComponent={header}
      ListEmptyComponent={
        <EmptyState
          icon="trash-outline"
          title="Trash is empty"
          message="Notes you delete land here first, and only leave when you choose."
        />
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Pressable
            style={styles.cardText}
            onPress={() => router.push(`/note/${item.id}`)}
          >
            <Text style={styles.title} numberOfLines={1}>
              {noteTitle(item)}
            </Text>
            <Text style={styles.meta}>
              Deleted {item.deletedAt ? formatShortDate(item.deletedAt) : ''}
              {item.category ? ` · ${item.category.name}` : ''}
            </Text>
          </Pressable>
          <View style={styles.actions}>
            <Pressable
              hitSlop={6}
              onPress={() => void restoreNote.mutateAsync(item.id)}
              style={styles.restoreButton}
            >
              <Ionicons name="refresh-outline" size={16} color={colors.primary} />
              <Text style={styles.restoreText}>Restore</Text>
            </Pressable>
            <Pressable
              hitSlop={6}
              onPress={() => confirmDeleteForever(item.id)}
              style={styles.deleteButton}
            >
              <Ionicons name="trash-outline" size={16} color={colors.danger} />
            </Pressable>
          </View>
        </View>
      )}
    />
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
    flexGrow: 1,
  },
  header: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
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
  emptyButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  emptyButtonText: {
    ...typography.small,
    color: colors.danger,
    fontWeight: '700',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardText: {
    gap: spacing.xxs,
  },
  title: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  meta: {
    ...typography.small,
    color: colors.textMuted,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  restoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  restoreText: {
    ...typography.small,
    color: colors.primary,
    fontWeight: '600',
  },
  deleteButton: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: {
    height: spacing.md,
  },
});
