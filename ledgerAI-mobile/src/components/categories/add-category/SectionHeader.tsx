import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import theme from '@/constants/theme';

const { colors, typography } = theme;

interface Props {
  label: string;
  right?: React.ReactNode;
}

export default function SectionHeader({ label, right }: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      {right}
    </View>
  );
}

export const sectionHeaderStyles = StyleSheet.create({
  rightPrimary: {
    ...typography.labelSm,
    color: colors.primary,
    fontWeight: '500',
  },
  rightOutline: {
    ...typography.labelSm,
    color: colors.outline,
  },
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  label: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
