import type { Note } from '../types';

export function noteTitle(note: Pick<Note, 'title' | 'body'>): string {
  if (note.title.trim()) return note.title.trim();
  const firstLine = note.body.trim().split('\n')[0]?.trim();
  if (firstLine) return firstLine.length > 60 ? `${firstLine.slice(0, 60)}…` : firstLine;
  return 'Untitled note';
}

export function bodyPreview(body: string, length = 140): string {
  const clean = body.replace(/\s+/g, ' ').trim();
  if (clean.length <= length) return clean;
  return `${clean.slice(0, length)}…`;
}

export function truncate(value: string, length: number): string {
  if (value.length <= length) return value;
  return `${value.slice(0, length)}…`;
}
