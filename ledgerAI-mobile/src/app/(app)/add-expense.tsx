import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';
import AddExpenseScreen from '@/components/expenses/add-expense';
import { deleteExpense } from '@/services/expenses-api';

export default function AddExpenseRoute() {
  const params = useLocalSearchParams<{
    editSource?: string;
    editId?: string;
    amount?: string;
    merchant?: string;
    note?: string;
    spentOn?: string;
    categoryId?: string;
  }>();

  const [isDeleting, setIsDeleting] = useState(false);

  const editSource = params.editSource;
  const editId = params.editId ? Number(params.editId) : undefined;

  const handleDelete = () => {
    if (!editSource || editId === undefined) return;

    Alert.alert(
      'Delete Expense',
      'Are you sure you want to delete this expense?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deleteExpense(editSource, editId);
              router.back();
            } catch (error) {
              Alert.alert(
                'Unable to Delete Expense',
                error instanceof Error ? error.message : 'An unexpected error occurred.',
              );
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ],
    );
  };

  const initialValues = editSource && editId !== undefined ? {
    source: editSource,
    itemId: editId,
    amount: params.amount ?? '',
    merchant: params.merchant ?? '',
    note: params.note ?? '',
    spentOn: params.spentOn,
    categoryId: params.categoryId ? Number(params.categoryId) : null,
  } : undefined;
  return (
    <AddExpenseScreen
      onCancel={() => router.back()}
      onDone={() => {
        router.back();
      }}
      onDelete={editSource && editId !== undefined ? handleDelete : undefined}
      isDeleting={isDeleting}
      initialValues={initialValues}
    />
  );
}
