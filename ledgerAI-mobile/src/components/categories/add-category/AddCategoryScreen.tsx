import React, { useState } from 'react';
import { Alert } from 'react-native';
import AddFormLayout from '@/components/shared/AddFormLayout';
import PrimaryActionButton from '@/components/shared/PrimaryActionButton';
import { CategoryBudgetField, CategoryNameField, IconPreview } from './CategoryFields';
import { ParentCategoryDropdown } from './ParentCategoryDropdown';
import IconGrid from './IconGrid';
import type { IconName } from './data';
import { createCategory } from '@/services/categories-api';
import { createBudget } from '@/services/budgets-api';

export interface CategoryDraft {
  name: string;
  icon: IconName;
  parentCategoryId: number | null;
  monthlyBudget?: number | null;
}

interface Props {
  onCancel?: () => void;
  onDone?: (category: CategoryDraft) => void;
}

export default function AddCategoryScreen({ onCancel, onDone }: Props) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<IconName>('local-cafe');
  const [parentCategoryId, setParentCategoryId] = useState<number | null>(null);
  const [monthlyBudget, setMonthlyBudget] = useState('');
  const [budgetError, setBudgetError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleBudgetChange = (text: string) => {
    setMonthlyBudget(text);
    if (budgetError) {
      setBudgetError(undefined);
    }
  };

  const handleDone = async () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      Alert.alert('Category name required', 'Enter a name before creating a category.');
      return;
    }

    let parsedBudget: number | null = null;
    if (monthlyBudget.trim().length > 0) {
      const cleaned = monthlyBudget.replace(/[^0-9.]/g, '');
      const num = parseFloat(cleaned);
      if (isNaN(num) || num <= 0) {
        setBudgetError('Please enter a valid amount greater than 0');
        Alert.alert('Invalid Budget', 'Please enter a valid positive number for the monthly budget.');
        return;
      }
      parsedBudget = Math.round(num * 100) / 100;
    }

    setIsSubmitting(true);
    try {
      const created = await createCategory({
        name: trimmedName,
        icon,
        parent_categoryid: parentCategoryId,
      });

      let budgetCreatedSuccessfully = false;
      let budgetErrorMessage: string | null = null;

      if (parsedBudget !== null && parsedBudget > 0) {
        try {
          await createBudget({
            categoryid: created.categoryid,
            amount: parsedBudget,
          });
          budgetCreatedSuccessfully = true;
        } catch (bErr) {
          budgetErrorMessage = bErr instanceof Error ? bErr.message : 'Unknown error';
        }
      }

      const categoryDraft: CategoryDraft = {
        name: created.name,
        icon: (created.icon as IconName) ?? icon,
        parentCategoryId: created.parent_categoryid,
        monthlyBudget: budgetCreatedSuccessfully ? parsedBudget : null,
      };

      if (budgetErrorMessage) {
        Alert.alert(
          'Category Created (Budget Notice)',
          'Category "' + created.name + '" was created, but setting the budget failed: ' + budgetErrorMessage,
          [{ text: 'OK', onPress: () => onDone ? onDone(categoryDraft) : onCancel?.() }],
        );
      } else if (onDone) {
        onDone(categoryDraft);
      } else {
        const successMsg = budgetCreatedSuccessfully
          ? 'Successfully created category "' + created.name + '" with a $' + parsedBudget?.toFixed(2) + ' monthly budget.'
          : 'Successfully created category "' + created.name + '".';
        Alert.alert('Category Created', successMsg, [{ text: 'OK', onPress: onCancel }]);
      }
    } catch (error) {
      Alert.alert(
        'Unable to Create Category',
        error instanceof Error ? error.message : 'An unexpected error occurred.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AddFormLayout
      title="Add Category"
      onCancel={onCancel}
    >
      <IconPreview icon={icon} />
      <CategoryNameField value={name} onChangeText={setName} />
      <CategoryBudgetField
        value={monthlyBudget}
        onChangeText={handleBudgetChange}
        error={budgetError}
      />
      <ParentCategoryDropdown selectedParentId={parentCategoryId} onSelect={setParentCategoryId} />
      <IconGrid selected={icon} onSelect={setIcon} />
      <PrimaryActionButton
        label="Create Category"
        accessibilityLabel="Create Category"
        icon="arrow-forward"
        onPress={handleDone}
        isLoading={isSubmitting}
      />
    </AddFormLayout>
  );
}
