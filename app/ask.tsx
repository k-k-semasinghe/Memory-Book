import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ComponentRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { aiErrorMessage } from '../src/ai/errors';
import { askNotes } from '../src/ai/service';
import type { AskSource } from '../src/ai/types';
import { colors, radius, spacing, typography } from '../src/constants/theme';
import { useAIStatus } from '../src/hooks/useAI';
import { useRecentNotes } from '../src/hooks/useNotes';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: AskSource[];
  error?: boolean;
};

export default function AskScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const ai = useAIStatus();
  const recent = useRecentNotes(6);
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const rootRef = useRef<ComponentRef<typeof View>>(null);
  const [rootRect, setRootRect] = useState<{ y: number; height: number } | null>(
    null,
  );
  const [keyboardTop, setKeyboardTop] = useState<number | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const measureRoot = useCallback(() => {
    rootRef.current?.measureInWindow((_x, y, _width, height) => {
      setRootRect({ y, height });
    });
  }, []);

  const handleRootLayout = (_event: LayoutChangeEvent) => {
    requestAnimationFrame(measureRoot);
  };

  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardTop(event.endCoordinates.screenY);
      setKeyboardHeight(event.endCoordinates.height);
      setTimeout(measureRoot, 0);
      setTimeout(
        () => scrollRef.current?.scrollToEnd({ animated: true }),
        250,
      );
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardTop(null);
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [measureRoot]);

  const measuredLift =
    keyboardTop !== null && rootRect
      ? Math.max(0, Math.round(rootRect.y + rootRect.height - keyboardTop))
      : 0;
  const keyboardLift =
    (Platform.OS === 'android' ? keyboardHeight : measuredLift) +
    (keyboardHeight > 0 ? spacing.sm : 0);
  const composerBottomPadding =
    keyboardLift > 0 ? spacing.md : Math.max(spacing.md, insets.bottom);

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const canAsk = ai.status === 'ready';
  const setupMessage =
    ai.status === 'offline'
      ? 'You are offline. Connect to the internet to use AI.'
      : ai.status === 'no_key'
        ? 'Add a Gemini or Groq API key to ask questions.'
        : ai.status === 'disabled'
          ? 'Enable AI features in AI settings first.'
          : 'Checking AI setup…';

  const send = async () => {
    const question = input.trim();
    if (!question || sending) return;
    if (ai.status === 'offline') {
      Alert.alert(
        'You are offline',
        'Connect to the internet to use AI. Keyword search still works.',
      );
      return;
    }
    if (!canAsk) {
      Alert.alert('AI is not ready', setupMessage, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open settings', onPress: () => router.push('/ai-settings') },
      ]);
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: question,
    };
    setMessages((current) => [...current, userMessage]);
    setInput('');
    setSending(true);
    requestAnimationFrame(() =>
      scrollRef.current?.scrollToEnd({ animated: true }),
    );

    try {
      const result = await askNotes(question, conversationId);
      setConversationId(result.conversationId);
      void queryClient.invalidateQueries({ queryKey: ['ai', 'usage-today'] });
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: result.answer,
          sources: result.sources,
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: aiErrorMessage(error),
          error: true,
        },
      ]);
    } finally {
      setSending(false);
      requestAnimationFrame(() =>
        scrollRef.current?.scrollToEnd({ animated: true }),
      );
    }
  };

  const analyzeNote = (noteId: string) => {
    if (ai.status === 'offline') {
      Alert.alert(
        'You are offline',
        'Connect to the internet to use AI. Keyword search still works.',
      );
      return;
    }
    if (!canAsk) {
      Alert.alert('AI is not ready', setupMessage, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open settings', onPress: () => router.push('/ai-settings') },
      ]);
      return;
    }
    router.push(`/extract/${noteId}`);
  };

  return (
    <View
      ref={rootRef}
      style={[styles.screen, { paddingBottom: keyboardLift }]}
      onLayout={handleRootLayout}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.screen}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {ai.status === 'offline' ? (
          <View style={styles.banner}>
            <Ionicons name="cloud-offline-outline" size={18} color={colors.warning} />
            <Text style={styles.bannerText}>{setupMessage}</Text>
          </View>
        ) : null}

        {ai.status === 'disabled' || ai.status === 'no_key' ? (
          <View style={styles.setupCard}>
            <View style={styles.setupIcon}>
              <Ionicons name="sparkles-outline" size={18} color={colors.accent} />
            </View>
            <View style={styles.setupText}>
              <Text style={styles.setupTitle}>Finish AI setup</Text>
              <Text style={styles.setupBody}>{setupMessage}</Text>
            </View>
            <Pressable
              onPress={() => router.push('/ai-settings')}
              style={styles.setupButton}
            >
              <Text style={styles.setupButtonText}>Open</Text>
            </Pressable>
          </View>
        ) : null}

        {!messages.length ? (
          <>
            <View style={styles.welcome}>
              <View style={styles.welcomeIcon}>
                <Ionicons name="chatbubbles-outline" size={26} color={colors.accent} />
              </View>
              <Text style={styles.welcomeTitle}>Ask your notes</Text>
              <Text style={styles.welcomeBody}>
                Answers come only from your notes, with numbered sources. Try
                “What did I plan for the garden?” or “When did I meet Alex?”
              </Text>
            </View>

            <Text style={styles.sectionLabel}>Analyze a note</Text>
            <View style={styles.recentList}>
              {(recent.data ?? []).map((note) => (
                <Pressable
                  key={note.id}
                  onPress={() => analyzeNote(note.id)}
                  style={({ pressed }) => [
                    styles.recentCard,
                    pressed && styles.recentCardPressed,
                  ]}
                >
                  <View style={styles.recentIcon}>
                    <Ionicons
                      name="document-text-outline"
                      size={16}
                      color={colors.primary}
                    />
                  </View>
                  <View style={styles.recentText}>
                    <Text style={styles.recentTitle} numberOfLines={1}>
                      {note.title || 'Untitled note'}
                    </Text>
                    <Text style={styles.recentSubtitle} numberOfLines={1}>
                      {note.body || 'No text'}
                    </Text>
                  </View>
                  <Ionicons
                    name="sparkles-outline"
                    size={16}
                    color={colors.textFaint}
                  />
                </Pressable>
              ))}
              {!recent.isLoading && !recent.data?.length ? (
                <Text style={styles.hint}>No notes to analyze yet.</Text>
              ) : null}
            </View>
          </>
        ) : (
          <>
            <View style={styles.chatHeader}>
              <Text style={styles.sectionLabel}>Conversation</Text>
              <Pressable
                onPress={() => {
                  setMessages([]);
                  setConversationId(null);
                }}
                hitSlop={8}
              >
                <Text style={styles.newChat}>New chat</Text>
              </Pressable>
            </View>

            {messages.map((message) =>
              message.role === 'user' ? (
                <View key={message.id} style={styles.userBubble}>
                  <Text style={styles.userText}>{message.content}</Text>
                </View>
              ) : (
                <View key={message.id} style={styles.assistantBlock}>
                  <View style={styles.assistantBubble}>
                    <Text
                      style={[styles.assistantText, message.error && styles.errorText]}
                    >
                      {message.content}
                    </Text>
                  </View>
                  {message.sources?.length ? (
                    <View style={styles.sources}>
                      <Text style={styles.sourcesLabel}>Sources</Text>
                      {message.sources.map((source) => (
                        <Pressable
                          key={source.note.id}
                          onPress={() => router.push(`/note/${source.note.id}`)}
                          style={({ pressed }) => [
                            styles.sourceCard,
                            pressed && styles.recentCardPressed,
                          ]}
                        >
                          <View style={styles.sourceIndex}>
                            <Text style={styles.sourceIndexText}>{source.index}</Text>
                          </View>
                          <View style={styles.sourceText}>
                            <Text style={styles.sourceTitle} numberOfLines={1}>
                              {source.note.title || 'Untitled note'}
                            </Text>
                            <Text style={styles.sourceSnippet} numberOfLines={2}>
                              {source.note.body || 'No text'}
                            </Text>
                          </View>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                </View>
              ),
            )}
            {sending ? (
              <View style={styles.thinking}>
                <ActivityIndicator size="small" color={colors.accent} />
                <Text style={styles.hint}>Reading your notes…</Text>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      <View style={[styles.composer, { paddingBottom: composerBottomPadding }]}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Ask about your notes…"
          placeholderTextColor={colors.textFaint}
          style={styles.composerInput}
          multiline
          maxLength={500}
          editable={!sending}
          onFocus={() => {
            setTimeout(
              () => scrollRef.current?.scrollToEnd({ animated: true }),
              150,
            );
          }}
        />
        <Pressable
          onPress={send}
          disabled={!input.trim() || sending}
          style={[
            styles.sendButton,
            (!input.trim() || sending) && styles.sendButtonDisabled,
          ]}
        >
          {sending ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Ionicons name="arrow-up" size={18} color={colors.white} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.warningSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  bannerText: {
    ...typography.small,
    color: colors.warning,
    flex: 1,
    fontWeight: '600',
  },
  setupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  setupIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setupText: {
    flex: 1,
    gap: spacing.xxs,
  },
  setupTitle: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  setupBody: {
    ...typography.small,
    color: colors.textMuted,
  },
  setupButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  setupButtonText: {
    ...typography.small,
    color: colors.white,
    fontWeight: '700',
  },
  welcome: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  welcomeIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeTitle: {
    ...typography.title,
    color: colors.text,
  },
  welcomeBody: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  sectionLabel: {
    ...typography.tiny,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  recentList: {
    gap: spacing.sm,
  },
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  recentCardPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  recentIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentText: {
    flex: 1,
    gap: spacing.xxs,
  },
  recentTitle: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  recentSubtitle: {
    ...typography.small,
    color: colors.textMuted,
  },
  hint: {
    ...typography.small,
    color: colors.textMuted,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
  },
  newChat: {
    ...typography.small,
    color: colors.primary,
    fontWeight: '700',
  },
  userBubble: {
    alignSelf: 'flex-end',
    maxWidth: '86%',
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    borderBottomRightRadius: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  userText: {
    ...typography.body,
    color: colors.white,
  },
  assistantBlock: {
    gap: spacing.sm,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    maxWidth: '94%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderBottomLeftRadius: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  assistantText: {
    ...typography.body,
    color: colors.text,
    lineHeight: 21,
  },
  errorText: {
    color: colors.danger,
  },
  sources: {
    gap: spacing.sm,
    paddingLeft: spacing.sm,
  },
  sourcesLabel: {
    ...typography.tiny,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  sourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
  },
  sourceIndex: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceIndexText: {
    ...typography.tiny,
    color: colors.accent,
  },
  sourceText: {
    flex: 1,
    gap: spacing.xxs,
  },
  sourceTitle: {
    ...typography.small,
    color: colors.text,
    fontWeight: '700',
  },
  sourceSnippet: {
    ...typography.small,
    color: colors.textMuted,
  },
  thinking: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  composerInput: {
    flex: 1,
    maxHeight: 120,
    minHeight: 42,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm + 2,
    paddingBottom: spacing.sm + 2,
    ...typography.body,
    color: colors.text,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});
