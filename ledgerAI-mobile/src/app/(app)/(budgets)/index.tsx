import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import theme from '@/constants/theme';
import SummaryCard from '@/components/categories/budgetPage/summaryCard';
import BudgetGroup from '@/components/categories/budgetPage/budgetGroup';
import BudgetSkeleton from '@/components/categories/budgetPage/BudgetSkeleton';
import { getBudgetsSummary, BudgetSummary } from '@/services/budgets-api';

export default function BudgetsScreen() {
  const insets = useSafeAreaInsets();
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBudgets = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) {
        setLoading(true);
      }
      setError(null);
      const data = await getBudgetsSummary();
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load budgets');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBudgets(true);
  }, [fetchBudgets]);

  if (loading && !summary) {
    return <BudgetSkeleton />;
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.surfaceContainer}
          />
        }
      >
        <View style={{ paddingTop: 4 }}>
          <Text style={styles.heading}>Budgets</Text>
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <MaterialIcons name="error-outline" size={24} color={colors.error ?? '#ef4444'} />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryBtn} onPress={() => fetchBudgets()}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : null}

        <SummaryCard
          spent={summary?.total_spent ?? 0}
          limit={summary?.total_budget ?? 0}
          daysRemaining={summary?.days_remaining ?? 0}
        />

        <View style={styles.groups}>
          {summary?.groups && summary.groups.length > 0 ? (
            summary.groups.map((g) => <BudgetGroup key={g.id} group={g} />)
          ) : !loading ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="account-balance-wallet" size={48} color={colors.outline} />
              <Text style={styles.emptyText}>No budgets found</Text>
              <Text style={styles.emptySubText}>
                Create your first budget to start tracking spending.
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.btn, styles.btnSecondary, pressed && styles.pressed]}
            onPress={() => {}}
          >
            <MaterialIcons name="add" size={20} color={colors.primary} />
            <Text style={[styles.btnText, { color: colors.onSurface }]}>Add Category</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.btn, styles.btnPrimary, pressed && styles.pressed]}
            onPress={() => {}}
          >
            <MaterialIcons name="add" size={20} color={colors.onPrimaryContainer} />
            <Text style={[styles.btnText, { color: colors.onPrimaryContainer }]}>Add Budget</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const { colors, spacing, borderRadius, typography } = theme;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  container: {
    flexGrow: 1,
    gap: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: 96,
    paddingHorizontal: spacing.margin,
    backgroundColor: colors.surface,
  },
  heading: { ...typography.headlineLgMobile, color: colors.onSurface },
  groups: { gap: spacing.sm, paddingBottom: 8 },
  actions: { flexDirection: 'row', gap: spacing.sm, paddingTop: 8 },
  btn: {
    flex: 1,
    height: 48,
    borderRadius: borderRadius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  btnSecondary: {
    backgroundColor: colors.surfaceContainerHigh,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  btnPrimary: {
    backgroundColor: colors.primaryContainer,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  btnText: { ...typography.labelLg },
  pressed: { transform: [{ scale: 0.98 }] },
  errorCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    alignItems: 'center',
    gap: 8,
  },
  errorText: { ...typography.bodyMd, color: colors.onSurface, textAlign: 'center' },
  retryBtn: {
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: borderRadius.lg,
    marginTop: 4,
  },
  retryText: { ...typography.labelMd, color: colors.onPrimaryContainer },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyText: { ...typography.headlineSm, color: colors.onSurface },
  emptySubText: { ...typography.bodyMd, color: colors.outline, textAlign: 'center' },
});