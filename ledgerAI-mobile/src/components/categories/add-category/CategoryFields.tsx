import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import theme from '@/constants/theme';
import PressableScale from '@/components/shared/PressableScale';
import type { IconName, ParentCategory } from './data';

const { colors, spacing, borderRadius, typography } = theme;

interface NameFieldProps {
  value: string;
  onChangeText: (text: string) => void;
}

export function CategoryNameField({ value, onChangeText }: NameFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View
      style={[
        nameFieldStyles.container,
        focused && { backgroundColor: colors.surfaceContainer },
      ]}
    >
      <Text style={nameFieldStyles.label}>Category Title</Text>
      <TextInput
        accessibilityLabel="Category title"
        style={nameFieldStyles.input}
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
      {focused && <View pointerEvents="none" style={nameFieldStyles.focusRing} />}
    </View>
  );
}

const nameFieldStyles = StyleSheet.create({
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
    paddingVertical: 0,
    margin: 0,
    lineHeight: undefined,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  focusRing: {
    ...StyleSheet.absoluteFill,
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    borderColor: 'rgba(78, 222, 163, 0.35)',
  },
});

interface ParentCategoryRowProps {
  parent: ParentCategory;
}

export function ParentCategoryRow({ parent }: ParentCategoryRowProps) {
  return (
    <View style={parentRowStyles.container}>
      <View style={parentRowStyles.left}>
        <MaterialIcons
          name="subdirectory-arrow-right"
          size={18}
          color={colors.onSurfaceVariant}
        />
        <Text style={parentRowStyles.label}>Parent Category</Text>
      </View>
      <View style={parentRowStyles.pill}>
        <MaterialIcons name={parent.icon} size={16} color={colors.primary} />
        <Text style={parentRowStyles.pillText}>{parent.label}</Text>
      </View>
    </View>
  );
}

const parentRowStyles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: borderRadius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(60, 74, 66, 0.3)',
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceContainerHigh,
  },
  pillText: {
    ...typography.labelMd,
    color: colors.onSurface,
    fontWeight: '600',
  },
});

interface IconPreviewProps {
  icon: IconName;
}

export function IconPreview({ icon }: IconPreviewProps) {
  return (
    <View style={iconPreviewStyles.wrapper}>
      <PressableScale
        accessibilityLabel="Selected category icon preview"
        scale={0.95}
        style={iconPreviewStyles.circle}
      >
        <MaterialIcons name={icon} size={36} color={colors.primary} />
      </PressableScale>
    </View>
  );
}

const iconPreviewStyles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.md,
  },
  circle: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.full,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 25 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 10,
  },
});

interface BudgetFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
}

export function CategoryBudgetField({ value, onChangeText, error }: BudgetFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={budgetFieldStyles.wrapper}>
      <View
        style={[
          budgetFieldStyles.container,
          focused && budgetFieldStyles.containerFocused,
          Boolean(error) && budgetFieldStyles.containerError,
        ]}
      >
        <View style={budgetFieldStyles.headerRow}>
          <Text style={budgetFieldStyles.label}>Monthly Budget (Optional)</Text>
          <View style={budgetFieldStyles.badge}>
            <Text style={budgetFieldStyles.badgeText}>per month</Text>
          </View>
        </View>
        <View style={budgetFieldStyles.inputRow}>
          <Text style={budgetFieldStyles.currencyPrefix}>$</Text>
          <TextInput
            accessibilityLabel="Monthly budget amount"
            style={budgetFieldStyles.input}
            value={value}
            onChangeText={onChangeText}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="0.00"
            placeholderTextColor="rgba(134, 148, 138, 0.35)"
            keyboardType="decimal-pad"
            returnKeyType="done"
            selectionColor={colors.primary}
            cursorColor={colors.primary}
          />
        </View>
      </View>
      {Boolean(error) && <Text style={budgetFieldStyles.errorText}>{error}</Text>}
    </View>
  );
}

const budgetFieldStyles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  container: {
    width: '100%',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  label: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  badge: {
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  badgeText: {
    ...typography.labelSm,
    color: colors.primary,
    fontSize: 10,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencyPrefix: {
    ...typography.headlineSm,
    color: colors.primary,
    fontWeight: '700',
    marginRight: 6,
    lineHeight: undefined,
  },
  input: {
    ...typography.headlineSm,
    color: colors.onSurface,
    letterSpacing: -0.45,
    flex: 1,
    paddingVertical: 0,
    margin: 0,
    lineHeight: undefined,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  errorText: {
    ...typography.bodySm,
    color: colors.error,
    marginTop: 4,
    marginLeft: 4,
  },
});
