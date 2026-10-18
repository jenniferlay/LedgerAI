import type { ComponentProps } from 'react';
import { MaterialIcons } from '@expo/vector-icons';

export type IconName = ComponentProps<typeof MaterialIcons>['name'];

export interface ParentCategory {
  id: string;
  label: string;
  icon: IconName;
}

export const PARENT_CATEGORIES: ParentCategory[] = [
  { id: 'Food & Dining', label: 'Food & Dining', icon: 'restaurant' },
  { id: 'Transport', label: 'Transport', icon: 'directions-car' },
  { id: 'Shopping', label: 'Shopping', icon: 'shopping-bag' },
  { id: 'Housing & Utilities', label: 'Housing', icon: 'home' },
  { id: 'Entertainment', label: 'Entertainment', icon: 'movie' },
  { id: 'Health & Wellness', label: 'Health', icon: 'fitness-center' },
];

/** Max number of icons ever rendered in the grid (5 rows of 6). */
export const MAX_VISIBLE_ICONS = 30;

/** Shown by default (no search). Exactly 30, typed so bad names fail to compile. */
export const POPULAR_ICONS: IconName[] = [
  // food & drink (6)
  'restaurant', 'local-cafe', 'fastfood', 'local-pizza', 'local-bar',
  'local-grocery-store',
  // shopping (2)
  'shopping-cart', 'shopping-bag',
  // transport (4)
  'directions-car', 'local-gas-station', 'directions-bus', 'flight',
  // home & bills (5)
  'home', 'bolt', 'wifi', 'build', 'smartphone',
  // entertainment & learning (6)
  'movie', 'music-note', 'sports-esports', 'headphones', 'menu-book',
  'school',
  // health & personal (4)
  'fitness-center', 'local-hospital', 'spa', 'pets',
  // gifts & money (3)
  'card-giftcard', 'payments', 'savings',
];

/** Every icon in the installed MaterialIcons version. */
export const ALL_ICONS = Object.keys(MaterialIcons.glyphMap) as IconName[];

const POPULAR_SET = new Set<string>(POPULAR_ICONS);

// Popular icons first, then the rest alphabetically. Computed once.
const SEARCHABLE_ICONS: IconName[] = [
  ...POPULAR_ICONS,
  ...ALL_ICONS.filter((name) => !POPULAR_SET.has(name)).sort(),
];

/**
 * Returns at most MAX_VISIBLE_ICONS icons.
 * - Empty query: the curated popular list.
 * - Otherwise: every word in the query must appear in the icon name
 *   ("local cafe" matches "local-cafe"), popular matches ranked first.
 */
export function searchIcons(query: string): IconName[] {
  const tokens = query.trim().toLowerCase().split(/[\s-]+/).filter(Boolean);
  if (tokens.length === 0) return POPULAR_ICONS;

  const results: IconName[] = [];
  for (const name of SEARCHABLE_ICONS) {
    if (tokens.every((token) => name.includes(token))) {
      results.push(name);
      if (results.length === MAX_VISIBLE_ICONS) break;
    }
  }
  return results;
}