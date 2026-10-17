import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import theme from '@/constants/theme';

type NetWorthCardProps = {
  amount: number;
  name: string;
  label?: string;
  currency?: string;
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function NetWorthCard({
  amount,
  name,
  label = 'Net Worth',
  currency = 'USD',
}: NetWorthCardProps) {
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);

  return (
    <View style={styles.card}>
      <Svg style={styles.glow} pointerEvents="none">
        <Defs>
          <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#4EDEA3" stopOpacity={0.22} />
            <Stop offset="60%" stopColor="#4EDEA3" stopOpacity={0.06} />
            <Stop offset="100%" stopColor="#4EDEA3" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#glow)" />
      </Svg>

      <Text style={[theme.typography.headlineLgMobile, styles.greeting]}>
        {getGreeting()}, {name}
      </Text>

      <Text style={styles.label}>{label}</Text>
      <Text
        style={[theme.typography.metricDisplayMobile, styles.amount]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {formatted}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surfaceContainer,
    borderRadius: theme.borderRadius.xl,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    minHeight: 180,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  glow: {
    position: 'absolute',
    right: -80,
    top: -80,
    width: 260,
    height: 260,
  },
  greeting: {
    color: theme.colors.onSurface,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  label: {
    fontSize: 13,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: theme.colors.onSurface,
    opacity: 0.6,
    marginBottom: 6,
  },
  amount: {
    fontSize: 32,
    color: theme.colors.onSurface,
  },
});