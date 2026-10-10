import React, { useState } from 'react';
import { Button, Platform, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import theme from '@/constants/theme';
import { useAuth } from '@/context/auth';
import PrimaryActionButton from '@/components/shared/PrimaryActionButton';
import { create, open, type LinkExit } from 'react-native-plaid-link-sdk';
import { createLinkToken } from '@/services/plaid-api';

export default function AppHomeScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [isConnectingBank, setIsConnectingBank] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkMessage, setLinkMessage] = useState<string | null>(null);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Failed to sign out', error);
    }
  };

  const handlePlaidSuccess = (publicToken: string) => {
    // TODO: Exchange this token with the backend when /exchange is available. Do not persist it.
    void publicToken;
    setLinkMessage('Bank connection completed.');
    setLinkError(null);
  };

  const handlePlaidExit = (exit: LinkExit) => {
    if (exit.error) {
      setLinkError(exit.error.displayMessage || exit.error.errorMessage || 'Plaid Link could not finish.');
      setLinkMessage(null);
    }
  };

  const handleConnectBank = async () => {
    setIsConnectingBank(true);
    setLinkError(null);
    setLinkMessage(null);

    try {
      const { link_token } = await createLinkToken();
      create({ token: link_token });
      await open({
        onSuccess: (success) => handlePlaidSuccess(success.publicToken),
        onExit: handlePlaidExit,
      });
    } catch (error) {
      setLinkError(error instanceof Error ? error.message : 'Could not connect to Plaid. Please try again.');
    } finally {
      setIsConnectingBank(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Authenticated Home</Text>
      {Platform.OS !== 'web' && (
        <PrimaryActionButton
          label="Connect bank"
          accessibilityLabel="Connect bank"
          icon="account-balance"
          isLoading={isConnectingBank}
          onPress={() => void handleConnectBank()}
        />
      )}
      {linkError && <Text style={styles.errorMessage} accessibilityRole="alert">{linkError}</Text>}
      {linkMessage && <Text style={styles.successMessage} accessibilityRole="alert">{linkMessage}</Text>}
      <Button
        title="Add Expense"
        onPress={() => router.push('/(app)/add-expense')}
      />
      <Button
        title="Add Category"
        onPress={() => router.push('/(app)/add-category')}
      />
      <Button
        title="Simulate Logout"
        onPress={() => void handleSignOut()}
      />
    </View>
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
  errorMessage: {
    ...theme.typography.bodySm,
    color: theme.colors.error,
  },
  successMessage: {
    ...theme.typography.bodySm,
    color: theme.colors.primary,
  },
});
