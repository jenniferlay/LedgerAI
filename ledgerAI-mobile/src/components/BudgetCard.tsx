import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import theme from '@/constants/theme';

interface BudgetCardProps {
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

export default function BudgetCard({
  title,
  spentAmount,
  totalAmount,
  leftAmount,
  percentage,
  iconName,
  iconColor,
  iconBgColor,
  progressColor,
}: BudgetCardProps) {
  return (
    <View style={styles.card}>
      <View>
        <View style={styles.topRow}>
          <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
            <MaterialIcons name={iconName} size={18} color={iconColor} />
          </View>
          <View style={styles.spentPill}>
            <Text style={[theme.typography.labelSm, styles.textOnSurface]}>
              {percentage}% Spent
            </Text>
          </View>
        </View>
        <Text style={[theme.typography.labelLg, styles.textOnSurface]} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.amountRow}>
          <Text style={[theme.typography.metricDisplayMobile, styles.spentAmount]}>
            {spentAmount}
          </Text>
          <Text style={[theme.typography.bodySm, styles.textOnSurfaceVariant]}>
            / {totalAmount}
          </Text>
        </View>
      </View>

      <View style={styles.progressSection}>
        <View style={styles.progressLabelRow}>
          <Text style={[theme.typography.labelSm, styles.textOnSurfaceVariant]}>
            {leftAmount} left
          </Text>
          <Text style={[theme.typography.labelSm, { color: progressColor }]}>
            {percentage}%
          </Text>
        </View>
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              { backgroundColor: progressColor, width: `${percentage}%` },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 245,
    backgroundColor: theme.colors.surfaceContainer,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.md,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spentPill: {
    backgroundColor: theme.colors.surfaceContainerHigh,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 4,
  },
  spentAmount: {
    fontSize: 20,
    lineHeight: 24,
    color: theme.colors.onSurface,
  },
  progressSection: {
    marginTop: 16,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressBarBg: {
    width: '100%',
    height: 8,
    backgroundColor: theme.colors.surfaceContainerHighest,
    borderRadius: theme.borderRadius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: theme.borderRadius.full,
  },
  textOnSurface: { color: theme.colors.onSurface },
  textOnSurfaceVariant: { color: theme.colors.onSurfaceVariant },
});
