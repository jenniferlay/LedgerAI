import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import theme from '../../../constants/theme';
import { getTodayIsoDate, getYesterdayIsoDate } from './validation';

const { colors, spacing, borderRadius, typography } = theme;

interface Props {
  value: string;
  error?: string;
  onChangeText: (text: string) => void;
  onBlur?: () => void;
}

export default function DateField({
  value,
  error,
  onChangeText,
  onBlur,
}: Props) {
  const [focused, setFocused] = useState(false);
  const today = getTodayIsoDate();
  const yesterday = getYesterdayIsoDate();

  const handleBlur = () => {
    setFocused(false);
    onBlur?.();
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>Date</Text>
        <View style={styles.shortcuts}>
          <Pressable
            accessibilityRole="button"
            style={[styles.shortcutPill, value === today && styles.shortcutPillActive]}
            onPress={() => onChangeText(today)}
          >
            <Text
              style={[
                styles.shortcutText,
                value === today && styles.shortcutTextActive,
              ]}
            >
              Today
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            style={[
              styles.shortcutPill,
              value === yesterday && styles.shortcutPillActive,
            ]}
            onPress={() => onChangeText(yesterday)}
          >
            <Text
              style={[
                styles.shortcutText,
                value === yesterday && styles.shortcutTextActive,
              ]}
            >
              Yesterday
            </Text>
          </Pressable>
        </View>
      </View>

      <View
        style={[
          styles.container,
          focused && styles.containerFocused,
          Boolean(error) && styles.containerError,
        ]}
      >
        <MaterialIcons
          name="event"
          size={20}
          color={focused ? colors.primary : colors.outline}
          style={styles.icon}
        />
        <TextInput
          accessibilityLabel="Expense date YYYY-MM-DD"
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={handleBlur}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="rgba(134, 148, 138, 0.4)"
          selectionColor={colors.primary}
          cursorColor={colors.primary}
          maxLength={10}
          returnKeyType="done"
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  shortcuts: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  shortcutPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(60, 74, 66, 0.3)',
  },
  shortcutPillActive: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primary,
  },
  shortcutText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    fontSize: 11,
  },
  shortcutTextActive: {
    color: colors.onPrimaryContainer,
    fontWeight: '600',
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
