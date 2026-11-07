import {
  addDays,
  format,
  formatDistanceToNowStrict,
  isAfter,
  isSameDay,
  isSameYear,
  isYesterday,
} from 'date-fns';

export function nowIso(): string {
  return new Date().toISOString();
}

export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function addDaysIso(iso: string, days: number): string {
  return addDays(new Date(iso), days).toISOString();
}

export function isExpired(iso: string | null): boolean {
  if (!iso) return false;
  return isAfter(new Date(), new Date(iso));
}

export function formatNoteDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  if (isSameDay(date, now)) return `Today, ${format(date, 'h:mm a')}`;
  if (isYesterday(date)) return `Yesterday, ${format(date, 'h:mm a')}`;
  if (isSameYear(date, now)) return format(date, 'MMM d');
  return format(date, 'MMM d, yyyy');
}

export function formatDateTime(iso: string): string {
  return format(new Date(iso), 'MMM d, yyyy · h:mm a');
}

export function formatShortDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  if (isSameYear(date, now)) return format(date, 'MMM d');
  return format(date, 'MMM d, yyyy');
}

export function dayKey(iso: string): string {
  return format(new Date(iso), 'yyyy-MM-dd');
}

export function dayLabel(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  if (isSameDay(date, now)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'EEEE, MMM d');
}

export function relativeTime(iso: string): string {
  return formatDistanceToNowStrict(new Date(iso), { addSuffix: true });
}

export function expiryLabel(expiresAt: string | null): string {
  if (!expiresAt) return '';
  if (isExpired(expiresAt)) return `Expired ${relativeTime(expiresAt)}`;
  return `Expires ${relativeTime(expiresAt)}`;
}

export function todayLabel(): string {
  return format(new Date(), 'EEEE, MMMM d');
}
