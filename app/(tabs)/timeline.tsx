import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppHeader } from '../../src/components/common/AppHeader';
import { Chip } from '../../src/components/common/Chip';
import { EmptyState } from '../../src/components/common/EmptyState';
import { Screen } from '../../src/components/common/Screen';
import { NoteCard } from '../../src/components/notes/NoteCard';
import { colors, spacing, typography } from '../../src/constants/theme';
import { useCategories } from '../../src/hooks/useCategories';
import { useTimeline } from '../../src/hooks/useNotes';
import type { Note } from '../../src/types';
import { dayKey, dayLabel } from '../../src/utils/dates';

interface TimelineSection {
  title: string;
  data: Note[];
}

export default function TimelineScreen() {
  const router = useRouter();
  const timeline = useTimeline();
  const categories = useCategories();
  const [categoryId, setCategoryId] = useState<string | null>(null);

  const sections = useMemo<TimelineSection[]>(() => {
    const notes = (timeline.data ?? []).filter(
      (note) => !categoryId || note.categoryId === categoryId,
    );
    const groups = new Map<string, TimelineSection>();

    for (const note of notes) {
      const key = dayKey(note.occurredAt);
      const existing = groups.get(key);
      if (existing) {
        existing.data.push(note);
      } else {
        groups.set(key, { title: dayLabel(note.occurredAt), data: [note] });
      }
    }

    return Array.from(groups.values());
  }, [timeline.data, categoryId]);

  const filterRow = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filters}
    >
      <Chip label="All" active={!categoryId} onPress={() => setCategoryId(null)} />
      {(categories.data ?? []).map((category) => (
        <Chip
          key={category.id}
          label={category.name}
          color={category.color}
          active={categoryId === category.id}
          onPress={() => setCategoryId(category.id)}
        />
      ))}
    </ScrollView>
  );

  return (
    <Screen>
      <AppHeader title="Timeline" subtitle="Everything you saved, newest first" />
      {filterRow}

      {timeline.isLoading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NoteCard note={item} onPress={() => router.push(`/note/${item.id}`)} />
          )}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionTitle}>{section.title}</Text>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl
              refreshing={timeline.isRefetching}
              onRefresh={() => void timeline.refetch()}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="time-outline"
              title={categoryId ? 'No notes in this category' : 'Nothing here yet'}
              message={
                categoryId
                  ? 'Try another category or clear the filter.'
                  : 'Notes you save will appear here, grouped by day.'
              }
            />
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: {
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl * 2,
    flexGrow: 1,
  },
  sectionTitle: {
    ...typography.tiny,
    color: colors.textMuted,
    textTransform: 'uppercase',
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  separator: {
    height: spacing.md,
  },
  loader: {
    paddingVertical: spacing.xxl,
  },
});
