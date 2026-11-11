import type { CategoryInput } from '../types';

interface SeedCategory extends Required<CategoryInput> {
  id: string;
}

export const DEFAULT_CATEGORIES: SeedCategory[] = [
  { id: 'cat-personal', name: 'Personal', color: '#6C63FF', icon: 'person-outline' },
  { id: 'cat-work', name: 'Work', color: '#0EA5E9', icon: 'briefcase-outline' },
  { id: 'cat-ideas', name: 'Ideas', color: '#F59E0B', icon: 'bulb-outline' },
  { id: 'cat-payments', name: 'Payments', color: '#EF4444', icon: 'card-outline' },
  { id: 'cat-purchases', name: 'Purchases', color: '#10B981', icon: 'bag-outline' },
  { id: 'cat-education', name: 'Education', color: '#8B5CF6', icon: 'school-outline' },
  { id: 'cat-people', name: 'People', color: '#EC4899', icon: 'people-outline' },
  { id: 'cat-travel', name: 'Travel', color: '#14B8A6', icon: 'airplane-outline' },
  { id: 'cat-appointments', name: 'Appointments', color: '#F97316', icon: 'calendar-outline' },
  { id: 'cat-tasks', name: 'Tasks', color: '#64748B', icon: 'checkbox-outline' },
];

export const CATEGORY_COLORS = [
  '#6C63FF',
  '#0EA5E9',
  '#F59E0B',
  '#EF4444',
  '#10B981',
  '#8B5CF6',
  '#EC4899',
  '#14B8A6',
  '#F97316',
  '#64748B',
];

export const CATEGORY_ICONS = [
  'person-outline',
  'briefcase-outline',
  'bulb-outline',
  'card-outline',
  'bag-outline',
  'school-outline',
  'people-outline',
  'airplane-outline',
  'calendar-outline',
  'checkbox-outline',
  'book-outline',
  'home-outline',
];

export const SCRATCHPAD_DAYS = 7;
