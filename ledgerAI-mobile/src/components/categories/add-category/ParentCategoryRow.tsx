import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import theme from '../../../constants/theme';
import type { ParentCategory } from './types';

const { colors, spacing, borderRadius, typography } = theme;

interface Props {
  parent: ParentCategory;
}

export default function ParentCategoryRow({ parent }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <MaterialIcons
          name="subdirectory-arrow-right"
          size={18}
          color={colors.onSurfaceVariant}
        />
        <Text style={styles.label}>Parent Category</Text>
      </View>
      <View style={styles.pill}>
        <MaterialIcons name={parent.icon} size={16} color={colors.primary} />
        <Text style={styles.pillText}>{parent.label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: borderRadius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(60, 74, 66, 0.3)',
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceContainerHigh,
  },
  pillText: {
    ...typography.labelMd,
    color: colors.onSurface,
    fontWeight: '600',
  },
});
