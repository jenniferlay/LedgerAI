import React, { useState } from 'react';
import { Alert } from 'react-native';
import { spacing } from '@/constants/theme';
import { updateExpense } from '@/services/expenses-api';
import AddFormLayout from '@/components/shared/AddFormLayout';
import PrimaryActionButton from '@/components/shared/PrimaryActionButton';
import {
  AmountField,
  CategorySelectField,
  DateField,
  MerchantField,
  NoteField,
} from '../fields';
import {
  getTodayIsoDate,
  validateAmount,
  validateExpenseForm,
  validateMerchant,
  validateNote,
  validateSpentOn,
} from '../validation';
import type {
  ExpenseFormErrors,
  ExpenseFormValues,
  ExpensePayload,
} from '../types';

interface Props {
  onCancel?: () => void;
  onDone?: (expense: ExpensePayload) => void;
  onDelete?: () => void;
  initialValues: {
    source: string;
    itemId: number;
    amount?: string;
    merchant?: string;
    note?: string;
    spentOn?: string;
    categoryId?: number | null;
  };
  isDeleting?: boolean;
}

export default function UpdateExpenseScreen({
  onCancel,
  onDone,
  onDelete,
  initialValues,
  isDeleting,
}: Props) {
  const [values, setValues] = useState<ExpenseFormValues>({
    amount: initialValues.amount ?? '',
    merchant: initialValues.merchant ?? '',
    note: initialValues.note ?? '',
    spentOn: initialValues.spentOn ?? getTodayIsoDate(),
    categoryId: initialValues.categoryId ?? 1,
  });
  const [errors, setErrors] = useState<ExpenseFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setFieldValue = <K extends keyof ExpenseFormValues>(
    field: K,
    val: ExpenseFormValues[K],
  ) => {
    setValues((prev) => ({ ...prev, [field]: val }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleBlurField = (field: keyof ExpenseFormValues) => {
    let err: string | undefined;
    if (field === 'amount') err = validateAmount(values.amount);
    if (field === 'note') err = validateNote(values.note);
    if (field === 'merchant') err = validateMerchant(values.merchant);
    if (field === 'spentOn') err = validateSpentOn(values.spentOn);

    if (err) {
      setErrors((prev) => ({ ...prev, [field]: err }));
    }
  };

  const handleSave = async () => {
    const result = validateExpenseForm(values);

    if (!result.isValid || !result.payload) {
      setErrors(result.errors);
      Alert.alert(
        'Incomplete Expense',
        'Please correct the highlighted fields before saving.',
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await updateExpense(initialValues.source, initialValues.itemId, result.payload);
      if (onDone) {
        onDone(result.payload);
      } else {
        const formattedAmount = `$${result.payload.amount_dollars}.${String(
          result.payload.amount_cents,
        ).padStart(2, '0')}`;
        Alert.alert(
          'Expense Saved',
          `Successfully saved expense of ${formattedAmount} for "${result.payload.note}".`,
          [{ text: 'OK', onPress: onCancel }],
        );
      }
    } catch (error) {
      Alert.alert(
        'Unable to Save Expense',
        error instanceof Error ? error.message : 'An unexpected error occurred.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AddFormLayout
      title="Edit Expense"
      onCancel={onCancel}
      onDelete={onDelete}
      isDeleting={isDeleting}
      contentTopSpacing={spacing.sm}
    >
      <AmountField
        value={values.amount}
        error={errors.amount}
        onChangeText={(text) => setFieldValue('amount', text)}
        onBlur={() => handleBlurField('amount')}
      />

      <MerchantField
        value={values.merchant}
        error={errors.merchant}
        onChangeText={(text) => setFieldValue('merchant', text)}
        onBlur={() => handleBlurField('merchant')}
      />

      <NoteField
        value={values.note}
        error={errors.note}
        onChangeText={(text) => setFieldValue('note', text)}
        onBlur={() => handleBlurField('note')}
      />

      <DateField
        value={values.spentOn}
        error={errors.spentOn}
        onChangeText={(text) => setFieldValue('spentOn', text)}
        onBlur={() => handleBlurField('spentOn')}
      />

      <CategorySelectField
        selectedId={values.categoryId}
        onSelect={(id) => setFieldValue('categoryId', id)}
      />

      <PrimaryActionButton
        label="Update Expense"
        accessibilityLabel="Update Expense"
        icon="check"
        iconPosition="before"
        onPress={handleSave}
        isLoading={isSubmitting}
      />
    </AddFormLayout>
  );
}