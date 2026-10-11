import React, { useState } from 'react';
import { Button, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import theme from '@/constants/theme';
import { useAuth } from '@/context/auth';
import PrimaryActionButton from '@/components/shared/PrimaryActionButton';
import type { LinkExit } from 'react-native-plaid-link-sdk';
import { createLinkToken, exchangePublicToken } from '@/services/plaid-api';
import RecentActivity from '@/components/RecentActivity';

export default function AppHomeScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [isConnectingBank, setIsConnectingBank] = useState(false);
  const [isExchangingBank, setIsExchangingBank] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkMessage, setLinkMessage] = useState<string | null>(null);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Failed to sign out', error);
    }
  };

  const handlePlaidSuccess = async (publicToken: string) => {
    setIsExchangingBank(true);
    try {
      await exchangePublicToken(publicToken);
      setLinkMessage('Bank connection completed.');
      setLinkError(null);
    } catch (error) {
      setLinkError(error instanceof Error ? error.message : 'Could not connect to Plaid. Please try again.');
      setLinkMessage(null);
    } finally {
      setIsExchangingBank(false);
    }
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
      const { createPlaidLinkSession } = await import('react-native-plaid-link-sdk');
      const { link_token } = await createLinkToken();
      const session = await createPlaidLinkSession({
        token: link_token,
        onSuccess: (success) => void handlePlaidSuccess(success.publicToken),
        onExit: handlePlaidExit,
        onEvent: (event) => console.info('Plaid Link event', event.eventName),
      });
      await session.open();
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      setLinkError(
        message.includes('ReactNativePlaidLinkSdk')
          ? 'Plaid Link requires a native development build. Expo Go does not include the Plaid SDK; rebuild and launch the app with `npx expo run:android` or `npx expo run:ios`.'
          : message || 'Could not connect to Plaid. Please try again.',
      );
    } finally {
      setIsConnectingBank(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Authenticated Home</Text>
      {Platform.OS !== 'web' && (
        <PrimaryActionButton
          label="Connect bank"
          accessibilityLabel="Connect bank"
          icon="account-balance"
          isLoading={isConnectingBank || isExchangingBank}
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
      <RecentActivity />
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
  errorMessage: {
    ...theme.typography.bodySm,
    color: theme.colors.error,
  },
  successMessage: {
    ...theme.typography.bodySm,
    color: theme.colors.primary,
  },
});
