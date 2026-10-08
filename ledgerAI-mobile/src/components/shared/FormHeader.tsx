import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { borderRadius, colors, spacing, typography } from '../../constants/theme';
import PressableScale from './PressableScale';

export const FORM_HEADER_HEIGHT = 56;

interface Props {
  title: string;
  actionLabel: string;
  actionAccessibilityLabel: string;
  actionScale: number;
  onCancel?: () => void;
  onDone?: () => void;
}

export default function FormHeader({
  title,
  actionLabel,
  actionAccessibilityLabel,
  actionScale,
  onCancel,
  onDone,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.bar}>
        <Pressable
          accessibilityLabel="Cancel"
          accessibilityRole="button"
          onPress={onCancel}
          style={({ pressed }) => [styles.cancel, pressed && { opacity: 0.7 }]}
        >
          <MaterialIcons
            name="close"
            size={20}
            color={colors.onSurfaceVariant}
            style={styles.cancelIcon}
          />
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>

        <Text style={styles.title}>{title}</Text>

        <PressableScale
          accessibilityLabel={actionAccessibilityLabel}
          accessibilityRole="button"
          onPress={onDone}
          scale={actionScale}
          style={styles.done}
        >
          <Text style={styles.doneText}>{actionLabel}</Text>
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    backgroundColor: 'rgba(16, 20, 24, 0.85)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },
  bar: {
    height: FORM_HEADER_HEIGHT,
    paddingHorizontal: spacing.margin,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cancel: {
    height: 40,
    paddingHorizontal: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelIcon: { marginRight: 4 },
  cancelText: {
    ...typography.labelLg,
    color: colors.onSurfaceVariant,
  },
  title: {
    ...typography.headlineSm,
    color: colors.onSurface,
    letterSpacing: -0.45,
  },
  done: {
    height: 36,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  doneText: {
    ...typography.labelLg,
    color: colors.onPrimary,
    fontWeight: '600',
  },
});
