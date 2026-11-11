import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Chip } from '../../src/components/common/Chip';
import { colors, radius, spacing, typography } from '../../src/constants/theme';
import { useAIStatus, useNoteEnrichment } from '../../src/hooks/useAI';
import {
  useDeleteForever,
  useDeleteNote,
  useExtendScratchpad,
  useMakePermanent,
  useNote,
  useRestoreNote,
} from '../../src/hooks/useNotes';
import { useNoteReminders } from '../../src/hooks/useReminders';
import { expiryLabel, formatDateTime, isExpired } from '../../src/utils/dates';
import { noteTitle } from '../../src/utils/format';

export default function NoteDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const note = useNote(id);
  const deleteNote = useDeleteNote();
  const restoreNote = useRestoreNote();
  const deleteForever = useDeleteForever();
  const extend = useExtendScratchpad();
  const makePermanent = useMakePermanent();
  const ai = useAIStatus();
  const enrichment = useNoteEnrichment(id);
  const reminders = useNoteReminders(id);

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

  const data = note.data;
  const inTrash = Boolean(data.deletedAt);
  const expired = data.isScratchpad && isExpired(data.expiresAt);

  const confirmDelete = () => {
    Alert.alert(
      'Move to trash?',
      'You can restore it from Trash. Nothing is deleted permanently.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Move to trash',
          style: 'destructive',
          onPress: async () => {
            await deleteNote.mutateAsync(id);
            router.back();
          },
        },
      ],
    );
  };

  const confirmDeleteForever = () => {
    Alert.alert(
      'Delete forever?',
      'This note will be removed permanently. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete forever',
          style: 'destructive',
          onPress: async () => {
            await deleteForever.mutateAsync(id);
            router.back();
          },
        },
      ],
    );
  };

  const openAI = () => {
    if (ai.status === 'offline') {
      Alert.alert(
        'You are offline',
        'Connect to the internet to use AI. Keyword search still works.',
      );
      return;
    }
    if (ai.status === 'no_key' || ai.status === 'disabled') {
      router.push('/ai-settings');
      return;
    }
    if (ai.status === 'ready') {
      router.push(`/extract/${id}`);
      return;
    }
    Alert.alert('Checking AI', 'Wait a moment while the connection is checked.');
  };

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.metaTop}>
        {data.category ? (
          <Chip label={data.category.name} color={data.category.color} />
        ) : (
          <Text style={styles.uncategorized}>Uncategorized</Text>
        )}
        {data.isScratchpad ? (
          <Chip
            label={expiryLabel(data.expiresAt)}
            icon="hourglass-outline"
          />
        ) : null}
      </View>

      <Text style={styles.title}>{noteTitle(data)}</Text>
      {data.body ? <Text style={styles.body}>{data.body}</Text> : null}

      {!inTrash ? (
        <Pressable
          onPress={() => router.push({ pathname: '/reminders', params: { noteId: id, title: noteTitle(data) } })}
          style={styles.reminderCard}
        >
          <Ionicons name="notifications-outline" size={18} color={colors.primary} />
          <View style={styles.reminderText}>
            <Text style={styles.reminderTitle}>Add a reminder</Text>
            <Text style={styles.reminderSubtitle}>
              {reminders.data?.length ? `${reminders.data.length} reminder${reminders.data.length === 1 ? '' : 's'} scheduled` : 'Get notified about this memory'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
        </Pressable>
      ) : null}

      {!inTrash ? (
        <Pressable
          onPress={openAI}
          style={({ pressed }) => [styles.aiCard, pressed && styles.aiCardPressed]}
        >
          <View style={styles.aiIcon}>
            <Ionicons
              name={
                ai.status === 'offline'
                  ? 'cloud-offline-outline'
                  : 'sparkles-outline'
              }
              size={18}
              color={colors.accent}
            />
          </View>
          <View style={styles.aiText}>
            <Text style={styles.aiTitle}>
              {enrichment.data ? 'AI details' : 'AI suggestions'}
            </Text>
            <Text style={styles.aiSubtitle} numberOfLines={2}>
              {enrichment.data?.summary ||
                (ai.status === 'offline'
                  ? 'You are offline — keyword search still works'
                  : ai.status === 'no_key'
                    ? 'Add an API key in Settings'
                    : ai.status === 'disabled'
                      ? 'Enable AI in Settings'
                      : 'Summarize, tag, and extract search keywords')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
        </Pressable>
      ) : null}

      {enrichment.data?.summary ? (
        <View style={styles.aiSummaryCard}>
          <Text style={styles.aiSummaryLabel}>AI summary</Text>
          <Text style={styles.aiSummaryText}>{enrichment.data.summary}</Text>
          {enrichment.data.keyPoints.length ? (
            <View style={styles.aiPoints}>
              {enrichment.data.keyPoints.map((point) => (
                <View key={point} style={styles.aiPointRow}>
                  <View style={styles.aiBullet} />
                  <Text style={styles.aiPointText}>{point}</Text>
                </View>
              ))}
            </View>
          ) : null}
          {enrichment.data.keywords.length ? (
            <View style={styles.aiKeywords}>
              {enrichment.data.keywords.map((keyword) => (
                <View key={keyword} style={styles.aiKeyword}>
                  <Text style={styles.aiKeywordText}>{keyword}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      {data.tags.length ? (
        <View style={styles.tags}>
          {data.tags.map((tag) => (
            <View key={tag.id} style={styles.tag}>
              <Text style={styles.tagText}>#{tag.name}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {data.isScratchpad ? (
        <View
          style={[styles.scratchCard, expired ? styles.scratchCardExpired : null]}
        >
          <View style={styles.scratchHeader}>
            <Ionicons
              name={expired ? 'alert-circle-outline' : 'hourglass-outline'}
              size={18}
              color={expired ? colors.danger : colors.scratch}
            />
            <Text
              style={[styles.scratchTitle, expired && { color: colors.danger }]}
            >
              {expired ? 'Past the 7-day mark' : 'Scratchpad note'}
            </Text>
          </View>
          <Text style={styles.scratchHint}>
            {expired
              ? 'Nothing has been deleted. Choose what to do with this note.'
              : `This note will be flagged ${expiryLabel(data.expiresAt).toLowerCase()}. You will always be asked first.`}
          </Text>
          <View style={styles.scratchActions}>
            <Pressable
              style={styles.scratchButton}
              onPress={() => void extend.mutateAsync({ id, days: 7 })}
            >
              <Text style={styles.scratchButtonText}>Keep 7 more days</Text>
            </Pressable>
            <Pressable
              style={styles.scratchButton}
              onPress={() => void makePermanent.mutateAsync(id)}
            >
              <Text style={styles.scratchButtonText}>Make permanent</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <View style={styles.metaList}>
        <MetaRow label="Event date" value={formatDateTime(data.occurredAt)} />
        <MetaRow label="Recorded" value={formatDateTime(data.recordedAt)} />
        <MetaRow label="Timezone" value={data.timezone} />
      </View>

      {inTrash ? (
        <View style={styles.actions}>
          <Pressable
            style={[styles.action, styles.primaryAction]}
            onPress={async () => {
              await restoreNote.mutateAsync(id);
              router.back();
            }}
          >
            <Ionicons name="refresh-outline" size={18} color={colors.white} />
            <Text style={styles.primaryActionText}>Restore note</Text>
          </Pressable>
          <Pressable
            style={[styles.action, styles.dangerAction]}
            onPress={confirmDeleteForever}
          >
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
            <Text style={styles.dangerActionText}>Delete forever</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.actions}>
          <Pressable
            style={[styles.action, styles.primaryAction]}
            onPress={() => router.push(`/edit/${id}`)}
          >
            <Ionicons name="create-outline" size={18} color={colors.white} />
            <Text style={styles.primaryActionText}>Edit note</Text>
          </Pressable>
          <Pressable
            style={[styles.action, styles.dangerAction]}
            onPress={confirmDelete}
          >
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
            <Text style={styles.dangerActionText}>Move to trash</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
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
    gap: spacing.lg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  message: {
    ...typography.body,
    color: colors.textMuted,
  },
  metaTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  uncategorized: {
    ...typography.tiny,
    color: colors.textFaint,
    textTransform: 'uppercase',
  },
  title: {
    ...typography.display,
    color: colors.text,
  },
  body: {
    ...typography.body,
    color: colors.text,
    lineHeight: 24,
  },
  aiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  aiCardPressed: {
    opacity: 0.8,
  },
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  reminderText: {
    flex: 1,
    gap: spacing.xxs,
  },
  reminderTitle: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  reminderSubtitle: {
    ...typography.small,
    color: colors.textMuted,
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
  aiSummaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  aiSummaryLabel: {
    ...typography.tiny,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  aiSummaryText: {
    ...typography.body,
    color: colors.text,
    lineHeight: 22,
  },
  aiPoints: {
    gap: spacing.xs,
    paddingTop: spacing.xs,
  },
  aiPointRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  aiBullet: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.accent,
    marginTop: 8,
  },
  aiPointText: {
    ...typography.small,
    color: colors.textMuted,
    flex: 1,
    lineHeight: 19,
  },
  aiKeywords: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  aiKeyword: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  aiKeywordText: {
    ...typography.tiny,
    color: colors.textMuted,
    fontWeight: '500',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  tag: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  tagText: {
    ...typography.small,
    color: colors.textMuted,
  },
  scratchCard: {
    backgroundColor: colors.scratchSoft,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  scratchCardExpired: {
    backgroundColor: colors.dangerSoft,
  },
  scratchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  scratchTitle: {
    ...typography.bodyStrong,
    color: colors.scratch,
  },
  scratchHint: {
    ...typography.small,
    color: colors.textMuted,
    lineHeight: 19,
  },
  scratchActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  scratchButton: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  scratchButtonText: {
    ...typography.small,
    color: colors.text,
    fontWeight: '600',
  },
  metaList: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  metaLabel: {
    ...typography.small,
    color: colors.textFaint,
  },
  metaValue: {
    ...typography.small,
    color: colors.textMuted,
    flexShrink: 1,
    textAlign: 'right',
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  primaryAction: {
    backgroundColor: colors.primary,
  },
  primaryActionText: {
    ...typography.bodyStrong,
    color: colors.white,
  },
  dangerAction: {
    backgroundColor: colors.dangerSoft,
  },
  dangerActionText: {
    ...typography.bodyStrong,
    color: colors.danger,
  },
});
