import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { endOfDay, format, startOfDay, subDays } from 'date-fns';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppHeader } from '../../src/components/common/AppHeader';
import { EmptyState } from '../../src/components/common/EmptyState';
import {
  DateFilterSheet,
  FilterSheet,
} from '../../src/components/common/FilterSheets';
import type {
  DateRangeKey,
  FilterOption,
} from '../../src/components/common/FilterSheets';
import { Screen } from '../../src/components/common/Screen';
import { NoteCard } from '../../src/components/notes/NoteCard';
import { colors, radius, spacing, typography } from '../../src/constants/theme';
import { useActiveCategories } from '../../src/hooks/useCategories';
import { useAIStatus } from '../../src/hooks/useAI';
import { useSearchNotes } from '../../src/hooks/useNotes';
import { useTags } from '../../src/hooks/useTags';
import { useSearchStore } from '../../src/stores/useSearchStore';
import type { SearchFilters } from '../../src/types';

type RangeKey = DateRangeKey;

const RANGES: Array<{ key: Exclude<RangeKey, 'exact'>; label: string; days?: number }> = [
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

interface FilterButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active?: boolean;
  onPress: () => void;
}

function FilterButton({ icon, label, active, onPress }: FilterButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.filterButton,
        active && styles.filterButtonActive,
        pressed && styles.filterButtonPressed,
      ]}
    >
      <Ionicons
        name={icon}
        size={15}
        color={active ? colors.primary : colors.textMuted}
      />
      <Text
        style={[styles.filterButtonText, active && styles.filterButtonTextActive]}
        numberOfLines={1}
      >
        {label}
      </Text>
      <Ionicons name="chevron-down" size={13} color={colors.textFaint} />
    </Pressable>
  );
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
  const [exactDate, setExactDate] = useState<Date | null>(null);
  const [activeSheet, setActiveSheet] = useState<
    'category' | 'date' | 'tags' | null
  >(null);

  useEffect(() => {
    const timer = setTimeout(() => setText(query), 250);
    return () => clearTimeout(timer);
  }, [query, setText]);

  const applyRange = (key: Exclude<RangeKey, 'exact'>) => {
    setRange(key);
    setExactDate(null);
    const option = RANGES.find((item) => item.key === key);
    if (!option?.days) {
      setDateRange(null, null);
      setActiveSheet(null);
      return;
    }
    const now = new Date();
    setDateRange(
      startOfDay(subDays(now, option.days)).toISOString(),
      endOfDay(now).toISOString(),
    );
    setActiveSheet(null);
  };

  const applyExactDate = (date: Date) => {
    setRange('exact');
    setExactDate(date);
    setDateRange(startOfDay(date).toISOString(), endOfDay(date).toISOString());
    setActiveSheet(null);
  };

  const categoryOptions = useMemo<FilterOption[]>(
    () => [
      { id: null, label: 'All categories' },
      ...(categories.data ?? []).map((category) => ({
        id: category.id,
        label: category.name,
        color: category.color,
      })),
    ],
    [categories.data],
  );

  const tagOptions = useMemo<FilterOption[]>(
    () =>
      (tags.data ?? []).map((tag) => ({
        id: tag.id,
        label: `#${tag.name}`,
      })),
    [tags.data],
  );

  const categoryLabel =
    categories.data?.find((category) => category.id === categoryId)?.name ??
    'All';
  const rangeLabel =
    range === 'exact' && exactDate
      ? format(exactDate, 'MMM d, yyyy')
      : (RANGES.find((option) => option.key === range)?.label ?? 'Any time');
  const tagLabel = tagIds.length
    ? `${tagIds.length} ${tagIds.length === 1 ? 'tag' : 'tags'}`
    : 'All';

  const openSheet = (sheet: 'category' | 'date' | 'tags') => {
    Keyboard.dismiss();
    setActiveSheet(sheet);
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
    setExactDate(null);
    setActiveSheet(null);
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

      <View style={styles.filterRow}>
        <FilterButton
          icon="grid-outline"
          label={categoryLabel}
          active={Boolean(categoryId)}
          onPress={() => openSheet('category')}
        />
        <FilterButton
          icon="calendar-outline"
          label={rangeLabel}
          active={range !== 'any'}
          onPress={() => openSheet('date')}
        />
        <FilterButton
          icon="pricetags-outline"
          label={tagLabel}
          active={tagIds.length > 0}
          onPress={() => openSheet('tags')}
        />
      </View>

      <View style={styles.optionsRow}>
        <Pressable
          onPress={() =>
            setScratchpadMode(
              scratchpadMode === 'exclude' ? 'include' : 'exclude',
            )
          }
          style={styles.checkboxRow}
          hitSlop={6}
        >
          <View
            style={[
              styles.checkbox,
              scratchpadMode !== 'exclude' && styles.checkboxChecked,
            ]}
          >
            {scratchpadMode !== 'exclude' ? (
              <Ionicons name="checkmark" size={13} color={colors.white} />
            ) : null}
          </View>
          <Text style={styles.checkboxLabel}>Include scratchpad</Text>
        </Pressable>

        {hasFilters ? (
          <Pressable onPress={clearAll} hitSlop={8}>
            <Text style={styles.clear}>Clear filters</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.resultsRow}>
        <Text style={styles.resultsText}>
          {results.isLoading
            ? 'Searching…'
            : `${notes.length} ${notes.length === 1 ? 'result' : 'results'}`}
        </Text>
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

      <FilterSheet
        visible={activeSheet === 'category'}
        title="Category"
        options={categoryOptions}
        selectedIds={[categoryId]}
        onToggle={setCategory}
        onClose={() => setActiveSheet(null)}
      />

      <FilterSheet
        visible={activeSheet === 'tags'}
        title="Tags"
        options={tagOptions}
        selectedIds={tagIds}
        multi
        emptyLabel="No tags yet. Add tags to your notes first."
        onToggle={(id) => {
          if (id) {
            toggleTag(id);
          }
        }}
        onClose={() => setActiveSheet(null)}
      />

      <DateFilterSheet
        visible={activeSheet === 'date'}
        selectedKey={range}
        exactDate={exactDate}
        onSelectPreset={applyRange}
        onSelectDate={applyExactDate}
        onClose={() => setActiveSheet(null)}
      />
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
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 36,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterButtonActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  filterButtonPressed: {
    opacity: 0.75,
  },
  filterButtonText: {
    ...typography.small,
    color: colors.textMuted,
    flexShrink: 1,
  },
  filterButtonTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 32,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxLabel: {
    ...typography.small,
    color: colors.textMuted,
  },
  loader: {
    paddingVertical: spacing.xxl,
  },
});
