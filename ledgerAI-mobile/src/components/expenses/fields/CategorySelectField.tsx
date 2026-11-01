import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import theme from '@/constants/theme';
import { getCategories } from '@/services/categories-api';
import type { ExpenseCategoryOption, IconName } from '../types';

const { colors, spacing, borderRadius, typography } = theme;

interface Props {
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  categories?: ExpenseCategoryOption[];
}

export default function CategorySelectField({
  selectedId,
  onSelect,
  categories,
}: Props) {
  const [categoryOptions, setCategoryOptions] = useState(categories ?? []);

  useEffect(() => {
    if (categories !== undefined) {
      setCategoryOptions(categories);
      return;
    }

    let active = true;
    getCategories()
      .then((items) => {
        if (active) {
          setCategoryOptions(
            items.map((category) => ({
              id: category.categoryid,
              name: category.name,
              icon:
                category.icon && category.icon in MaterialIcons.glyphMap
                  ? (category.icon as IconName)
                  : 'label',
            })),
          );
        }
      })
      .catch((error: unknown) => {
        if (active) {
          Alert.alert(
            'Unable to Load Categories',
            error instanceof Error ? error.message : 'An unexpected error occurred.',
          );
        }
      });

    return () => {
      active = false;
    };
  }, [categories]);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>Category</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollList}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: selectedId === null }}
          onPress={() => onSelect(null)}
          style={[styles.chip, selectedId === null && styles.chipSelected]}
        >
          <MaterialIcons
            name="label"
            size={16}
            color={selectedId === null ? colors.onPrimaryContainer : colors.onSurfaceVariant}
          />
          <Text
            style={[
              styles.chipText,
              selectedId === null && styles.chipTextSelected,
            ]}
          >
            Uncategorized
          </Text>
        </Pressable>
        {categoryOptions.map((category) => {
          const isSelected = selectedId === category.id;
          return (
            <Pressable
              key={category.id}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => onSelect(category.id)}
              style={[
                styles.chip,
                isSelected && styles.chipSelected,
              ]}
            >
              <MaterialIcons
                name={category.icon}
                size={16}
                color={isSelected ? colors.onPrimaryContainer : colors.onSurfaceVariant}
              />
              <Text
                style={[
                  styles.chipText,
                  isSelected && styles.chipTextSelected,
                ]}
              >
                {category.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
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
    marginBottom: 8,
  },
  scrollList: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(60, 74, 66, 0.4)',
  },
  chipSelected: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primary,
  },
  chipText: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
  },
  chipTextSelected: {
    color: colors.onPrimaryContainer,
    fontWeight: '700',
  },
});
