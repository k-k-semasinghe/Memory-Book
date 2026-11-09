import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { colors, radius, spacing, typography } from '../../constants/theme';
import type { ReminderInput, ReminderRecurrence } from '../../types';
import { formatDateTime } from '../../utils/dates';

const RECURRENCES: Array<{ value: ReminderRecurrence; label: string }> = [
  { value: 'none', label: 'Once' },
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'yearly', label: 'Yearly' },
];

interface ReminderFormProps {
  noteId?: string;
  initialTitle?: string;
  onSubmit: (input: ReminderInput) => Promise<void>;
  onCancel?: () => void;
}

export function ReminderForm({ noteId, initialTitle = '', onSubmit, onCancel }: ReminderFormProps) {
  const [title, setTitle] = useState(initialTitle);
  const [dueAt, setDueAt] = useState(new Date(Date.now() + 60 * 60 * 1000));
  const [recurrence, setRecurrence] = useState<ReminderRecurrence>('none');
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onSubmit({ noteId: noteId ?? null, title, dueAt: dueAt.toISOString(), recurrence });
    } finally {
      setSaving(false);
    }
  };

  const openTimePicker = (date: Date) => {
    DateTimePickerAndroid.open({
      value: date,
      mode: 'time',
      onChange: (event: DateTimePickerEvent, selectedTime?: Date) => {
        if (event.type !== 'set' || !selectedTime) return;
        const next = new Date(date);
        next.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
        setDueAt(next);
      },
    });
  };

  const openDatePicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: dueAt,
        mode: 'date',
        minimumDate: new Date(),
        onChange: (event: DateTimePickerEvent, selectedDate?: Date) => {
          if (event.type !== 'set' || !selectedDate) return;
          const next = new Date(dueAt);
          next.setFullYear(
            selectedDate.getFullYear(),
            selectedDate.getMonth(),
            selectedDate.getDate(),
          );
          setDueAt(next);
          openTimePicker(next);
        },
      });
      return;
    }
    setShowPicker(true);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>New reminder</Text>
      <TextInput
        autoFocus
        value={title}
        onChangeText={setTitle}
        placeholder="What should you remember?"
        placeholderTextColor={colors.textFaint}
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border }]}
        returnKeyType="done"
      />
      <Text style={styles.label}>When</Text>
      <Pressable onPress={openDatePicker} style={[styles.dateButton, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="calendar-outline" size={18} color={colors.primary} />
        <Text style={styles.dateText}>{formatDateTime(dueAt.toISOString())}</Text>
      </Pressable>
      {Platform.OS !== 'android' && showPicker ? (
        <DateTimePicker
          value={dueAt}
          mode="datetime"
          minimumDate={new Date()}
          onChange={(_, date) => {
            setShowPicker(false);
            if (date) setDueAt(date);
          }}
        />
      ) : null}
      <Text style={styles.label}>Repeats</Text>
      <View style={styles.recurrences}>
        {RECURRENCES.map((item) => (
          <Pressable
            key={item.value}
            onPress={() => setRecurrence(item.value)}
            style={[styles.recurrence, recurrence === item.value && styles.recurrenceSelected]}
          >
            <Text style={[styles.recurrenceText, recurrence === item.value && styles.recurrenceTextSelected]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.actions}>
        {onCancel ? <Pressable onPress={onCancel} style={styles.cancel}><Text style={styles.cancelText}>Cancel</Text></Pressable> : null}
        <Pressable disabled={saving || !title.trim()} onPress={() => void submit()} style={[styles.save, (!title.trim() || saving) && styles.disabled]}>
          {saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.saveText}>Save reminder</Text>}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.xl, gap: spacing.md, backgroundColor: colors.background },
  heading: { ...typography.title, color: colors.text, marginBottom: spacing.sm },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, color: colors.text, ...typography.body },
  label: { ...typography.tiny, color: colors.textMuted, textTransform: 'uppercase', marginTop: spacing.sm },
  dateButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md },
  dateText: { ...typography.body, color: colors.text },
  recurrences: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  recurrence: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, backgroundColor: colors.surface },
  recurrenceSelected: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  recurrenceText: { ...typography.small, color: colors.textMuted },
  recurrenceTextSelected: { color: colors.primary, fontWeight: '700' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.lg },
  cancel: { padding: spacing.md },
  cancelText: { ...typography.bodyStrong, color: colors.textMuted },
  save: { minWidth: 140, alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.md },
  saveText: { ...typography.bodyStrong, color: colors.white },
  disabled: { opacity: 0.5 },
});
