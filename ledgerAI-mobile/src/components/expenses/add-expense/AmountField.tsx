import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import theme from '../../../constants/theme';

const { colors, spacing, borderRadius, typography } = theme;

interface Props {
  value: string;
  error?: string;
  onChangeText: (text: string) => void;
  onBlur?: () => void;
}

export default function AmountField({
  value,
  error,
  onChangeText,
  onBlur,
}: Props) {
  const [focused, setFocused] = useState(false);

  const handleBlur = () => {
    setFocused(false);
    onBlur?.();
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>Amount</Text>
      <View
        style={[
          styles.container,
          focused && styles.containerFocused,
          Boolean(error) && styles.containerError,
        ]}
      >
        <Text style={styles.currencyPrefix}>$</Text>
        <TextInput
          accessibilityLabel="Expense amount"
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={handleBlur}
          placeholder="0.00"
          placeholderTextColor="rgba(134, 148, 138, 0.35)"
          keyboardType="decimal-pad"
          returnKeyType="done"
          selectionColor={colors.primary}
          cursorColor={colors.primary}
        />
      </View>
      {Boolean(error) && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  label: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  container: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  containerFocused: {
    backgroundColor: colors.surfaceContainer,
    borderColor: colors.primary,
  },
  containerError: {
    borderColor: colors.error,
  },
  currencyPrefix: {
    ...typography.headlineLg,
    color: colors.primary,
    fontWeight: '700',
    marginRight: 6,
  },
  input: {
    ...typography.headlineLg,
    flex: 1,
    color: colors.onSurface,
    fontWeight: '700',
    padding: 0,
    margin: 0,
  },
  errorText: {
    ...typography.bodySm,
    color: colors.error,
    marginTop: 4,
    marginLeft: 4,
  },
});
