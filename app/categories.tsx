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
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from '../src/hooks/useCategories';

export default function CategoriesScreen() {
  const categories = useCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const add = async () => {
    const value = name.trim();
    if (!value) return;
    try {
      await createCategory.mutateAsync({ name: value });
      setName('');
    } catch (error) {
      Alert.alert('Could not create category', String(error));
    }
  };

  const saveRename = async () => {
    if (!editingId) return;
    const value = editingName.trim();
    if (!value) return;
    try {
      await updateCategory.mutateAsync({ id: editingId, patch: { name: value } });
      setEditingId(null);
      setEditingName('');
    } catch (error) {
      Alert.alert('Could not rename category', String(error));
    }
  };

  const confirmDelete = (id: string, label: string) => {
    Alert.alert(
      'Delete category?',
      `Notes in "${label}" will become uncategorized. The notes themselves are not deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete category',
          style: 'destructive',
          onPress: () => void deleteCategory.mutateAsync(id),
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
          placeholder="New category name"
          placeholderTextColor={colors.textFaint}
          style={styles.input}
          returnKeyType="done"
          onSubmitEditing={add}
        />
        <Pressable onPress={add} style={styles.addButton}>
          {createCategory.isPending ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.addText}>Add</Text>
          )}
        </Pressable>
      </View>

      <Text style={styles.hint}>
        You can also create a category while writing a note. One category per note.
      </Text>

      <View style={styles.group}>
        {(categories.data ?? []).map((category, index) => (
          <View key={category.id}>
            {index > 0 ? <View style={styles.divider} /> : null}
            <View style={styles.row}>
              <View style={[styles.dot, { backgroundColor: category.color }]} />
              {editingId === category.id ? (
                <>
                  <TextInput
                    value={editingName}
                    onChangeText={setEditingName}
                    style={styles.renameInput}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={saveRename}
                  />
                  <Pressable onPress={saveRename} hitSlop={8}>
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  </Pressable>
                </>
              ) : (
                <>
                  <Text style={styles.rowTitle}>{category.name}</Text>
                  {category.isDefault ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>Default</Text>
                    </View>
                  ) : null}
                  <View style={styles.spacer} />
                  <Pressable
                    hitSlop={8}
                    onPress={() => {
                      setEditingId(category.id);
                      setEditingName(category.name);
                    }}
                  >
                    <Ionicons
                      name="pencil-outline"
                      size={17}
                      color={colors.textMuted}
                    />
                  </Pressable>
                  <Pressable
                    hitSlop={8}
                    onPress={() => confirmDelete(category.id, category.name)}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={17}
                      color={colors.danger}
                    />
                  </Pressable>
                </>
              )}
            </View>
          </View>
        ))}
        {!categories.isLoading && !categories.data?.length ? (
          <Text style={styles.empty}>No categories yet. Add one above.</Text>
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
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  rowTitle: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  badge: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
    borderRadius: radius.pill,
  },
  badgeText: {
    ...typography.tiny,
    color: colors.textMuted,
    textTransform: 'none',
    letterSpacing: 0,
  },
  spacer: {
    flex: 1,
  },
  renameInput: {
    flex: 1,
    ...typography.bodyStrong,
    color: colors.text,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary,
    paddingVertical: 2,
  },
  empty: {
    ...typography.small,
    color: colors.textMuted,
    padding: spacing.lg,
    textAlign: 'center',
  },
});
