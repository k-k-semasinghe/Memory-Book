import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { colors, radius, spacing, typography } from '../../constants/theme';
import { useCreateTag, useTags } from '../../hooks/useTags';
import { Chip } from '../common/Chip';

interface TagSelectorProps {
  selectedIds: string[];
  onChange: (tagIds: string[]) => void;
}

export function TagSelector({ selectedIds, onChange }: TagSelectorProps) {
  const { data: tags } = useTags();
  const createTag = useCreateTag();
  const [input, setInput] = useState('');

  const toggle = (tagId: string) => {
    onChange(
      selectedIds.includes(tagId)
        ? selectedIds.filter((id) => id !== tagId)
        : [...selectedIds, tagId],
    );
  };

  const add = async () => {
    const name = input.trim().replace(/^#/, '');
    if (!name) return;

    const existing = (tags ?? []).find(
      (tag) => tag.name.toLowerCase() === name.toLowerCase(),
    );
    if (existing) {
      if (!selectedIds.includes(existing.id)) {
        onChange([...selectedIds, existing.id]);
      }
      setInput('');
      return;
    }

    try {
      const created = await createTag.mutateAsync(name);
      onChange([...selectedIds, created.id]);
      setInput('');
    } catch (error) {
      Alert.alert('Could not create tag', String(error));
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Add a tag…"
          placeholderTextColor={colors.textFaint}
          style={styles.input}
          returnKeyType="done"
          onSubmitEditing={add}
          autoCapitalize="none"
        />
        <Pressable onPress={add} style={styles.addButton}>
          {createTag.isPending ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.addText}>Add</Text>
          )}
        </Pressable>
      </View>

      {tags?.length ? (
        <View style={styles.tags}>
          {tags.map((tag) => (
            <Chip
              key={tag.id}
              label={`#${tag.name}`}
              active={selectedIds.includes(tag.id)}
              onPress={() => toggle(tag.id)}
            />
          ))}
        </View>
      ) : (
        <Text style={styles.hint}>No tags yet. Type a name above to create one.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  },
  addText: {
    ...typography.small,
    color: colors.white,
    fontWeight: '700',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  hint: {
    ...typography.small,
    color: colors.textFaint,
  },
});
