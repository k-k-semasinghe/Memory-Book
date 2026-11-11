import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppHeader } from '../../src/components/common/AppHeader';
import { EmptyState } from '../../src/components/common/EmptyState';
import { SectionHeader } from '../../src/components/common/SectionHeader';
import { Screen } from '../../src/components/common/Screen';
import { NoteCard } from '../../src/components/notes/NoteCard';
import { colors, radius, spacing, typography } from '../../src/constants/theme';
import { useNoteStats, useRecentNotes } from '../../src/hooks/useNotes';
import { todayLabel } from '../../src/utils/dates';

export default function HomeScreen() {
  const router = useRouter();
  const recent = useRecentNotes(6);
  const stats = useNoteStats();

  const refreshing = recent.isRefetching || stats.isRefetching;
  const refresh = () => {
    void recent.refetch();
    void stats.refetch();
  };

  const notes = recent.data ?? [];

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }
      >
        <AppHeader
          title="Memory Book"
          subtitle={todayLabel()}
          right={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open settings"
              hitSlop={8}
              onPress={() => router.push('/settings')}
              style={styles.settingsButton}
            >
              <Ionicons
                name="settings-outline"
                size={20}
                color={colors.textMuted}
              />
            </Pressable>
          }
        />

        <View style={styles.statsRow}>
          <StatCard
            icon="document-text-outline"
            label="Notes"
            value={stats.data?.total ?? 0}
          />
          <StatCard
            icon="hourglass-outline"
            label="Scratchpad"
            value={stats.data?.scratchpad ?? 0}
            tone="scratch"
          />
          <StatCard
            icon="trash-outline"
            label="Trash"
            value={stats.data?.trash ?? 0}
            tone="muted"
          />
        </View>

        {(stats.data?.expired ?? 0) > 0 ? (
          <Pressable
            onPress={() => router.push('/scratchpad')}
            style={styles.alertCard}
          >
            <Ionicons name="hourglass-outline" size={18} color={colors.danger} />
            <Text style={styles.alertText}>
              {stats.data?.expired} scratchpad note
              {(stats.data?.expired ?? 0) === 1 ? '' : 's'} passed the 7-day mark. Nothing
              is deleted automatically.
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.danger} />
          </Pressable>
        ) : null}

        <View style={styles.section}>
          <SectionHeader
            title="Recent notes"
            actionLabel="See all"
            onAction={() => router.push('/timeline')}
          />
          {recent.isLoading ? (
            <ActivityIndicator color={colors.primary} style={styles.loader} />
          ) : notes.length ? (
            <View style={styles.list}>
              {notes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  onPress={() => router.push(`/note/${note.id}`)}
                />
              ))}
            </View>
          ) : (
            <EmptyState
              icon="create-outline"
              title="Your first memory starts here"
              message="Tap the + button to write something. You can categorize and tag it only if you want to."
            />
          )}
        </View>

        <Pressable onPress={() => router.push('/reminders')} style={styles.linkCard}>
          <View style={styles.linkIcon}>
            <Ionicons name="notifications-outline" size={20} color={colors.primary} />
          </View>
          <View style={styles.linkText}>
            <Text style={styles.linkTitle}>Reminders</Text>
            <Text style={styles.linkSubtitle}>
              One-time and repeating notifications
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

interface StatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  tone?: 'default' | 'scratch' | 'muted';
}

function StatCard({ icon, label, value, tone = 'default' }: StatCardProps) {
  const tint =
    tone === 'scratch'
      ? colors.scratch
      : tone === 'muted'
        ? colors.textMuted
        : colors.primary;
  const background =
    tone === 'scratch'
      ? colors.scratchSoft
      : tone === 'muted'
        ? colors.surfaceMuted
        : colors.primarySoft;

  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: background }]}>
        <Ionicons name={icon} size={16} color={tint} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xxxl * 2,
    gap: spacing.xl,
  },
  settingsButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  statIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
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
  alertCard: {
    marginHorizontal: spacing.xl,
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
  section: {
    paddingHorizontal: spacing.xl,
  },
  list: {
    gap: spacing.md,
  },
  loader: {
    paddingVertical: spacing.xxl,
  },
  linkCard: {
    marginHorizontal: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  linkIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkText: {
    flex: 1,
    gap: spacing.xxs,
  },
  linkTitle: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  linkSubtitle: {
    ...typography.small,
    color: colors.textMuted,
  },
});
