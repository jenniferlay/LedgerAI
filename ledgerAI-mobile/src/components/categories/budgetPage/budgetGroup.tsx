import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import theme from '@/constants/theme';
import ProgressBar from '@/components/categories/budgetPage/progressBar';
import { BudgetGroupData } from '@/services/budgets-api';
import { formatMoney, percent } from '@/components/categories/budgetPage/format';

export interface BudgetEditItem {
  budgetid: number;
  categoryid: number;
  name: string;
  amount: number;
  icon?: string | null;
}

export interface BudgetAddItem {
  categoryid: number;
  name: string;
  icon?: string | null;
}

interface Props {
  group: BudgetGroupData;
  onEditBudget?: (budget: BudgetEditItem) => void;
  onAddBudget?: (item: BudgetAddItem) => void;
}

export default function BudgetGroup({ group, onEditBudget, onAddBudget }: Props) {
  const [expanded, setExpanded] = useState(true);

  const spent = group.spent;
  const limit = group.limit;

  const iconName = (group.icon && group.icon in MaterialIcons.glyphMap
    ? group.icon
    : 'folder') as keyof typeof MaterialIcons.glyphMap;

  return (
    <View style={styles.card}>
      {/* Parent row */}
      <Pressable style={styles.parent} onPress={() => setExpanded((e) => !e)}>
        <View style={styles.parentTop}>
          <View style={styles.titleWrap}>
            <View style={styles.iconBox}>
              <MaterialIcons name={iconName} size={20} color={colors.primary} />
            </View>
            <Text style={styles.title} numberOfLines={1}>{group.name}</Text>
          </View>

          <View style={styles.rightWrap}>
            <View style={styles.amountRow}>
              <Text style={styles.parentSpent}>{formatMoney(spent)}</Text>
              <Text style={styles.muted}>/ {formatMoney(limit)}</Text>
            </View>

            {group.budgetid !== null && onEditBudget ? (
              <Pressable
                accessibilityLabel="Edit category budget"
                accessibilityRole="button"
                hitSlop={8}
                onPress={(e) => {
                  e.stopPropagation();
                  onEditBudget({
                    budgetid: group.budgetid!,
                    categoryid: group.id,
                    name: group.name,
                    amount: group.limit,
                    icon: group.icon,
                  });
                }}
                style={({ pressed }) => [styles.editIconBtn, pressed && { opacity: 0.6 }]}
              >
                <MaterialIcons name="edit" size={16} color={colors.outline} />
              </Pressable>
            ) : group.budgetid === null && onAddBudget ? (
              <Pressable
                accessibilityLabel="Set budget for this group"
                accessibilityRole="button"
                hitSlop={8}
                onPress={(e) => {
                  e.stopPropagation();
                  onAddBudget({
                    categoryid: group.id,
                    name: group.name,
                    icon: group.icon,
                  });
                }}
                style={({ pressed }) => [styles.editIconBtn, pressed && { opacity: 0.6 }]}
              >
                <MaterialIcons name="add" size={18} color={colors.primary} />
              </Pressable>
            ) : null}

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
      {expanded && group.children.length > 0 && (
        <View style={styles.children}>
          <View style={styles.line} />
          {group.children.map((c) => (
            <Pressable
              key={c.id}
              style={({ pressed }) => [styles.child, pressed && { opacity: 0.7 }]}
              onPress={() => {
                onEditBudget?.({
                  budgetid: c.budgetid,
                  categoryid: c.id,
                  name: c.name,
                  amount: c.limit,
                  icon: c.icon,
                });
              }}
            >
              <View style={styles.childTop}>
                <View style={styles.childNameRow}>
                  <Text style={styles.childName}>{c.name}</Text>
                  <MaterialIcons
                    name="edit"
                    size={13}
                    color={colors.outline}
                    style={{ marginLeft: 5 }}
                  />
                </View>
                <View style={styles.amountRow}>
                  <Text style={styles.childSpent}>{formatMoney(c.spent)}</Text>
                  <Text style={styles.muted}>/ {formatMoney(c.limit)}</Text>
                </View>
              </View>
              <ProgressBar value={percent(c.spent, c.limit)} color={colors.primary} />
            </Pressable>
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

  editIconBtn: {
    padding: 4,
    marginRight: 2,
  },

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
  childNameRow: { flexDirection: 'row', alignItems: 'center' },
  childName: { ...typography.bodyMd, color: colors.onSurface },
  childSpent: { ...typography.labelMd, color: colors.onSurface },
});
