import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import theme from '../../constants/theme';

export default function AppHomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Authenticated Home</Text>
      <Button
        title="Add Category"
        onPress={() => router.push('/(app)/add-category')}
      />
      <Button
        title="Simulate Logout"
        onPress={() => {
          router.replace('/(auth)/login');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.margin,
    backgroundColor: theme.colors.surface,
  },
  title: {
    ...theme.typography.headlineSm,
    color: theme.colors.onSurface,
    marginBottom: theme.spacing.sm,
  },
});
