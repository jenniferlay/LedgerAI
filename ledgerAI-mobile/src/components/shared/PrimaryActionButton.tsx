import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { borderRadius, colors, spacing, typography } from '@/constants/theme';
import PressableScale from './PressableScale';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

interface Props {
  label: string;
  accessibilityLabel: string;
  icon: IconName;
  iconPosition?: 'before' | 'after';
  isLoading?: boolean;
  onPress: () => void;
}

export default function PrimaryActionButton({
  label,
  accessibilityLabel,
  icon,
  iconPosition = 'after',
  isLoading = false,
  onPress,
}: Props) {
  const iconElement = (
    <MaterialIcons
      name={icon}
      size={iconPosition === 'before' ? 22 : 20}
      color={colors.onPrimary}
    />
  );

  return (
    <View style={styles.wrapper}>
      <PressableScale
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        onPress={onPress}
        disabled={isLoading}
        scale={0.98}
        style={[styles.button, isLoading && styles.buttonDisabled]}
      >
        {isLoading ? (
          <ActivityIndicator color={colors.onPrimary} size="small" />
        ) : (
          <>
            {iconPosition === 'before' && iconElement}
            <Text style={styles.text}>{label}</Text>
            {iconPosition === 'after' && iconElement}
          </>
        )}
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingTop: spacing.xs,
    width: '100%',
  },
  button: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  text: {
    ...typography.headlineSm,
    color: colors.onPrimary,
    fontWeight: '700',
  },
});
