import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../src/constants/theme';

const PLANNED = [
  'Reminders live on your device only — no server push, no account needed.',
  'You choose which notes get a reminder and when.',
  'A reminder that is missed stays visible; nothing fires off silently.',
  'Notifications are suggestions, never deletions.',
];

export default function RemindersScreen() {
  return (
    <View style={styles.screen}>
      <View style={styles.hero}>
        <View style={styles.iconWrap}>
          <Ionicons name="notifications-outline" size={28} color={colors.primary} />
        </View>
        <Text style={styles.title}>Reminders are the next milestone</Text>
        <Text style={styles.subtitle}>
          The notes, categories, tags, search, and scratchpad are ready. Local reminders
          are next on the plan.
        </Text>
      </View>

      <View style={styles.card}>
        {PLANNED.map((item) => (
          <View key={item} style={styles.item}>
            <Ionicons name="checkmark-circle-outline" size={18} color={colors.primary} />
            <Text style={styles.itemText}>{item}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.xl,
    gap: spacing.xl,
  },
  hero: {
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.title,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    lineHeight: 23,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  item: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  itemText: {
    ...typography.small,
    color: colors.textMuted,
    flex: 1,
    lineHeight: 19,
  },
});
