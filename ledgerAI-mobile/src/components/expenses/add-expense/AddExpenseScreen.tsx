import React, { useState } from 'react';
import { Alert } from 'react-native';
import { spacing } from '@/constants/theme';
import AddFormLayout from '@/components/shared/AddFormLayout';
import PrimaryActionButton from '@/components/shared/PrimaryActionButton';
import AmountField from './AmountField';
import MerchantField from './MerchantField';
import NoteField from './NoteField';
import DateField from './DateField';
import CategorySelectField from './CategorySelectField';
import {
  getTodayIsoDate,
  validateAmount,
  validateExpenseForm,
  validateMerchant,
  validateNote,
  validateSpentOn,
} from './validation';
import type {
  ExpenseFormErrors,
  ExpenseFormValues,
  ExpensePayload,
} from './types';

interface Props {
  onCancel?: () => void;
  onDone?: (expense: ExpensePayload) => void;
}

export default function AddExpenseScreen({ onCancel, onDone }: Props) {
  const [values, setValues] = useState<ExpenseFormValues>({
    amount: '',
    merchant: '',
    note: '',
    spentOn: getTodayIsoDate(),
    categoryId: 1,
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
      if (onDone) {
        onDone(result.payload);
      } else {
        const formattedAmount = `$${result.payload.amount_dollars}.${String(
          result.payload.amount_cents,
        ).padStart(2, '0')}`;
        Alert.alert(
          'Expense Validated',
          `Successfully validated expense of ${formattedAmount} for "${result.payload.note}". Ready to send to API.`,
          [{ text: 'OK', onPress: onCancel }],
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AddFormLayout
      title="Log Expense"
      actionLabel="Save"
      actionAccessibilityLabel="Save Expense"
      onCancel={onCancel}
      onDone={handleSave}
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
        label="Save Expense"
        accessibilityLabel="Save Expense"
        icon="check"
        iconPosition="before"
        onPress={handleSave}
        isLoading={isSubmitting}
      />
    </AddFormLayout>
  );
}
