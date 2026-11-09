import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing, typography } from '../../constants/theme';
import type { Note, NoteInput } from '../../types';
import { CategoryPicker } from './CategoryPicker';
import { TagSelector } from './TagSelector';

interface NoteFormProps {
  heading: string;
  initial?: Note;
  defaultScratchpad?: boolean;
  onSubmit: (input: NoteInput) => Promise<void>;
  onCancel: () => void;
}

export function NoteForm({
  heading,
  initial,
  defaultScratchpad,
  onSubmit,
  onCancel,
}: NoteFormProps) {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [body, setBody] = useState(initial?.body ?? '');
  const [categoryId, setCategoryId] = useState<string | null>(
    initial?.categoryId ?? null,
  );
  const [tagIds, setTagIds] = useState<string[]>(
    initial?.tags.map((tag) => tag.id) ?? [],
  );
  const [isScratchpad, setIsScratchpad] = useState(
    initial?.isScratchpad ?? defaultScratchpad ?? false,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = Boolean(body.trim() || title.trim()) && !saving;

  const submit = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        title,
        body,
        categoryId,
        tagIds,
        isScratchpad,
        occurredAt: initial?.occurredAt,
        sourceType: initial?.sourceType ?? 'text',
        recordType: initial?.recordType ?? 'none',
      });
    } catch (submitError) {
      setError(String(submitError));
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Pressable onPress={onCancel} hitSlop={10} style={styles.headerSide}>
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
        <Text style={styles.heading} numberOfLines={1}>
          {heading}
        </Text>
        <Pressable
          onPress={submit}
          disabled={!canSave}
          hitSlop={10}
          style={styles.headerSide}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={[styles.save, !canSave && styles.saveDisabled]}>Save</Text>
          )}
        </Pressable>
      </View>

      <ScrollView
        style={[styles.flex, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Title (optional)"
          placeholderTextColor={colors.textFaint}
          style={styles.titleInput}
          returnKeyType="next"
        />

        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="What do you want to remember?"
          placeholderTextColor={colors.textFaint}
          style={styles.bodyInput}
          multiline
          textAlignVertical="top"
          autoFocus={!initial}
        />

        <View style={styles.field}>
          <Text style={styles.label}>Category</Text>
          <CategoryPicker selectedId={categoryId} onChange={setCategoryId} />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Tags</Text>
          <TagSelector selectedIds={tagIds} onChange={setTagIds} />
        </View>

        <View style={styles.scratchCard}>
          <View style={styles.scratchText}>
            <Text style={styles.scratchTitle}>Scratchpad note</Text>
            <Text style={styles.scratchHint}>
              Kept for 7 days after the last edit. You will be asked before anything is
              deleted.
            </Text>
          </View>
          <Switch
            value={isScratchpad}
            onValueChange={setIsScratchpad}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.white}
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  headerSide: {
    minWidth: 58,
    alignItems: 'flex-end',
  },
  cancel: {
    ...typography.body,
    color: colors.textMuted,
  },
  heading: {
    ...typography.bodyStrong,
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  save: {
    ...typography.bodyStrong,
    color: colors.primary,
    fontWeight: '700',
  },
  saveDisabled: {
    color: colors.textFaint,
  },
  content: {
    padding: spacing.xl,
    gap: spacing.xl,
    paddingBottom: spacing.xxxl * 2,
  },
  titleInput: {
    ...typography.title,
    color: colors.text,
    paddingVertical: spacing.xs,
  },
  bodyInput: {
    ...typography.body,
    color: colors.text,
    lineHeight: 23,
    minHeight: 160,
    paddingVertical: spacing.xs,
  },
  field: {
    gap: spacing.sm,
  },
  label: {
    ...typography.tiny,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  scratchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.scratchSoft,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  scratchText: {
    flex: 1,
    gap: spacing.xxs,
  },
  scratchTitle: {
    ...typography.bodyStrong,
    color: colors.scratch,
  },
  scratchHint: {
    ...typography.small,
    color: colors.textMuted,
    lineHeight: 18,
  },
  error: {
    ...typography.small,
    color: colors.danger,
  },
});
