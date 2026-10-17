import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';
import UpdateExpenseScreen from '@/components/expenses/update-expense/updateExpenseScreen';
import { deleteExpense } from '@/services/expenses-api';

export default function EditExpenseRoute() {
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

  // An edit route is meaningless without these.
  if (!editSource || editId === undefined || Number.isNaN(editId)) {
    return null;
  }

  const handleDelete = () => {
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

  return (
    <UpdateExpenseScreen
      onCancel={() => router.back()}
      onDone={() => router.back()}
      onDelete={handleDelete}
      isDeleting={isDeleting}
      initialValues={{
        source: editSource,
        itemId: editId,
        amount: params.amount ?? '',
        merchant: params.merchant ?? '',
        note: params.note ?? '',
        spentOn: params.spentOn,
        categoryId: params.categoryId ? Number(params.categoryId) : null,
      }}
    />
  );
}