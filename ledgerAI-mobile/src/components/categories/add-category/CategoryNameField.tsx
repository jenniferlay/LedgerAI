import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import theme from '../../../constants/theme';

const { colors, spacing, borderRadius, typography } = theme;

interface Props {
  value: string;
  onChangeText: (text: string) => void;
}

export default function CategoryNameField({ value, onChangeText }: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <View
      style={[
        styles.container,
        focused && { backgroundColor: colors.surfaceContainer },
      ]}
    >
      <Text style={styles.label}>Category Title</Text>
      <TextInput
        accessibilityLabel="Category title"
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        maxLength={100}
        placeholder="e.g. Specialty Coffee, SaaS, Uber"
        placeholderTextColor="rgba(134, 148, 138, 0.4)"
        selectionColor={colors.primary}
        cursorColor={colors.primary}
        returnKeyType="done"
      />
      {focused && <View pointerEvents="none" style={styles.focusRing} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  label: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  input: {
    ...typography.headlineSm,
    color: colors.onSurface,
    letterSpacing: -0.45,
    padding: 0,
    margin: 0,
  },
  focusRing: {
    ...StyleSheet.absoluteFill,
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    borderColor: 'rgba(78, 222, 163, 0.35)',
  },
});
