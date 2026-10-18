import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import theme from '@/constants/theme';

export default function BudgetSkeleton() {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{
        paddingTop: 60,
        paddingBottom: 96,
        paddingHorizontal: spacing.margin,
        gap: spacing.md,
      }}
      showsVerticalScrollIndicator={false}
      scrollEnabled={false}
    >
      <View style={{ paddingTop: 4, marginBottom: 4 }}>
        <View style={styles.skeletonTitle} />
      </View>

      {/* Summary Card Skeleton */}
      <View style={styles.summaryCard}>
        <View style={styles.rowBetween}>
          <View style={styles.skeletonMetric} />
          <View style={styles.skeletonPill} />
        </View>
        <View style={styles.skeletonBar} />
        <View style={styles.rowBetween}>
          <View style={styles.skeletonTextSmall} />
          <View style={styles.skeletonTextSmall} />
        </View>
      </View>

      {/* Budget Group Cards Skeleton */}
      {[1, 2, 3].map((i) => (
        <View key={i} style={styles.groupCard}>
          <View style={styles.groupHeader}>
            <View style={styles.rowLeft}>
              <View style={styles.skeletonIconBox} />
              <View style={styles.skeletonGroupTitle} />
            </View>
            <View style={styles.skeletonAmount} />
          </View>
          <View style={styles.skeletonBar} />
          
          <View style={styles.childrenContainer}>
            <View style={styles.childRow}>
              <View style={styles.skeletonChildName} />
              <View style={styles.skeletonChildAmount} />
            </View>
            <View style={styles.skeletonBarSmall} />
            
            <View style={[styles.childRow, { marginTop: 8 }]}>
              <View style={styles.skeletonChildName} />
              <View style={styles.skeletonChildAmount} />
            </View>
            <View style={styles.skeletonBarSmall} />
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const { colors, spacing, borderRadius } = theme;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skeletonTitle: {
    width: 120,
    height: 32,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceContainerHighest,
  },
  summaryCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    gap: 16,
  },
  groupCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    gap: 12,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  skeletonMetric: {
    width: 140,
    height: 28,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceContainerHighest,
  },
  skeletonPill: {
    width: 80,
    height: 20,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceContainerHighest,
  },
  skeletonBar: {
    width: '100%',
    height: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceContainerHighest,
  },
  skeletonBarSmall: {
    width: '100%',
    height: 4,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceContainerHighest,
  },
  skeletonTextSmall: {
    width: 90,
    height: 14,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceContainerHighest,
  },
  skeletonIconBox: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surfaceContainerHigh,
  },
  skeletonGroupTitle: {
    width: 130,
    height: 20,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceContainerHighest,
  },
  skeletonAmount: {
    width: 90,
    height: 20,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceContainerHighest,
  },
  childrenContainer: {
    paddingLeft: 44,
    gap: 8,
    marginTop: 4,
  },
  childRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skeletonChildName: {
    width: 100,
    height: 16,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceContainerHighest,
  },
  skeletonChildAmount: {
    width: 70,
    height: 16,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceContainerHighest,
  },
});
