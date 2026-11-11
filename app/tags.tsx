import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
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

import { colors, radius, spacing, typography } from '../src/constants/theme';
import { useCreateTag, useDeleteTag, useTags } from '../src/hooks/useTags';

export default function TagsScreen() {
  const tags = useTags();
  const createTag = useCreateTag();
  const deleteTag = useDeleteTag();
  const [name, setName] = useState('');

  const add = async () => {
    const value = name.trim().replace(/^#/, '');
    if (!value) return;
    try {
      await createTag.mutateAsync(value);
      setName('');
    } catch (error) {
      Alert.alert('Could not create tag', String(error));
    }
  };

  const confirmDelete = (id: string, label: string) => {
    Alert.alert(
      'Delete tag?',
      `"#${label}" will be removed from every note. The notes themselves are not deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete tag',
          style: 'destructive',
          onPress: () => void deleteTag.mutateAsync(id),
        },
      ],
    );
  };

  return (
    <ScrollView style={[styles.screen, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <View style={styles.addRow}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="New tag name"
          placeholderTextColor={colors.textFaint}
          style={styles.input}
          autoCapitalize="none"
          returnKeyType="done"
          onSubmitEditing={add}
        />
        <Pressable onPress={add} style={styles.addButton}>
          {createTag.isPending ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.addText}>Add</Text>
          )}
        </Pressable>
      </View>

      <Text style={styles.hint}>
        Tags are optional. You can create them while writing a note, and a note can have
        any number of tags.
      </Text>

      <View style={styles.group}>
        {(tags.data ?? []).map((tag, index) => (
          <View key={tag.id}>
            {index > 0 ? <View style={styles.divider} /> : null}
            <View style={styles.row}>
              <View style={styles.hash}>
                <Text style={styles.hashText}>#</Text>
              </View>
              <Text style={styles.rowTitle}>{tag.name}</Text>
              <View style={styles.spacer} />
              <Pressable
                hitSlop={8}
                onPress={() => confirmDelete(tag.id, tag.name)}
              >
                <Ionicons name="trash-outline" size={17} color={colors.danger} />
              </Pressable>
            </View>
          </View>
        ))}
        {!tags.isLoading && !tags.data?.length ? (
          <Text style={styles.empty}>No tags yet. Add one above.</Text>
        ) : null}
      </View>
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
  addRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    ...typography.body,
  },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    minWidth: 62,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: {
    ...typography.small,
    color: colors.white,
    fontWeight: '700',
  },
  hint: {
    ...typography.small,
    color: colors.textFaint,
    lineHeight: 18,
  },
  group: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: spacing.lg,
  },
  hash: {
    width: 22,
    height: 22,
    borderRadius: 7,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hashText: {
    ...typography.small,
    color: colors.primary,
    fontWeight: '700',
  },
  rowTitle: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  spacer: {
    flex: 1,
  },
  empty: {
    ...typography.small,
    color: colors.textMuted,
    padding: spacing.lg,
    textAlign: 'center',
  },
});
