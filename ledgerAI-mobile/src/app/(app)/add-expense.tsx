import { router } from 'expo-router';
import AddExpenseScreen from '../../components/expenses/add-expense';

export default function AddExpenseRoute() {
  return (
    <AddExpenseScreen
      onCancel={() => router.back()}
      onDone={() => {
        router.back();
      }}
    />
  );
}
