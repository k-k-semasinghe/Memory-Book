import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppHeader } from '../../src/components/common/AppHeader';
import { EmptyState } from '../../src/components/common/EmptyState';
import { Screen } from '../../src/components/common/Screen';
import { NoteCard } from '../../src/components/notes/NoteCard';
import { colors, radius, spacing, typography } from '../../src/constants/theme';
import { useScratchpad } from '../../src/hooks/useNotes';
import { isExpired } from '../../src/utils/dates';

export default function ScratchpadScreen() {
  const router = useRouter();
  const scratchpad = useScratchpad();
  const notes = scratchpad.data ?? [];
  const expiredCount = notes.filter((note) => isExpired(note.expiresAt)).length;

  const header = (
    <View style={styles.headerBlock}>
      <View style={styles.infoCard}>
        <View style={styles.infoIcon}>
          <Ionicons name="hourglass-outline" size={18} color={colors.scratch} />
        </View>
        <Text style={styles.infoText}>
          Scratchpad notes expire 7 days after the last edit. When one passes, you will
          be asked before anything is deleted.
        </Text>
      </View>

      {expiredCount > 0 ? (
        <View style={styles.alertCard}>
          <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
          <Text style={styles.alertText}>
            {expiredCount} note{expiredCount === 1 ? '' : 's'} past the 7-day mark. Open a
            note to keep it, extend it, or delete it.
          </Text>
        </View>
      ) : null}

      <Pressable
        onPress={() => router.push('/capture?scratchpad=1')}
        style={styles.newButton}
      >
        <Ionicons name="add" size={18} color={colors.white} />
        <Text style={styles.newButtonText}>New scratchpad note</Text>
      </Pressable>
    </View>
  );

  return (
    <Screen>
      <AppHeader
        title="Scratchpad"
        subtitle="Short-lived notes that stay on your device"
      />
      {scratchpad.isLoading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={notes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NoteCard
              note={item}
              showScratchpadStatus
              onPress={() => router.push(`/note/${item.id}`)}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListHeaderComponent={header}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={scratchpad.isRefetching}
              onRefresh={() => void scratchpad.refetch()}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="hourglass-outline"
              title="Scratchpad is empty"
              message="Use it for quick thoughts you do not need to keep forever. You decide what happens after a week."
            />
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerBlock: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  infoCard: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.scratchSoft,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    ...typography.small,
    color: colors.textMuted,
    flex: 1,
    lineHeight: 19,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  alertText: {
    ...typography.small,
    color: colors.danger,
    flex: 1,
    lineHeight: 18,
  },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.scratch,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  newButtonText: {
    ...typography.bodyStrong,
    color: colors.white,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl * 2,
    flexGrow: 1,
  },
  separator: {
    height: spacing.md,
  },
  loader: {
    paddingVertical: spacing.xxl,
  },
});
