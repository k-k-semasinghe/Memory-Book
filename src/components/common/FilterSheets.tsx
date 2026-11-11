import { Ionicons } from '@expo/vector-icons';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing, typography } from '../../constants/theme';

export type FilterOption = {
  id: string | null;
  label: string;
  color?: string;
};

export type DateRangeKey = 'any' | '7d' | '30d' | '90d' | 'exact';

const DATE_PRESETS: Array<{
  key: Exclude<DateRangeKey, 'exact'>;
  label: string;
}> = [
  { key: 'any', label: 'Any time' },
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: '90d', label: 'Last 90 days' },
];

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

interface BottomSheetProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

function BottomSheet({
  visible,
  title,
  onClose,
  children,
  footer,
}: BottomSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, spacing.md) },
          ]}
        >
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={8} style={styles.closeButton}>
              <Ionicons name="close" size={18} color={colors.textMuted} />
            </Pressable>
          </View>
          <ScrollView
            style={styles.sheetScroll}
            contentContainerStyle={styles.sheetContent}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            {children}
          </ScrollView>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </View>
    </Modal>
  );
}

interface FilterSheetProps {
  visible: boolean;
  title: string;
  options: FilterOption[];
  selectedIds: Array<string | null>;
  multi?: boolean;
  emptyLabel?: string;
  onToggle: (id: string | null) => void;
  onClose: () => void;
}

export function FilterSheet({
  visible,
  title,
  options,
  selectedIds,
  multi,
  emptyLabel = 'Nothing to show yet.',
  onToggle,
  onClose,
}: FilterSheetProps) {
  return (
    <BottomSheet
      visible={visible}
      title={title}
      onClose={onClose}
      footer={
        multi ? (
          <Pressable style={styles.doneButton} onPress={onClose}>
            <Text style={styles.doneButtonText}>Done</Text>
          </Pressable>
        ) : undefined
      }
    >
      {options.length ? (
        options.map((option) => {
          const selected = selectedIds.includes(option.id);
          return (
            <Pressable
              key={option.id ?? 'all'}
              onPress={() => {
                onToggle(option.id);
                if (!multi) {
                  onClose();
                }
              }}
              style={({ pressed }) => [
                styles.option,
                pressed && styles.optionPressed,
              ]}
            >
              {option.color ? (
                <View
                  style={[styles.optionDot, { backgroundColor: option.color }]}
                />
              ) : null}
              <Text style={styles.optionLabel} numberOfLines={1}>
                {option.label}
              </Text>
              {selected ? (
                <Ionicons name="checkmark" size={18} color={colors.primary} />
              ) : null}
            </Pressable>
          );
        })
      ) : (
        <Text style={styles.emptyText}>{emptyLabel}</Text>
      )}
    </BottomSheet>
  );
}

interface DateFilterSheetProps {
  visible: boolean;
  selectedKey: DateRangeKey;
  exactDate: Date | null;
  onSelectPreset: (key: Exclude<DateRangeKey, 'exact'>) => void;
  onSelectDate: (date: Date) => void;
  onClose: () => void;
}

