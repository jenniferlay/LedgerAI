import { Stack } from 'expo-router';

export default function BudgetsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="add-category" />
    </Stack>
  );
}
