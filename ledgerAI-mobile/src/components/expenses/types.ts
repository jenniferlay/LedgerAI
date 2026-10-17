import type { ComponentProps } from 'react';
import type { MaterialIcons } from '@expo/vector-icons';

export type IconName = ComponentProps<typeof MaterialIcons>['name'];

export type TransactionType = 'expense' | 'income';

export interface ExpenseCategoryOption {
  id: number;
  name: string;
  icon: IconName;
}

export interface ExpenseFormValues {
  type: TransactionType;
  amount: string;
  merchant: string;
  note: string;
  spentOn: string;
  categoryId: number | null;
}

export interface ExpenseFormErrors {
  amount?: string;
  merchant?: string;
  note?: string;
  spentOn?: string;
  categoryId?: string;
}

export interface ExpensePayload {
  amount_dollars: number;
  amount_cents: number;
  merchant: string | null;
  note: string;
  spent_on: string;
  categoryid: number | null;
}

export const DEFAULT_EXPENSE_CATEGORIES: ExpenseCategoryOption[] = [
  { id: 1, name: 'General', icon: 'label' },
  { id: 2, name: 'Food & Dining', icon: 'restaurant' },
  { id: 3, name: 'Groceries', icon: 'shopping-cart' },
  { id: 4, name: 'Transport', icon: 'directions-car' },
  { id: 5, name: 'Housing', icon: 'home' },
  { id: 6, name: 'Utilities', icon: 'bolt' },
  { id: 7, name: 'Health', icon: 'favorite' },
  { id: 8, name: 'Entertainment', icon: 'movie' },
  { id: 9, name: 'Shopping', icon: 'shopping-bag' },
  { id: 10, name: 'Travel', icon: 'flight' },
];
