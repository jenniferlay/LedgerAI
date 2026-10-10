import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import theme from '@/constants/theme';

const { colors, spacing, borderRadius, typography } = theme;

interface Props {
  value: string;
  error?: string;
  onChangeText: (text: string) => void;
  onBlur?: () => void;
}

export default function MerchantField({
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
      <Text style={styles.label}>Merchant / Store</Text>
      <View
        style={[
          styles.container,
          focused && styles.containerFocused,
          Boolean(error) && styles.containerError,
        ]}
      >
        <MaterialIcons
          name="storefront"
          size={20}
          color={focused ? colors.primary : colors.outline}
          style={styles.icon}
        />
        <TextInput
          accessibilityLabel="Merchant or store name"
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={handleBlur}
          maxLength={255}
          placeholder="e.g. Trader Joe's, Target, Uber"
          placeholderTextColor="rgba(134, 148, 138, 0.4)"
          selectionColor={colors.primary}
          cursorColor={colors.primary}
          returnKeyType="next"
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
    paddingVertical: spacing.sm + 4,
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
  icon: {
    marginRight: spacing.sm,
  },
  input: {
    ...typography.bodyLg,
    flex: 1,
    color: colors.onSurface,
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
