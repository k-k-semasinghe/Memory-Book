import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../src/constants/theme';
import { useReminders } from '../src/hooks/useReminders';
import {
  clearPendingReminder,
  dismissReminderNotification,
} from '../src/notifications';

export default function ReminderAlertScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ reminderId?: string }>();
  const reminders = useReminders();
  const reminder = reminders.data?.find((item) => item.id === params.reminderId);

  useEffect(() => {
    if (typeof params.reminderId === 'string') {
      void clearPendingReminder(params.reminderId);
      void dismissReminderNotification(params.reminderId);
    }
  }, [params.reminderId]);

  const close = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/reminders');
  };

  return (
    <View style={styles.screen}>
      <View style={styles.icon}><Ionicons name="notifications" size={42} color={colors.primary} /></View>
      <Text style={styles.label}>REMINDER</Text>
      <Text style={styles.title}>{reminder?.title ?? 'Memory Book reminder'}</Text>
      {reminder?.description ? <Text style={styles.description}>{reminder.description}</Text> : null}
      <Pressable onPress={close} style={styles.done}>
        <Ionicons name="checkmark" size={22} color={colors.white} />
        <Text style={styles.doneText}>Done</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  icon: { width: 88, height: 88, borderRadius: radius.pill, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  label: { ...typography.tiny, color: colors.primary, letterSpacing: 1.2 },
  title: { ...typography.display, color: colors.text, textAlign: 'center' },
  description: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  done: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, width: '100%', backgroundColor: colors.primary, borderRadius: radius.lg, padding: spacing.lg, marginTop: spacing.xl },
  doneText: { ...typography.bodyStrong, color: colors.white },
});
