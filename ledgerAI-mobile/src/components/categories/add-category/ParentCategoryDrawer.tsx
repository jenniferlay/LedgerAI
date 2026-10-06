import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import theme from '../../../constants/theme';
import PressableScale from './PressableScale';
import SectionHeader, { sectionHeaderStyles } from './SectionHeader';
import { PARENT_CATEGORIES } from './data';

const { colors, spacing, borderRadius, typography } = theme;

interface Props {
  visible: boolean;
  selectedId: string;
  selectedLabel: string;
  onSelect: (id: string) => void;
}

export default function ParentCategoryDrawer({
  visible,
  selectedId,
  selectedLabel,
  onSelect,
}: Props) {
  if (!visible) return null;

  return (
    <View style={styles.container}>
      <SectionHeader
        label="Assign Parent Category"
        right={
          <Text style={sectionHeaderStyles.rightPrimary}>{selectedLabel}</Text>
        }
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.rail}
        contentContainerStyle={styles.railContent}
      >
        {PARENT_CATEGORIES.map((category) => {
          const active = category.id === selectedId;
          return (
            <PressableScale
              key={category.id}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => onSelect(category.id)}
              style={[
                styles.chip,
                {
                  backgroundColor: active
                    ? colors.surfaceContainerHigh
                    : colors.surfaceContainerLow,
                },
              ]}
            >
              <MaterialIcons
                name={category.icon}
                size={18}
                color={active ? colors.primary : colors.onSurfaceVariant}
              />
              <Text
                style={[
                  styles.chipText,
                  active
                    ? { color: colors.onSurface, fontWeight: '600' }
                    : { color: colors.onSurfaceVariant, fontWeight: '500' },
                ]}
              >
                {category.label}
              </Text>
            </PressableScale>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  rail: { marginHorizontal: -spacing.margin },
  railContent: {
    paddingHorizontal: spacing.margin,
    paddingVertical: 4,
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
  },
  chipText: { ...typography.labelMd },
});
