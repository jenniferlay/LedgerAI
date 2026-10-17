import React, { useState } from 'react';
import { Button, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import theme from '@/constants/theme';
import { useAuth } from '@/context/auth';
import PrimaryActionButton from '@/components/shared/PrimaryActionButton';
import type { LinkExit } from 'react-native-plaid-link-sdk';
import { createLinkToken, exchangePublicToken } from '@/services/plaid-api';
import RecentActivity from '@/components/RecentActivity';
import NetWorthCard from '@/components/NetWorthCard';
import BudgetCard from '@/components/BudgetCard';

interface Budget {
  id: string;
  title: string;
  spentAmount: string;
  totalAmount: string;
  leftAmount: string;
  percentage: number;
  iconName: keyof typeof MaterialIcons.glyphMap;
  iconColor: string;
  iconBgColor: string;
  progressColor: string;
}

export default function AppHomeScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [isConnectingBank, setIsConnectingBank] = useState(false);
  const [isExchangingBank, setIsExchangingBank] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkMessage, setLinkMessage] = useState<string | null>(null);

  const [budgets, setBudgets] = useState<Budget[]>([
    {
      id: '1',
      title: 'Food & Dining',
      spentAmount: '$450',
      totalAmount: '$600',
      leftAmount: '$150',
      percentage: 75,
      iconName: 'restaurant',
      iconColor: theme.colors.error,
      iconBgColor: 'rgba(255, 180, 171, 0.15)',
      progressColor: theme.colors.error,
    },
    {
      id: '2',
      title: 'Shopping',
      spentAmount: '$320',
      totalAmount: '$400',
      leftAmount: '$80',
      percentage: 80,
      iconName: 'shopping-bag',
      iconColor: theme.colors.primary,
      iconBgColor: 'rgba(78, 222, 163, 0.15)',
      progressColor: theme.colors.primary,
    },
    {
      id: '3',
      title: 'Transport',
      spentAmount: '$180',
      totalAmount: '$300',
      leftAmount: '$120',
      percentage: 60,
      iconName: 'directions-car',
      iconColor: theme.colors.secondary,
      iconBgColor: 'rgba(149, 211, 186, 0.15)',
      progressColor: theme.colors.secondary,
    },
    {
      id: '4',
      title: 'Entertainment',
      spentAmount: '$90',
      totalAmount: '$150',
      leftAmount: '$60',
      percentage: 60,
      iconName: 'local-movies',
      iconColor: theme.colors.tertiary,
      iconBgColor: 'rgba(69, 223, 164, 0.15)',
      progressColor: theme.colors.tertiary,
    },
  ]);

  const handleAddBudget = () => {
    // Example handler for adding a budget
    const newBudget: Budget = {
      id: Date.now().toString(),
      title: 'New Budget',
      spentAmount: '$0',
      totalAmount: '$200',
      leftAmount: '$200',
      percentage: 0,
      iconName: 'flight',
      iconColor: theme.colors.primary,
      iconBgColor: 'rgba(78, 222, 163, 0.15)',
      progressColor: theme.colors.primary,
    };
    setBudgets((prev) => [...prev, newBudget]);
  };

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
      <NetWorthCard amount={10000} name="John Doe" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.budgetRow}>
        {budgets.map((budget) => (
          <BudgetCard
            key={budget.id}
            title={budget.title}
            spentAmount={budget.spentAmount}
            totalAmount={budget.totalAmount}
            leftAmount={budget.leftAmount}
            percentage={budget.percentage}
            iconName={budget.iconName}
            iconColor={budget.iconColor}
            iconBgColor={budget.iconBgColor}
            progressColor={budget.progressColor}
          />
        ))}
      </ScrollView>
      <Pressable
        onPress={handleAddBudget}
        style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
      >
        <MaterialIcons name="add-circle" size={20} color={theme.colors.primary} />
        <Text style={styles.addButtonText}>Add New Budget</Text>
      </Pressable>
      <RecentActivity />
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
  budgetRow: {
    gap: theme.spacing.md,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: 12,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    width: '100%',
  },
  addButtonPressed: {
    opacity: 0.7,
  },
  addButtonText: {
    ...theme.typography.labelLg,
    color: theme.colors.primary,
  },
});
