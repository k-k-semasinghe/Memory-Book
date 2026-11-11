import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../../constants/theme';

interface ChipProps {
  label: string;
  active?: boolean;
  color?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
}

export function Chip({ label, active, color, icon, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: active ? colors.primarySoft : colors.surface, borderColor: active ? colors.primary : colors.border },
        active && styles.chipActive,
        pressed && onPress ? styles.chipPressed : null,
      ]}
    >
      {color ? (
        <View style={[styles.dot, { backgroundColor: color }]} />
      ) : icon ? (
        <Ionicons
          name={icon}
          size={13}
          color={active ? colors.primary : colors.textMuted}
        />
      ) : null}
      <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  chipPressed: {
    opacity: 0.7,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    ...typography.small,
    color: colors.textMuted,
    fontWeight: '600',
  },
  labelActive: {
    color: colors.primary,
  },
});
