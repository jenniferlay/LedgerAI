import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import theme from '@/constants/theme';
import type { TransactionType } from '../types';

const { colors, borderRadius, typography, spacing } = theme;

interface Props {
  value: TransactionType;
  onChange: (type: TransactionType) => void;
}

export default function ExpenseTypeToggle({ value, onChange }: Props) {
  const isExpense = value === 'expense';
  const isIncome = value === 'income';

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>Transaction Type</Text>
      <View style={styles.container}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: isExpense }}
          accessibilityLabel="Select expense"
          style={[styles.button, isExpense && styles.expenseActive]}
          onPress={() => onChange('expense')}
        >
          <Text style={[styles.text, isExpense && styles.activeExpenseText]}>
            Expense
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: isIncome }}
          accessibilityLabel="Select income"
          style={[styles.button, isIncome && styles.incomeActive]}
          onPress={() => onChange('income')}
        >
          <Text style={[styles.text, isIncome && styles.activeIncomeText]}>
            Income
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  label: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  container: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.xl,
    padding: spacing.xs,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.lg,
  },
  expenseActive: {
    backgroundColor: colors.surfaceContainerHigh,
    borderColor: colors.outlineVariant,
    borderWidth: 1,
  },
  incomeActive: {
    backgroundColor: colors.secondaryContainer,
    borderColor: colors.primary,
    borderWidth: 1,
  },
  text: {
    ...typography.labelLg,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
  activeExpenseText: {
    color: colors.onSurface,
  },
  activeIncomeText: {
    color: colors.primary,
  },
});
