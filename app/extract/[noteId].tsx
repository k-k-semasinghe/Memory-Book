import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { aiErrorMessage } from '../../src/ai/errors';
import { extractNoteMetadata } from '../../src/ai/service';
import type { AIExtraction, AIProviderId } from '../../src/ai/types';
import { Chip } from '../../src/components/common/Chip';
import { colors, radius, spacing, typography } from '../../src/constants/theme';
import {
  useAIStatus,
  useApplyNoteEnrichment,
  useDeleteNoteEnrichment,
  useNoteEnrichment,
} from '../../src/hooks/useAI';
import { useCategories } from '../../src/hooks/useCategories';
import { useNote } from '../../src/hooks/useNotes';
import { useTags } from '../../src/hooks/useTags';

export default function ExtractScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ noteId: string }>();
  const noteId = Array.isArray(params.noteId) ? params.noteId[0] : params.noteId;
  const ai = useAIStatus();
  const note = useNote(noteId);
  const categories = useCategories();
  const tags = useTags();
  const enrichment = useNoteEnrichment(noteId);
  const applyEnrichment = useApplyNoteEnrichment(noteId);
  const deleteEnrichment = useDeleteNoteEnrichment(noteId);

  const [result, setResult] = useState<AIExtraction | null>(null);
  const [summary, setSummary] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [provider, setProvider] = useState(ai.provider);
  const [model, setModel] = useState(ai.config.models[ai.provider]);
  const [source, setSource] = useState<'saved' | 'new' | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const initialised = useRef(false);
  const autoRan = useRef(false);

  const showResult = useCallback(
    (next: AIExtraction, nextSource: 'saved' | 'new', providerId: AIProviderId, modelId: string) => {
      setResult(next);
      setSummary(next.summary);
      setSelectedCategory(next.categoryId);
      setSelectedTags(next.tagNames);
      setProvider(providerId);
      setModel(modelId);
      setSource(nextSource);
    },
    [],
  );

  useEffect(() => {
    if (initialised.current || enrichment.isLoading || tags.isLoading || !note.data) {
      return;
    }
    initialised.current = true;

    if (enrichment.data) {
      const suggestedTags = (tags.data ?? [])
        .filter((tag) => enrichment.data?.suggestedTagIds.includes(tag.id))
        .map((tag) => tag.name);
      showResult(
        {
          summary: enrichment.data.summary ?? '',
          keyPoints: enrichment.data.keyPoints,
          categoryId: enrichment.data.suggestedCategoryId,
          tagNames: suggestedTags,
          keywords: enrichment.data.keywords,
        },
        'saved',
        enrichment.data.provider === 'groq' ? 'groq' : ai.provider,
        enrichment.data.model ?? ai.config.models[ai.provider],
      );
    }
  }, [
    ai.config.models,
    ai.provider,
    enrichment.data,
    enrichment.isLoading,
    note.data,
    showResult,
    tags.data,
    tags.isLoading,
  ]);

  const runAnalysis = useCallback(async () => {
    if (ai.status !== 'ready') {
      setError(
        ai.status === 'offline'
          ? 'You are offline. Connect to the internet to use AI.'
          : 'Finish AI setup in Settings first.',
      );
      return;
    }
    setAnalyzing(true);
    setError('');
    try {
      const response = await extractNoteMetadata(noteId);
      void queryClient.invalidateQueries({ queryKey: ['ai', 'usage-today'] });
      showResult(response.extraction, 'new', response.provider, response.model);
    } catch (analysisError) {
      setError(aiErrorMessage(analysisError));
    } finally {
      setAnalyzing(false);
    }
  }, [ai.status, noteId, queryClient, showResult]);

  useEffect(() => {
    if (autoRan.current || !initialised.current || !note.data || analyzing || result) {
      return;
    }
    if (ai.status === 'ready' && !enrichment.data) {
      autoRan.current = true;
      void runAnalysis();
    }
  }, [ai.status, analyzing, enrichment.data, note.data, result, runAnalysis]);

  const apply = async () => {
    if (!result) return;
    try {
      await applyEnrichment.mutateAsync({
        summary: summary.trim() || result.summary,
        keyPoints: result.keyPoints,
        categoryId: selectedCategory,
        tagNames: selectedTags,
        keywords: result.keywords,
        provider,
        model,
      });
      Alert.alert('Applied', 'AI suggestions were saved to this note.', [
        { text: 'Done', onPress: () => router.back() },
      ]);
    } catch (applyError) {
      Alert.alert('Could not apply', aiErrorMessage(applyError));
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      'Remove AI details?',
      'The saved AI summary, keywords, and applied AI category/tags will be removed from this note.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            void deleteEnrichment.mutateAsync().then(() => {
              setResult(null);
              setSource(null);
              setSummary('');
              router.back();
            });
          },
        },
      ],
    );
  };

  const categoryName = categories.data?.find(
    (category) => category.id === selectedCategory,
  )?.name;

  if (note.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!note.data) {
    return (
      <View style={styles.center}>
        <Text style={styles.hint}>Note not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.noteCard}>
        <View style={styles.noteHeader}>
          <Ionicons name="document-text-outline" size={18} color={colors.primary} />
          <Text style={styles.noteTitle} numberOfLines={2}>
            {note.data.title || 'Untitled note'}
          </Text>
        </View>
        <Text style={styles.noteBody} numberOfLines={6}>
          {note.data.body || 'This note has no text.'}
        </Text>
      </View>

      {analyzing ? (
        <View style={styles.analyzingCard}>
          <ActivityIndicator color={colors.accent} />
          <View style={styles.analyzingText}>
            <Text style={styles.analyzingTitle}>Analyzing note</Text>
            <Text style={styles.hint}>Extracting a summary, tags, and keywords.</Text>
          </View>
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={runAnalysis} style={styles.retryButton}>
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : null}

      {!result && !analyzing && !error ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No AI details yet</Text>
          <Text style={styles.hint}>
            Analyze this note to get a summary, suggested category and tags, and
            searchable keywords.
          </Text>
          <Pressable onPress={runAnalysis} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Analyze note</Text>
          </Pressable>
        </View>
      ) : null}

      {result ? (
        <>
          <View style={styles.sourceRow}>
            <Text style={styles.sectionLabel}>
              {source === 'saved' ? 'Saved AI details' : 'New suggestions'}
            </Text>
            <Pressable onPress={runAnalysis} disabled={analyzing} hitSlop={8}>
              <Text style={styles.link}>Re-analyze</Text>
            </Pressable>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardLabel}>Summary</Text>
            <TextInput
              value={summary}
              onChangeText={setSummary}
              multiline
              style={styles.summaryInput}
              placeholder="Summary"
              placeholderTextColor={colors.textFaint}
            />
          </View>

          {result.keyPoints.length ? (
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Key points</Text>
              {result.keyPoints.map((point) => (
                <View key={point} style={styles.pointRow}>
                  <View style={styles.bullet} />
                  <Text style={styles.pointText}>{point}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.card}>
            <Text style={styles.cardLabel}>Category</Text>
            <View style={styles.wrapRow}>
              <Chip
                label="No category"
                active={!selectedCategory}
                onPress={() => setSelectedCategory(null)}
              />
              {(categories.data ?? []).map((category) => (
                <Chip
                  key={category.id}
                  label={category.name}
                  color={category.color}
                  active={selectedCategory === category.id}
                  onPress={() =>
                    setSelectedCategory(
                      selectedCategory === category.id ? null : category.id,
                    )
                  }
                />
              ))}
            </View>
            {categoryName ? (
              <Text style={styles.hint}>Suggested: {categoryName}</Text>
            ) : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardLabel}>Tags</Text>
            {result.tagNames.length ? (
              <View style={styles.wrapRow}>
                {result.tagNames.map((tag) => (
                  <Chip
                    key={tag}
                    label={`#${tag}`}
                    active={selectedTags.includes(tag)}
                    onPress={() =>
                      setSelectedTags((current) =>
                        current.includes(tag)
                          ? current.filter((item) => item !== tag)
                          : [...current, tag],
                      )
                    }
                  />
                ))}
              </View>
            ) : (
              <Text style={styles.hint}>No new tags suggested.</Text>
            )}
            <Text style={styles.hint}>
              Existing note tags are kept. Selected tags are added.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardLabel}>Search keywords</Text>
            <View style={styles.wrapRow}>
              {result.keywords.map((keyword) => (
                <View key={keyword} style={styles.keyword}>
                  <Text style={styles.keywordText}>{keyword}</Text>
                </View>
              ))}
            </View>
            {!result.keywords.length ? (
              <Text style={styles.hint}>No keywords returned.</Text>
            ) : null}
          </View>

          <View style={styles.footerRow}>
            {source === 'saved' ? (
              <Pressable onPress={confirmDelete} style={styles.deleteButton}>
                <Text style={styles.deleteText}>Remove AI details</Text>
              </Pressable>
            ) : (
              <View />
            )}
            <Pressable
              onPress={apply}
              disabled={applyEnrichment.isPending || !summary.trim()}
              style={[
                styles.primaryButton,
                (applyEnrichment.isPending || !summary.trim()) &&
                  styles.buttonDisabled,
              ]}
            >
              {applyEnrichment.isPending ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.primaryButtonText}>Apply suggestions</Text>
              )}
            </Pressable>
          </View>
        </>
      ) : null}
    </ScrollView>
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
    gap: spacing.md,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  noteCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  noteTitle: {
    ...typography.section,
    color: colors.text,
    flex: 1,
  },
  noteBody: {
    ...typography.body,
    color: colors.textMuted,
    lineHeight: 21,
  },
  analyzingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  analyzingText: {
    flex: 1,
    gap: spacing.xxs,
  },
  analyzingTitle: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  errorCard: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  errorText: {
    ...typography.small,
    color: colors.danger,
    fontWeight: '600',
  },
  retryButton: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
  },
  retryText: {
    ...typography.small,
    color: colors.danger,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  emptyTitle: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
  },
  sectionLabel: {
    ...typography.tiny,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  link: {
    ...typography.small,
    color: colors.primary,
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
  cardLabel: {
    ...typography.tiny,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  summaryInput: {
    ...typography.body,
    color: colors.text,
    lineHeight: 21,
    padding: 0,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  pointRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  bullet: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginTop: 8,
  },
  pointText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
    lineHeight: 21,
  },
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  keyword: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  keywordText: {
    ...typography.small,
    color: colors.textMuted,
  },
  hint: {
    ...typography.small,
    color: colors.textMuted,
    lineHeight: 19,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    ...typography.small,
    color: colors.white,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  deleteButton: {
    paddingVertical: spacing.sm,
  },
  deleteText: {
    ...typography.small,
    color: colors.danger,
    fontWeight: '700',
  },
});
