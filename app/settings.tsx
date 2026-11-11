import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, radius, spacing, typography } from '../src/constants/theme';
import { useAIStatus } from '../src/hooks/useAI';
import { useNoteStats } from '../src/hooks/useNotes';

interface RowProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  danger?: boolean;
}

function Row({ icon, title, subtitle, onPress, danger }: RowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.rowIcon}>
        <Ionicons
          name={icon}
          size={18}
          color={danger ? colors.danger : colors.primary}
        />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, danger && { color: colors.danger }]}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
    </Pressable>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const stats = useNoteStats();
  const ai = useAIStatus();
  const comingSoon = (title: string, message: string) =>
    Alert.alert(title, message);

  const aiSubtitle =
    ai.status === 'ready'
      ? 'Gemini / Groq · ready'
      : ai.status === 'offline'
        ? 'Offline · keyword search still works'
        : ai.status === 'no_key'
          ? 'Add a Gemini or Groq API key'
          : 'Bring your own key · opt-in';

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.sectionLabel}>Organize</Text>
      <View style={styles.group}>
        <Row
          icon="pricetags-outline"
          title="Categories"
          subtitle={`${stats.data?.categories ?? 0} categories`}
          onPress={() => router.push('/categories')}
        />
        <View style={styles.divider} />
        <Row
          icon="pricetag-outline"
          title="Tags"
          subtitle={`${stats.data?.tags ?? 0} tags`}
          onPress={() => router.push('/tags')}
        />
      </View>

      <Text style={styles.sectionLabel}>Storage</Text>
      <View style={styles.group}>
        <Row
          icon="server-outline"
          title="Storage & cleanup"
          subtitle={`${stats.data?.total ?? 0} notes · oldest first`}
          onPress={() => router.push('/storage')}
        />
        <View style={styles.divider} />
        <Row
          icon="trash-outline"
          title="Trash"
          subtitle={`${stats.data?.trash ?? 0} items · never auto-empties`}
          onPress={() => router.push('/trash')}
        />
      </View>

      <Text style={styles.sectionLabel}>Assistant</Text>
      <View style={styles.group}>
        <Row
          icon="sparkles-outline"
          title="AI assistant"
          subtitle={aiSubtitle}
          onPress={() => router.push('/ai-settings')}
        />
        <View style={styles.divider} />
        <Row
          icon="notifications-outline"
          title="Reminders"
          subtitle="One-time, hourly, daily, weekly, or yearly"
          onPress={() => router.push('/reminders')}
        />
        <View style={styles.divider} />
        <Row
          icon="options-outline"
          title="Permissions"
          subtitle="Notifications, alarms, full-screen"
          onPress={() => router.push('/permissions')}
        />
      </View>

      <Text style={styles.sectionLabel}>Data & privacy</Text>
      <View style={styles.group}>
        <Row
          icon="shield-checkmark-outline"
          title="Privacy & security"
          subtitle="Encryption and EXIF stripping planned"
          onPress={() =>
            comingSoon(
              'Privacy & security',
              'Encrypted local storage, EXIF/GPS stripping, and account deletion are part of the build plan. AI requests will always be opt-in.',
            )
          }
        />
        <View style={styles.divider} />
        <Row
          icon="cloud-download-outline"
          title="Export & backup"
          subtitle="Restorable export · planned"
          onPress={() =>
            comingSoon(
              'Export & backup',
              'A restorable, encrypted export is planned. Backups never expire automatically.',
            )
          }
        />
      </View>

      <Text style={styles.footer}>Memory Book · v0.1.0</Text>
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
    gap: spacing.sm,
  },
  sectionLabel: {
    ...typography.tiny,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
    marginLeft: spacing.xs,
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
    padding: spacing.lg,
  },
  rowPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: spacing.xxs,
  },
  rowTitle: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  rowSubtitle: {
    ...typography.small,
    color: colors.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: spacing.lg + 34 + spacing.md,
  },
  footer: {
    ...typography.small,
    color: colors.textFaint,
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
});
