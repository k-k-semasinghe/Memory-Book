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

import { colors, radius, spacing, typography } from '../../constants/theme';
import { useCategories, useCreateCategory } from '../../hooks/useCategories';
import { Chip } from '../common/Chip';

interface CategoryPickerProps {
  selectedId: string | null;
  onChange: (categoryId: string | null) => void;
}

export function CategoryPicker({ selectedId, onChange }: CategoryPickerProps) {
  const { data: categories } = useCategories();
  const createCategory = useCreateCategory();
  const [showInput, setShowInput] = useState(false);
  const [name, setName] = useState('');

  const submit = async () => {
    const value = name.trim();
    if (!value) {
      setShowInput(false);
      return;
    }
    try {
      const created = await createCategory.mutateAsync({ name: value });
      onChange(created.id);
      setName('');
      setShowInput(false);
    } catch (error) {
      Alert.alert('Could not create category', String(error));
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Chip
          label="No category"
          active={!selectedId}
          onPress={() => onChange(null)}
        />
        {(categories ?? []).map((category) => (
          <Chip
            key={category.id}
            label={category.name}
            color={category.color}
            active={selectedId === category.id}
            onPress={() => onChange(category.id)}
          />
        ))}
        <Pressable
          onPress={() => setShowInput((value) => !value)}
          style={styles.newButton}
        >
          <Text style={styles.newButtonText}>+ New</Text>
        </Pressable>
      </ScrollView>

      {showInput ? (
        <View style={styles.inputRow}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="New category name"
            placeholderTextColor={colors.textFaint}
            style={styles.input}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={submit}
          />
          <Pressable onPress={submit} style={styles.saveButton}>
            {createCategory.isPending ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={styles.saveText}>Add</Text>
            )}
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  scroll: {
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  newButton: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primary,
  },
  newButtonText: {
    ...typography.small,
    color: colors.primary,
    fontWeight: '600',
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
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    minWidth: 62,
    alignItems: 'center',
  },
  saveText: {
    ...typography.small,
    color: colors.white,
    fontWeight: '700',
  },
});
