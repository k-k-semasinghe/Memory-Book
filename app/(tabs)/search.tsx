import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { endOfDay, startOfDay, subDays } from 'date-fns';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppHeader } from '../../src/components/common/AppHeader';
import { Chip } from '../../src/components/common/Chip';
import { EmptyState } from '../../src/components/common/EmptyState';
import { Screen } from '../../src/components/common/Screen';
import { NoteCard } from '../../src/components/notes/NoteCard';
import { colors, radius, spacing, typography } from '../../src/constants/theme';
import { useActiveCategories } from '../../src/hooks/useCategories';
import { useAIStatus } from '../../src/hooks/useAI';
import { useSearchNotes } from '../../src/hooks/useNotes';
import { useTags } from '../../src/hooks/useTags';
import { useSearchStore } from '../../src/stores/useSearchStore';
import type { SearchFilters } from '../../src/types';

type RangeKey = 'any' | '7d' | '30d' | '90d';

const RANGES: Array<{ key: RangeKey; label: string; days?: number }> = [
  { key: 'any', label: 'Any time' },
  { key: '7d', label: 'Last 7 days', days: 7 },
  { key: '30d', label: 'Last 30 days', days: 30 },
  { key: '90d', label: 'Last 90 days', days: 90 },
];

function aiCardTitle(status: ReturnType<typeof useAIStatus>['status']): string {
  switch (status) {
    case 'ready':
      return 'Ask AI';
    case 'offline':
      return 'AI is offline';
    case 'no_key':
      return 'Add an API key';
    case 'disabled':
      return 'AI is off';
    default:
      return 'Checking AI…';
  }
}

function aiCardSubtitle(status: ReturnType<typeof useAIStatus>['status']): string {
  switch (status) {
    case 'ready':
      return 'Answers with sources from your notes';
    case 'offline':
      return 'You are offline — keyword search still works';
    case 'no_key':
      return 'Set up Gemini or Groq in Settings';
    case 'disabled':
      return 'Enable it in Settings';
    default:
      return 'Checking connection and setup';
  }
}

