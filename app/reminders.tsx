import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ReminderForm } from '../src/components/reminders/ReminderForm';
import { colors, radius, spacing, typography } from '../src/constants/theme';
import { useCreateReminder, useDeleteReminder, useReminders } from '../src/hooks/useReminders';
import { formatDateTime } from '../src/utils/dates';

const recurrenceLabel: Record<string, string> = {
  none: 'Once',
  hourly: 'Hourly',
  daily: 'Daily',
  weekly: 'Weekly',
  yearly: 'Yearly',
};

export default function RemindersScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ noteId?: string; title?: string }>();
  const reminders = useReminders();
  const create = useCreateReminder();
  const remove = useDeleteReminder();

  if (reminders.isLoading) return <View style={styles.center}><Text style={styles.muted}>Loading reminders...</Text></View>;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Reminders</Text>
          <Text style={styles.subtitle}>Local notifications, including repeating reminders.</Text>
        </View>
        <Ionicons name="notifications-outline" size={28} color={colors.primary} />
      </View>
      <ReminderForm
        noteId={params.noteId}
        initialTitle={params.title}
        onSubmit={async (input) => {
          try {
            await create.mutateAsync(input);
          } catch (error) {
            Alert.alert('Could not schedule reminder', error instanceof Error ? error.message : 'Try again.');
          }
        }}
      />
      <Text style={styles.sectionTitle}>Scheduled</Text>
      {reminders.data?.length ? reminders.data.map((reminder) => (
        <View key={reminder.id} style={styles.card}>
          <View style={styles.cardIcon}><Ionicons name="notifications-outline" size={18} color={colors.primary} /></View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>{reminder.title}</Text>
            <Text style={styles.cardMeta}>{formatDateTime(reminder.dueAt)} · {recurrenceLabel[reminder.recurrence]}</Text>
          </View>
          <Pressable onPress={() => Alert.alert('Delete reminder?', 'This also cancels its notification.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => void remove.mutateAsync(reminder) }])} hitSlop={8}>
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
          </Pressable>
        </View>
      )) : <Text style={styles.muted}>No reminders yet.</Text>}
      <Pressable onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>Done</Text></Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.md, paddingBottom: spacing.xxxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  title: { ...typography.title, color: colors.text },
  subtitle: { ...typography.small, color: colors.textMuted, marginTop: spacing.xs },
  sectionTitle: { ...typography.section, color: colors.text, marginTop: spacing.lg },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md },
  cardIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  cardText: { flex: 1, gap: spacing.xs },
  cardTitle: { ...typography.bodyStrong, color: colors.text },
  cardMeta: { ...typography.small, color: colors.textMuted },
  muted: { ...typography.body, color: colors.textMuted },
  back: { alignSelf: 'flex-end', padding: spacing.md },
  backText: { ...typography.bodyStrong, color: colors.primary },
});
