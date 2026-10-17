import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import theme from '@/constants/theme';
import ProgressBar from '@/components/categories/budgetPage/progressBar';
import { formatMoney, percent } from '@/components/categories/budgetPage/format';

type Props = { spent: number; limit: number; daysRemaining: number };

export default function SummaryCard({ spent, limit, daysRemaining }: Props) {
  const pct = percent(spent, limit);
  const pctLabel = (Math.floor(pct * 10) / 10).toFixed(1);

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.amountRow}>
          <Text style={styles.spent}>{formatMoney(spent)}</Text>
          <Text style={styles.limit}>/ {formatMoney(limit)}</Text>
        </View>
        <Text style={styles.left}>{formatMoney(limit - spent)} left</Text>
      </View>

      <View style={{ marginBottom: 10 }}>
        <ProgressBar value={pct} height={6} />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>{pctLabel}% consumed</Text>
        <Text style={styles.footerText}>{daysRemaining} days remaining</Text>
      </View>
    </View>
  );
}

const { colors, spacing, borderRadius, typography } = theme;

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  topRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  spent: { ...typography.metricDisplayMobile, color: colors.onSurface },
  limit: { ...typography.bodyMd, color: colors.outline },
  left: { ...typography.labelLg, color: colors.primary },
  footer: { flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { ...typography.labelSm, color: colors.outline },
});