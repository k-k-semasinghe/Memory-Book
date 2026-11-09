import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, spacing, typography } from '../src/constants/theme';
import { usePermissions } from '../src/hooks/usePermissions';
import { markPermissionOnboardingSeen } from '../src/permissions/onboarding';
import type { NotificationAccess, SpecialAccess } from '../src/permissions/system';

interface PermissionCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  status: NotificationAccess | SpecialAccess;
  actionLabel?: string;
  busy: boolean;
  onPress?: () => void;
}

function statusLabel(status: NotificationAccess | SpecialAccess): string {
  if (status === 'granted') return 'Allowed';
  if (status === 'not_required') return 'Not required';
  return 'Needs access';
}

function statusColor(status: NotificationAccess | SpecialAccess): string {
  if (status === 'granted') return colors.primary;
  if (status === 'not_required') return colors.textMuted;
  return colors.warning;
}

function PermissionCard({
  icon,
  title,
  description,
  status,
  actionLabel,
  busy,
  onPress,
}: PermissionCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIcon}>
          <Ionicons name={icon} size={20} color={colors.primary} />
        </View>
        <View style={styles.cardTitleWrap}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={[styles.status, { color: statusColor(status) }]}>
            {statusLabel(status)}
          </Text>
        </View>
      </View>
      <Text style={styles.cardDescription}>{description}</Text>
      {actionLabel && onPress ? (
        <Pressable
          disabled={busy}
          onPress={onPress}
          style={({ pressed }) => [
            styles.cardAction,
            pressed && styles.pressed,
            busy && styles.disabled,
          ]}
        >
          {busy ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={styles.cardActionText}>{actionLabel}</Text>
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

export default function PermissionsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ firstRun?: string }>();
  const firstRun = params.firstRun === '1';
  const permissions = usePermissions();
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (key: string, action: () => Promise<boolean | void>) => {
    setBusy(key);
    try {
      const opened = await action();
      if (opened === false) {
        Alert.alert(
          'Settings unavailable',
          'Open your phone settings and allow this permission for Memory Book.',
        );
      }
      await permissions.refresh();
    } catch (error) {
      Alert.alert(
        'Could not open permission',
        error instanceof Error ? error.message : 'Try again from phone settings.',
      );
    } finally {
      setBusy(null);
    }
  };

  const finish = async () => {
    await markPermissionOnboardingSeen();
    if (firstRun) {
      router.replace('/(tabs)');
    } else {
      router.back();
    }
  };

  const state = permissions.state;
  const notificationAction =
    state?.notifications === 'granted' || state?.notificationsCanAskAgain === false
      ? 'Open notification settings'
      : 'Allow notifications';

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.heroIcon}>
            <Ionicons name="notifications" size={32} color={colors.primary} />
          </View>
          <Text style={styles.title}>Set up reminders</Text>
          <Text style={styles.subtitle}>
            Allow these once so birthdays and repeating reminders can wake your
            phone when they are due.
          </Text>
        </View>

        {permissions.loading && !state ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : state ? (
          <View style={styles.cards}>
            <PermissionCard
              icon="notifications-outline"
              title="Notifications"
              description="Required to show reminder alerts."
              status={state.notifications}
              actionLabel={notificationAction}
              busy={busy === 'notifications'}
              onPress={() =>
                void run('notifications', async () => {
                  if (
                    state.notifications === 'granted' ||
                    !state.notificationsCanAskAgain
                  ) {
                    await permissions.openNotifications();
                  } else {
                    await permissions.requestNotifications();
                  }
                })
              }
            />

            <PermissionCard
              icon="alarm-outline"
              title="Alarms & reminders"
              description="Lets Android deliver reminders at the exact time instead of delaying them."
              status={state.exactAlarms}
              actionLabel={
                state.exactAlarms === 'not_required'
                  ? undefined
                  : state.exactAlarms === 'granted'
                    ? 'Open alarm settings'
                    : 'Allow in settings'
              }
              busy={busy === 'exact'}
              onPress={
                state.exactAlarms === 'not_required'
                  ? undefined
                  : () => void run('exact', permissions.openExactAlarms)
              }
            />

            <PermissionCard
              icon="phone-portrait-outline"
              title="Full-screen reminders"
              description="Lets Android show the reminder over the lock screen instead of only in the notification bar."
              status={state.fullScreenIntent}
              actionLabel={
                state.fullScreenIntent === 'not_required'
                  ? undefined
                  : state.fullScreenIntent === 'granted'
                    ? 'Open full-screen settings'
                    : 'Allow in settings'
              }
              busy={busy === 'fullScreen'}
              onPress={
                state.fullScreenIntent === 'not_required'
                  ? undefined
                  : () => void run('fullScreen', permissions.openFullScreen)
              }
            />

            <PermissionCard
              icon="layers-outline"
              title="Appear on top"
              description="Required so the reminder can open over the current app even when your phone is unlocked."
              status={state.overlay}
              actionLabel={
                state.overlay === 'not_required'
                  ? undefined
                  : state.overlay === 'granted'
                    ? 'Open appear-on-top settings'
                    : 'Allow in settings'
              }
              busy={busy === 'overlay'}
              onPress={
                state.overlay === 'not_required'
                  ? undefined
                  : () => void run('overlay', permissions.openOverlay)
              }
            />
          </View>
        ) : (
          <Text style={styles.fallback}>
            Could not read permission status. Open Settings to allow permissions
            for Memory Book.
          </Text>
        )}

        <View style={styles.footer}>
          <Pressable
            onPress={() => void finish()}
            style={({ pressed }) => [styles.continue, pressed && styles.pressed]}
          >
            <Text style={styles.continueText}>Continue</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.white} />
          </Pressable>
          <Pressable onPress={() => void finish()} style={styles.skip}>
            <Text style={styles.skipText}>
              {firstRun ? 'Skip for now' : 'Back'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.xl,
  },
  header: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.display,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    lineHeight: 22,
  },
  loading: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  cards: {
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitleWrap: {
    flex: 1,
    gap: spacing.xxs,
  },
  cardTitle: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  status: {
    ...typography.tiny,
    textTransform: 'uppercase',
  },
  cardDescription: {
    ...typography.small,
    color: colors.textMuted,
    lineHeight: 19,
  },
  cardAction: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surfaceMuted,
    minWidth: 130,
    alignItems: 'center',
  },
  cardActionText: {
    ...typography.small,
    color: colors.primary,
    fontWeight: '700',
  },
  footer: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  continue: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  continueText: {
    ...typography.bodyStrong,
    color: colors.white,
  },
  skip: {
    alignItems: 'center',
    padding: spacing.md,
  },
  skipText: {
    ...typography.small,
    color: colors.textMuted,
  },
  pressed: {
    opacity: 0.82,
  },
  disabled: {
    opacity: 0.55,
  },
  fallback: {
    ...typography.body,
    color: colors.textMuted,
    lineHeight: 22,
  },
});
