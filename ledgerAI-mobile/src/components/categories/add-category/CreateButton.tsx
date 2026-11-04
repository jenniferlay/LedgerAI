import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import theme from '../../../constants/theme';
import PressableScale from './PressableScale';

const { colors, spacing, borderRadius, typography } = theme;

interface Props {
  onPress: () => void;
}

export default function CreateButton({ onPress }: Props) {
  return (
    <View style={styles.wrapper}>
      <PressableScale
        accessibilityRole="button"
        onPress={onPress}
        scale={0.98}
        style={styles.button}
      >
        <Text style={styles.text}>Create Category</Text>
        <MaterialIcons name="arrow-forward" size={20} color={colors.onPrimary} />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { paddingTop: spacing.xs },
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
  text: {
    ...typography.headlineSm,
    color: colors.onPrimary,
    fontWeight: '700',
  },
});
