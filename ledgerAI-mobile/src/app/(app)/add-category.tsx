import { router } from 'expo-router';
import AddCategoryScreen from '../../components/categories/add-category/AddCategoryScreen';

export default function AddCategoryRoute() {
  return <AddCategoryScreen onCancel={() => router.back()} />;
}
