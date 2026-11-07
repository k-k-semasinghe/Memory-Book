import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../../constants/theme';
import type { Note } from '../../types';
import { expiryLabel, formatNoteDate, isExpired } from '../../utils/dates';
import { bodyPreview, noteTitle } from '../../utils/format';

interface NoteCardProps {
  note: Note;
  onPress: () => void;
  showScratchpadStatus?: boolean;
}

export function NoteCard({ note, onPress, showScratchpadStatus }: NoteCardProps) {
  const title = noteTitle(note);
  const preview = bodyPreview(note.body);
  const expired = note.isScratchpad && isExpired(note.expiresAt);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
    >
      <View style={styles.topRow}>
        <View style={styles.metaLeft}>
          {note.category ? (
            <View style={styles.category}>
              <View style={[styles.dot, { backgroundColor: note.category.color }]} />
              <Text style={styles.categoryText} numberOfLines={1}>
                {note.category.name}
              </Text>
            </View>
          ) : (
            <Text style={styles.uncategorized}>Uncategorized</Text>
          )}
          {note.isScratchpad ? (
            <View style={[styles.scratchBadge, expired ? styles.scratchExpired : null]}>
              <Ionicons
                name="hourglass-outline"
                size={11}
                color={expired ? colors.danger : colors.scratch}
              />
              <Text
                style={[
                  styles.scratchText,
                  expired ? { color: colors.danger } : null,
                ]}
              >
                {showScratchpadStatus ? expiryLabel(note.expiresAt) : 'Scratchpad'}
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.date}>{formatNoteDate(note.occurredAt)}</Text>
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>

      {preview && preview !== title ? (
        <Text style={styles.preview} numberOfLines={2}>
          {preview}
        </Text>
      ) : null}

      {note.tags.length ? (
        <View style={styles.tags}>
          {note.tags.slice(0, 3).map((tag) => (
            <View key={tag.id} style={styles.tag}>
              <Text style={styles.tagText}>#{tag.name}</Text>
            </View>
          ))}
          {note.tags.length > 3 ? (
            <Text style={styles.moreTags}>+{note.tags.length - 3}</Text>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.75,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  metaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 1,
  },
  category: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    maxWidth: 140,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  categoryText: {
    ...typography.tiny,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  uncategorized: {
    ...typography.tiny,
    color: colors.textFaint,
    textTransform: 'uppercase',
  },
  scratchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.scratchSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  scratchExpired: {
    backgroundColor: colors.dangerSoft,
  },
  scratchText: {
    ...typography.tiny,
    color: colors.scratch,
    fontSize: 10,
  },
  date: {
    ...typography.tiny,
    color: colors.textFaint,
    textTransform: 'none',
    letterSpacing: 0,
  },
  title: {
    ...typography.section,
    color: colors.text,
  },
  preview: {
    ...typography.small,
    color: colors.textMuted,
    lineHeight: 19,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
  },
  tag: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  tagText: {
    ...typography.tiny,
    color: colors.textMuted,
    textTransform: 'none',
    letterSpacing: 0,
    fontWeight: '500',
  },
  moreTags: {
    ...typography.tiny,
    color: colors.textFaint,
    textTransform: 'none',
    letterSpacing: 0,
  },
});
