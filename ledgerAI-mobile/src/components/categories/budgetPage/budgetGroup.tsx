import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import theme from '@/constants/theme';
import ProgressBar from '@/components/categories/budgetPage/progressBar';
import { BudgetGroupData } from '@/components/categories/budgetPage/budgets';
import { formatMoney, percent } from '@/components/categories/budgetPage/format';

export default function BudgetGroup({ group }: { group: BudgetGroupData }) {
  const [expanded, setExpanded] = useState(true);

  // Parent totals are derived from nested budgets
  const spent = group.children.reduce((s, c) => s + c.spent, 0);
  const limit = group.children.reduce((s, c) => s + c.limit, 0);

  return (
    <View style={styles.card}>
      {/* Parent row */}
      <Pressable style={styles.parent} onPress={() => setExpanded((e) => !e)}>
        <View style={styles.parentTop}>
          <View style={styles.titleWrap}>
            <View style={styles.iconBox}>
              <MaterialIcons name={group.icon} size={20} color={colors.primary} />
            </View>
            <Text style={styles.title} numberOfLines={1}>{group.name}</Text>
          </View>

          <View style={styles.rightWrap}>
            <View style={styles.amountRow}>
              <Text style={styles.parentSpent}>{formatMoney(spent)}</Text>
              <Text style={styles.muted}>/ {formatMoney(limit)}</Text>
            </View>
            <MaterialIcons
              name="expand-more"
              size={20}
              color={colors.outline}
              style={{ transform: [{ rotate: expanded ? '0deg' : '-90deg' }] }}
            />
          </View>
        </View>
        <ProgressBar value={percent(spent, limit)} />
      </Pressable>

      {/* Nested subcategories */}
      {expanded && (
        <View style={styles.children}>
          <View style={styles.line} />
          {group.children.map((c) => (
            <View key={c.id} style={styles.child}>
              <View style={styles.childTop}>
                <Text style={styles.childName}>{c.name}</Text>
                <View style={styles.amountRow}>
                  <Text style={styles.childSpent}>{formatMoney(c.spent)}</Text>
                  <Text style={styles.muted}>/ {formatMoney(c.limit)}</Text>
                </View>
              </View>
              <ProgressBar value={percent(c.spent, c.limit)} color={colors[c.barColor ?? 'primary']} />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const { colors, spacing, borderRadius, typography } = theme;

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surfaceContainerLow, borderRadius: borderRadius.xl, overflow: 'hidden' },
  parent: { padding: spacing.md },
  parentTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  titleWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1, minWidth: 0 },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...typography.headlineSm, color: colors.onSurface, flexShrink: 1 },
  rightWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 0 },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  parentSpent: { ...typography.labelLg, color: colors.onSurface },
  muted: { ...typography.bodySm, color: colors.outline },

  children: { paddingLeft: 44, paddingRight: spacing.md, paddingBottom: spacing.md, gap: 12 },
  line: {
    position: 'absolute',
    left: 28,
    top: 0,
    bottom: 16,
    width: 1,
    backgroundColor: colors.surfaceContainerHighest,
  },
  child: { gap: 6 },
  childTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  childName: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  childSpent: { ...typography.labelMd, color: colors.onSurface },
});