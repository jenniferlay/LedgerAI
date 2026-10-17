import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import theme from '@/constants/theme';
import SummaryCard from '@/components/categories/budgetPage/summaryCard';
import BudgetGroup from '@/components/categories/budgetPage/budgetGroup';
import { budgetGroups, daysRemaining } from '@/components/categories/budgetPage/budgets';

export default function BudgetsScreen() {
  const insets = useSafeAreaInsets();

  const all = budgetGroups.flatMap((g) => g.children);
  const totalSpent = all.reduce((s, c) => s + c.spent, 0);
  const totalLimit = all.reduce((s, c) => s + c.limit, 0);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.lg,
        paddingBottom: 96,
        paddingHorizontal: spacing.margin,
        gap: spacing.md,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ paddingTop: 4 }}>
        <Text style={styles.heading}>Budgets</Text>
      </View>

      <SummaryCard spent={totalSpent} limit={totalLimit} daysRemaining={daysRemaining} />

      <View style={styles.groups}>
        {budgetGroups.map((g) => (
          <BudgetGroup key={g.id} group={g} />
        ))}
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
  );
}

const { colors, spacing, borderRadius, typography } = theme;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
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
});