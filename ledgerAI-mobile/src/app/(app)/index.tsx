import React from 'react';
import { Button, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import theme from '../../constants/theme';
import { useAuth } from '../../context/auth';
import { ThemedText } from '../../components/themed-text';
import RecentActivity from '../../components/RecentActivity';

export default function AppHomeScreen() {
  const router = useRouter();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Failed to sign out', error);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="subtitle" style={styles.title}>Overview</ThemedText>
      <View style={styles.actions}>
        <Button
          title="Add Category"
          onPress={() => router.push('/(app)/add-category')}
        />
        <Button
          title="Simulate Logout"
          onPress={() => void handleSignOut()}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    gap: theme.spacing.lg,
    padding: theme.spacing.margin,
    paddingTop: theme.spacing.marginTop,
    backgroundColor: theme.colors.surface,
  },
  title: {
    color: theme.colors.onSurface,
  },
  actions: {
    gap: theme.spacing.sm,
  },
});
