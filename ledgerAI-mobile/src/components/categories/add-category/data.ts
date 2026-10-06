import type { ComponentProps } from 'react';
import type { MaterialIcons } from '@expo/vector-icons';

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

export const CATEGORY_ICONS: IconName[] = [
  'local-cafe',
  'restaurant',
  'shopping-cart',
  'directions-car',
  'home',
  'bolt',
  'favorite',
  'movie',
  'shopping-bag',
  'flight',
  'sell',
  'local-gas-station',
  'headphones',
  'menu-book',
  'card-giftcard',
  'smartphone',
  'payments',
  'spa',
];
