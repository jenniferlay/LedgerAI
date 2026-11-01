import React, { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { spacing } from '@/constants/theme';
import { createExpense } from '@/services/expenses-api';
import AddFormLayout from '@/components/shared/AddFormLayout';
import PrimaryActionButton from '@/components/shared/PrimaryActionButton';
import {
  AmountField,
  CategorySelectField,
  DateField,
  ExpenseTypeToggle,
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
  /**
   * Called when the user dismisses the screen (modal / pushed route).
   * When undefined the header button acts as "Clear" instead of "Cancel".
   */
  onCancel?: () => void;
  onDone?: (expense: ExpensePayload) => void;
}

const INITIAL_VALUES: ExpenseFormValues = {
  type: 'expense',
  amount: '',
  merchant: '',
  note: '',
  spentOn: getTodayIsoDate(),
  categoryId: null,
};

export default function AddExpenseScreen({
  onCancel,
  onDone,
}: Props) {
  const [values, setValues] = useState<ExpenseFormValues>({ ...INITIAL_VALUES });
  const [errors, setErrors] = useState<ExpenseFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = useCallback(() => {
    setValues({ ...INITIAL_VALUES, spentOn: getTodayIsoDate() });
    setErrors({});
  }, []);

  const setFieldValue = <K extends keyof ExpenseFormValues>(
    field: K,
    val: ExpenseFormValues[K],
  ) => {
    setValues((prev) => ({ ...prev, [field]: val }));
    if (errors[field as keyof ExpenseFormErrors]) {
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
      await createExpense(result.payload);
      if (onDone) {
        onDone(result.payload);
      } else {
        const formattedAmount = '$' + Math.abs(result.payload.amount).toFixed(2);
        Alert.alert(
          'Expense Saved',
          'Successfully saved expense of ' + formattedAmount + ' for "' + result.payload.note + '".',
          [{ text: 'OK', onPress: resetForm }],
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

  // When no onCancel is provided this is a tab — show "Clear" instead of "Cancel"
  const isTab = !onCancel;

  return (
    <AddFormLayout
      title={values.type === 'income' ? 'Log Income' : 'Log Expense'}
      onCancel={isTab ? resetForm : onCancel}
      cancelLabel={isTab ? 'Clear' : undefined}
      cancelIcon={isTab ? 'refresh' : undefined}
      contentTopSpacing={spacing.sm}
    >
      <ExpenseTypeToggle
        value={values.type}
        onChange={(type) => setFieldValue('type', type)}
      />

      <AmountField
        value={values.amount}
        type={values.type}
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
        label={values.type === 'income' ? 'Save Income' : 'Save Expense'}
        accessibilityLabel={values.type === 'income' ? 'Save Income' : 'Save Expense'}
        icon="check"
        iconPosition="before"
        onPress={handleSave}
        isLoading={isSubmitting}
      />
    </AddFormLayout>
  );
}