export default function SearchScreen() {
  const router = useRouter();
  const categories = useActiveCategories();
  const tags = useTags();
  const ai = useAIStatus();

  const {
    text,
    categoryId,
    tagIds,
    from,
    to,
    scratchpadMode,
    setText,
    setCategory,
    toggleTag,
    setDateRange,
    setScratchpadMode,
    reset,
  } = useSearchStore();

  const [query, setQuery] = useState(text);
  const [range, setRange] = useState<RangeKey>('any');

  useEffect(() => {
    const timer = setTimeout(() => setText(query), 250);
    return () => clearTimeout(timer);
  }, [query, setText]);

  const applyRange = (key: RangeKey) => {
    setRange(key);
    const option = RANGES.find((item) => item.key === key);
    if (!option?.days) {
      setDateRange(null, null);
      return;
    }
    const now = new Date();
    setDateRange(
      startOfDay(subDays(now, option.days)).toISOString(),
      endOfDay(now).toISOString(),
    );
  };

  const filters = useMemo<SearchFilters>(
    () => ({
      text,
      categoryId,
      tagIds,
      from,
      to,
      scratchpadMode,
      recordType: null,
    }),
    [text, categoryId, tagIds, from, to, scratchpadMode],
  );

  const results = useSearchNotes(filters);
  const notes = results.data ?? [];
  const hasFilters = Boolean(
    text.trim() || categoryId || tagIds.length || from || scratchpadMode !== 'exclude',
  );

  const clearAll = () => {
    setQuery('');
    setRange('any');
    reset();
  };

  const header = (
    <View style={styles.filtersBlock}>
      <Pressable
        style={[styles.aiCard, ai.status !== 'ready' && styles.aiCardMuted]}
        onPress={() => {
          if (ai.status === 'ready') {
            router.push('/ask');
            return;
          }
          if (ai.status === 'offline') {
            Alert.alert(
              'You are offline',
              'Connect to the internet to use AI. Keyword search still works.',
            );
            return;
          }
          router.push('/ai-settings');
        }}
      >
        <View style={styles.aiIcon}>
          <Ionicons
            name={ai.status === 'offline' ? 'cloud-offline-outline' : 'sparkles-outline'}
            size={18}
            color={colors.accent}
          />
        </View>
        <View style={styles.aiText}>
          <Text style={styles.aiTitle}>{aiCardTitle(ai.status)}</Text>
          <Text style={styles.aiSubtitle}>{aiCardSubtitle(ai.status)}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
      </Pressable>

      <Text style={styles.label}>Category</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        <Chip label="All" active={!categoryId} onPress={() => setCategory(null)} />
        {(categories.data ?? []).map((category) => (
          <Chip
            key={category.id}
            label={category.name}
            color={category.color}
            active={categoryId === category.id}
            onPress={() =>
              setCategory(categoryId === category.id ? null : category.id)
            }
          />
        ))}
      </ScrollView>

      <Text style={styles.label}>Date</Text>
      <View style={styles.wrapRow}>
        {RANGES.map((option) => (
          <Chip
            key={option.key}
            label={option.label}
            active={range === option.key}
            onPress={() => applyRange(option.key)}
          />
        ))}
      </View>

      <Text style={styles.label}>Scratchpad</Text>
      <View style={styles.wrapRow}>
        <Chip
          label="Notes only"
          active={scratchpadMode === 'exclude'}
          onPress={() => setScratchpadMode('exclude')}
        />
        <Chip
          label="Include"
          active={scratchpadMode === 'include'}
          onPress={() => setScratchpadMode('include')}
        />
        <Chip
          label="Scratchpad only"
          active={scratchpadMode === 'only'}
          onPress={() => setScratchpadMode('only')}
        />
      </View>

      {tags.data?.length ? (
        <>
          <Text style={styles.label}>Tags</Text>
          <View style={styles.wrapRow}>
            {tags.data.map((tag) => (
              <Chip
                key={tag.id}
                label={`#${tag.name}`}
                active={tagIds.includes(tag.id)}
                onPress={() => toggleTag(tag.id)}
              />
            ))}
          </View>
        </>
      ) : null}

      <View style={styles.resultsRow}>
        <Text style={styles.resultsText}>
          {results.isLoading
            ? 'Searching…'
            : `${notes.length} ${notes.length === 1 ? 'result' : 'results'}`}
        </Text>
        {hasFilters ? (
          <Pressable onPress={clearAll} hitSlop={8}>
            <Text style={styles.clear}>Clear filters</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );

  return (
    <Screen>
      <AppHeader title="Search" subtitle="Words, categories, tags, or dates" />

      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search your notes…"
          placeholderTextColor={colors.textFaint}
          style={styles.searchInput}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {query ? (
          <Pressable onPress={() => setQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.textFaint} />
          </Pressable>
        ) : null}
      </View>

      {results.isLoading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={notes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NoteCard note={item} onPress={() => router.push(`/note/${item.id}`)} />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListHeaderComponent={header}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <EmptyState
              icon="search-outline"
              title="No matches"
              message={
                hasFilters
                  ? 'Try different words or clear a filter.'
                  : 'Search by a word from the note, a tag, a category, or a date range.'
              }
            />
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    paddingVertical: 0,
  },
  filtersBlock: {
    gap: spacing.sm,
    paddingTop: spacing.lg,
  },
  aiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.xs,
  },
  aiCardMuted: {
    opacity: 0.72,
  },
  aiIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiText: {
    flex: 1,
    gap: spacing.xxs,
  },
  aiTitle: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  aiSubtitle: {
    ...typography.small,
    color: colors.textMuted,
  },
  label: {
    ...typography.tiny,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginTop: spacing.sm,
  },
  chipRow: {
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  resultsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  resultsText: {
    ...typography.small,
    color: colors.textMuted,
    fontWeight: '600',
  },
  clear: {
    ...typography.small,
    color: colors.primary,
    fontWeight: '700',
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
