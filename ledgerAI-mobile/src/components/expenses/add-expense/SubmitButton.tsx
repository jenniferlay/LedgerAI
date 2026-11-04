import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import theme from '../../../constants/theme';
import PressableScale from './PressableScale';

const { colors, spacing, borderRadius, typography } = theme;

interface Props {
  onPress: () => void;
  isLoading?: boolean;
}

export default function SubmitButton({ onPress, isLoading = false }: Props) {
  return (
    <View style={styles.wrapper}>
      <PressableScale
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
            <MaterialIcons name="check" size={22} color={colors.onPrimary} />
            <Text style={styles.text}>Save Expense</Text>
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
