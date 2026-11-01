import type { ComponentProps } from 'react';
import type { MaterialIcons } from '@expo/vector-icons';

export type IconName = ComponentProps<typeof MaterialIcons>['name'];

export type TransactionType = 'expense' | 'income';

export interface ExpenseCategoryOption {
  id: number;
  name: string;
  icon: IconName;
  parentId?: number | null;
  parentName?: string | null;
  isCustom?: boolean;
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
  amount: number;
  merchant: string | null;
  note: string;
  spent_on: string;
  categoryid: number | null;
}
