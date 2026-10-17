import React from 'react';
import { View, StyleSheet } from 'react-native';
import theme from '@/constants/theme';

type Props = {
  value: number; // 0-100
  height?: number;
  color?: string;
};

export default function ProgressBar({ value, height = 4, color = theme.colors.primary }: Props) {
  return (
    <View style={[styles.track, { height }]}>
      <View
        style={{
          width: `${value}%`,
          height: '100%',
          backgroundColor: color,
          borderRadius: theme.borderRadius.full,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    backgroundColor: theme.colors.surfaceContainerHighest,
    borderRadius: theme.borderRadius.full,
    overflow: 'hidden',
  },
});