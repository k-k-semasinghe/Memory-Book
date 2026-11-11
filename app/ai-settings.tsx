import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AI_MODELS, DEFAULT_AI_CONFIG } from '../src/ai/config';
import { aiErrorMessage } from '../src/ai/errors';
import { getAIKey } from '../src/ai/keys';
import { testAIConnection } from '../src/ai/providers';
import type { AIConfig, AIProviderId } from '../src/ai/types';
import { colors, radius, spacing, typography } from '../src/constants/theme';
import {
  useAIConfig,
  useAIKeyStatus,
  useAIUsage,
  useDeleteAIKey,
  useDeleteAllAIData,
  useSaveAIConfig,
  useSetAIKey,
} from '../src/hooks/useAI';
import { useNetworkStatus } from '../src/hooks/useNetworkStatus';

const PROVIDERS: Array<{ id: AIProviderId; name: string; hint: string }> = [
  { id: 'gemini', name: 'Gemini', hint: 'Google AI Studio key' },
  { id: 'groq', name: 'Groq', hint: 'Groq Console key' },
];

export default function AISettingsScreen() {
  const configQuery = useAIConfig();
  const keyStatus = useAIKeyStatus();
  const usage = useAIUsage();
  const saveConfig = useSaveAIConfig();
  const setKey = useSetAIKey();
  const deleteKey = useDeleteAIKey();
  const deleteAll = useDeleteAllAIData();
  const network = useNetworkStatus();

  const [config, setConfig] = useState<AIConfig>(DEFAULT_AI_CONFIG);
  const [keyInput, setKeyInput] = useState('');
  const [testState, setTestState] = useState<'idle' | 'testing' | 'ok' | 'error'>(
    'idle',
  );
  const [testMessage, setTestMessage] = useState('');

  useEffect(() => {
    if (configQuery.data) setConfig(configQuery.data);
  }, [configQuery.data]);

  const provider = config.provider;
  const providerInfo = PROVIDERS.find((item) => item.id === provider) ?? PROVIDERS[0];
  const hasSavedKey = Boolean(keyStatus.data?.[provider]);

  const updateModel = (value: string) => {
    setConfig((current) => ({
      ...current,
      models: { ...current.models, [provider]: value },
    }));
    setTestState('idle');
    setTestMessage('');
  };

  const saveSettings = async () => {
    try {
      await saveConfig.mutateAsync(config);
      Alert.alert('Saved', 'AI settings updated.');
    } catch (error) {
      Alert.alert('Could not save', aiErrorMessage(error));
    }
  };

  const saveKey = async () => {
    const value = keyInput.trim();
    if (!value) {
      Alert.alert('API key required', `Paste your ${providerInfo.name} API key first.`);
      return;
    }
    try {
      await setKey.mutateAsync({ provider, key: value });
      setKeyInput('');
      setTestState('idle');
      setTestMessage('');
    } catch (error) {
      Alert.alert('Could not save key', aiErrorMessage(error));
    }
  };

  const removeKey = () => {
    Alert.alert(
      `Remove ${providerInfo.name} key?`,
      'AI will stay disabled for this provider until you add a key again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove key',
          style: 'destructive',
          onPress: () => void deleteKey.mutateAsync(provider),
        },
      ],
    );
  };

  const runTest = async () => {
    if (network.isOffline) {
      Alert.alert(
        'You are offline',
        'Connect to the internet to test the AI connection.',
      );
      return;
    }
    const key = keyInput.trim() || (await getAIKey(provider));
    if (!key) {
      Alert.alert('API key required', 'Save a key before testing the connection.');
      return;
    }

    setTestState('testing');
    setTestMessage('');
    try {
      await testAIConnection(provider, config.models[provider], key);
      setTestState('ok');
      setTestMessage(`Connected to ${providerInfo.name}.`);
    } catch (error) {
      setTestState('error');
      setTestMessage(aiErrorMessage(error));
    }
  };

  const confirmDeleteAll = () => {
    Alert.alert(
      'Delete all AI data?',
      'This removes AI summaries, keywords, conversations, and usage counters. Your notes stay intact.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete AI data',
          style: 'destructive',
          onPress: () => void deleteAll.mutateAsync(),
        },
      ],
    );
  };

  return (
    <ScrollView style={[styles.screen, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <View style={styles.privacyCard}>
        <View style={styles.privacyIcon}>
          <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
        </View>
        <View style={styles.privacyText}>
          <Text style={styles.privacyTitle}>Bring your own key</Text>
          <Text style={styles.privacyBody}>
            Notes are only sent when you tap Ask AI or Analyze. Nothing is sent
            automatically, and no Memory Book server is involved.
          </Text>
        </View>
      </View>

      <Text style={styles.label}>Provider</Text>
      <View style={styles.providerRow}>
        {PROVIDERS.map((item) => {
          const active = provider === item.id;
          return (
            <Pressable
              key={item.id}
              style={[styles.provider, active && styles.providerActive]}
              onPress={() => {
                setConfig((current) => ({ ...current, provider: item.id }));
                setKeyInput('');
                setTestState('idle');
                setTestMessage('');
              }}
            >
              <Text style={[styles.providerName, active && styles.providerNameActive]}>
                {item.name}
              </Text>
              <Text style={styles.providerHint}>{item.hint}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>API key</Text>
      <View style={styles.card}>
        <View style={styles.keyStatusRow}>
          <Text style={styles.keyStatus}>
            {hasSavedKey ? 'Key saved in secure storage' : 'No key saved'}
          </Text>
          <Ionicons
            name={hasSavedKey ? 'lock-closed-outline' : 'lock-open-outline'}
            size={16}
            color={hasSavedKey ? colors.primary : colors.textFaint}
          />
        </View>
        <TextInput
          value={keyInput}
          onChangeText={(value) => {
            setKeyInput(value);
            setTestState('idle');
            setTestMessage('');
          }}
          placeholder={`Paste ${providerInfo.name} API key`}
          placeholderTextColor={colors.textFaint}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
        />
        <View style={styles.actionRow}>
          <Pressable
            onPress={saveKey}
            style={[styles.button, styles.buttonPrimary]}
            disabled={setKey.isPending}
          >
            {setKey.isPending ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.buttonPrimaryText}>Save key</Text>
            )}
          </Pressable>
          {hasSavedKey ? (
            <Pressable onPress={removeKey} style={styles.button}>
              <Text style={styles.buttonDangerText}>Remove key</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <Text style={styles.label}>Model</Text>
      <View style={styles.card}>
        <TextInput
          value={config.models[provider]}
          onChangeText={updateModel}
          placeholder={AI_MODELS[provider]}
          placeholderTextColor={colors.textFaint}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Text style={styles.hint}>
          Default: {AI_MODELS[provider]}. You can use another model available to your
          key.
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Text style={styles.switchTitle}>Enable AI features</Text>
            <Text style={styles.hint}>
              Shows Ask AI in Search and AI suggestions on notes.
            </Text>
          </View>
          <Switch
            value={config.enabled}
            onValueChange={(enabled) =>
              setConfig((current) => ({ ...current, enabled }))
            }
            trackColor={{ false: colors.border, true: colors.primarySoft }}
            thumbColor={config.enabled ? colors.primary : colors.surface}
          />
        </View>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={runTest}
          style={[
            styles.button,
            styles.buttonFlex,
            (testState === 'testing' || network.isOffline) && styles.buttonDisabled,
          ]}
          disabled={testState === 'testing' || network.isOffline}
        >
          {testState === 'testing' ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : (
            <Text style={styles.buttonText}>Test connection</Text>
          )}
        </Pressable>
        <Pressable
          onPress={saveSettings}
          style={[styles.button, styles.buttonPrimary, styles.buttonFlex]}
          disabled={saveConfig.isPending}
        >
          {saveConfig.isPending ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.buttonPrimaryText}>Save settings</Text>
          )}
        </Pressable>
      </View>

      {testState === 'ok' ? (
        <Text style={[styles.feedback, { color: colors.primary }]}>{testMessage}</Text>
      ) : null}
      {testState === 'error' ? (
        <Text style={[styles.feedback, { color: colors.danger }]}>{testMessage}</Text>
      ) : null}

      <Text style={styles.label}>Usage</Text>
      <View style={styles.card}>
        <View style={styles.usageRow}>
          <View>
            <Text style={styles.usageValue}>{usage.data ?? 0}</Text>
            <Text style={styles.hint}>AI requests today</Text>
          </View>
          <Text style={styles.usageNote}>
            Free tiers may limit requests. Requests are counted on this device only.
          </Text>
        </View>
      </View>

      <Pressable onPress={confirmDeleteAll} style={styles.deleteButton}>
        <Ionicons name="trash-outline" size={16} color={colors.danger} />
        <Text style={styles.deleteText}>Delete all AI data</Text>
      </Pressable>
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
  privacyCard: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
  },
  privacyIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyText: {
    flex: 1,
    gap: spacing.xxs,
  },
  privacyTitle: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  privacyBody: {
    ...typography.small,
    color: colors.textMuted,
    lineHeight: 19,
  },
  label: {
    ...typography.tiny,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginTop: spacing.lg,
    marginLeft: spacing.xs,
  },
  providerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  provider: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.xxs,
  },
  providerActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  providerName: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  providerNameActive: {
    color: colors.primary,
  },
  providerHint: {
    ...typography.tiny,
    color: colors.textMuted,
    fontWeight: '400',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  keyStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  keyStatus: {
    ...typography.small,
    color: colors.textMuted,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    ...typography.body,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  button: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
  },
  buttonFlex: {
    flex: 1,
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonText: {
    ...typography.small,
    color: colors.text,
    fontWeight: '700',
  },
  buttonPrimaryText: {
    ...typography.small,
    color: colors.white,
    fontWeight: '700',
  },
  buttonDangerText: {
    ...typography.small,
    color: colors.danger,
    fontWeight: '700',
  },
  hint: {
    ...typography.small,
    color: colors.textMuted,
    lineHeight: 18,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  switchText: {
    flex: 1,
    gap: spacing.xxs,
  },
  switchTitle: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  feedback: {
    ...typography.small,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  usageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  usageValue: {
    ...typography.title,
    color: colors.text,
  },
  usageNote: {
    ...typography.small,
    color: colors.textMuted,
    flex: 1,
    lineHeight: 18,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.xxl,
    padding: spacing.md,
  },
  deleteText: {
    ...typography.small,
    color: colors.danger,
    fontWeight: '700',
  },
});