export function DateFilterSheet({
  visible,
  selectedKey,
  exactDate,
  onSelectPreset,
  onSelectDate,
  onClose,
}: DateFilterSheetProps) {
  const [showCalendar, setShowCalendar] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() =>
    startOfMonth(exactDate ?? new Date()),
  );

  useEffect(() => {
    if (!visible) {
      return;
    }
    setShowCalendar(selectedKey === 'exact');
    setVisibleMonth(startOfMonth(exactDate ?? new Date()));
  }, [visible, selectedKey, exactDate]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(visibleMonth), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(visibleMonth), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [visibleMonth]);

  return (
    <BottomSheet visible={visible} title="Date" onClose={onClose}>
      {showCalendar ? (
        <>
          <Pressable
            onPress={() => setShowCalendar(false)}
            style={styles.backLink}
            hitSlop={8}
          >
            <Ionicons name="arrow-back" size={15} color={colors.primary} />
            <Text style={styles.backLinkText}>Quick ranges</Text>
          </Pressable>

          <View style={styles.calendarHeader}>
            <Pressable
              onPress={() => setVisibleMonth(subMonths(visibleMonth, 1))}
              hitSlop={8}
              style={styles.monthButton}
            >
              <Ionicons
                name="chevron-back"
                size={18}
                color={colors.textMuted}
              />
            </Pressable>
            <Text style={styles.monthLabel}>
              {format(visibleMonth, 'MMMM yyyy')}
            </Text>
            <Pressable
              onPress={() => setVisibleMonth(addMonths(visibleMonth, 1))}
              hitSlop={8}
              style={styles.monthButton}
            >
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textMuted}
              />
            </Pressable>
          </View>

          <View style={styles.weekRow}>
            {WEEKDAYS.map((day, index) => (
              <Text key={`${day}-${index}`} style={styles.weekday}>
                {day}
              </Text>
            ))}
          </View>

          <View style={styles.dayGrid}>
            {days.map((day) => {
              const selected = exactDate ? isSameDay(day, exactDate) : false;
              const currentMonth = isSameMonth(day, visibleMonth);
              return (
                <Pressable
                  key={day.toISOString()}
                  onPress={() => onSelectDate(day)}
                  style={styles.dayCell}
                >
                  <View
                    style={[
                      styles.dayCircle,
                      selected && styles.dayCircleSelected,
                      !selected && isToday(day) && styles.dayCircleToday,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        !currentMonth && styles.dayTextMuted,
                        selected && styles.dayTextSelected,
                      ]}
                    >
                      {format(day, 'd')}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : (
        <>
          {DATE_PRESETS.map((preset) => {
            const selected = selectedKey === preset.key;
            return (
              <Pressable
                key={preset.key}
                onPress={() => onSelectPreset(preset.key)}
                style={({ pressed }) => [
                  styles.option,
                  pressed && styles.optionPressed,
                ]}
              >
                <Text style={styles.optionLabel}>{preset.label}</Text>
                {selected ? (
                  <Ionicons name="checkmark" size={18} color={colors.primary} />
                ) : null}
              </Pressable>
            );
          })}
          <Pressable
            onPress={() => setShowCalendar(true)}
            style={({ pressed }) => [
              styles.option,
              pressed && styles.optionPressed,
            ]}
          >
            <Ionicons
              name="calendar-outline"
              size={17}
              color={colors.textMuted}
            />
            <Text style={styles.optionLabel} numberOfLines={1}>
              {exactDate
                ? format(exactDate, 'MMM d, yyyy')
                : 'Choose exact date'}
            </Text>
            {selectedKey === 'exact' ? (
              <Ionicons name="checkmark" size={18} color={colors.primary} />
            ) : (
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.textFaint}
              />
            )}
          </Pressable>
        </>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(24, 28, 25, 0.38)',
  },
  sheet: {
    maxHeight: '76%',
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sheetTitle: {
    ...typography.section,
    color: colors.text,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetScroll: {
    flexGrow: 0,
  },
  sheetContent: {
    gap: spacing.xs,
    paddingBottom: spacing.sm,
  },
  footer: {
    paddingTop: spacing.md,
  },
  option: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  optionPressed: {
    opacity: 0.7,
  },
  optionDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  optionLabel: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  emptyText: {
    ...typography.small,
    color: colors.textMuted,
    paddingVertical: spacing.lg,
    textAlign: 'center',
  },
  doneButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  doneButtonText: {
    ...typography.bodyStrong,
    color: colors.white,
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    paddingBottom: spacing.sm,
  },
  backLinkText: {
    ...typography.small,
    color: colors.primary,
    fontWeight: '700',
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  monthButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  monthLabel: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  weekRow: {
    flexDirection: 'row',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  weekday: {
    width: '14.2857%',
    textAlign: 'center',
    ...typography.tiny,
    color: colors.textMuted,
  },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingBottom: spacing.sm,
  },
  dayCell: {
    width: '14.2857%',
    alignItems: 'center',
    paddingVertical: spacing.xxs + 1,
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleSelected: {
    backgroundColor: colors.primary,
  },
  dayCircleToday: {
    borderWidth: 1,
    borderColor: colors.primary,
  },
  dayText: {
    ...typography.small,
    color: colors.text,
    fontWeight: '600',
  },
  dayTextMuted: {
    color: colors.textFaint,
    fontWeight: '400',
  },
  dayTextSelected: {
    color: colors.white,
    fontWeight: '700',
  },
});
