import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import theme from '@/constants/theme';
import { getCategories, subscribeToCategoryUpdates, type CategoryResponse } from '@/services/categories-api';
import { sortCategoriesByPriority } from '@/utils/category-priority';
import type { IconName } from './data';

const { colors, spacing, borderRadius, typography } = theme;

interface Props {
  selectedParentId: number | null;
  onSelect: (parentId: number | null) => void;
}

export function ParentCategoryDropdown({ selectedParentId, onSelect }: Props) {
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  const fetchCategories = async () => {
    try {
      const items = await getCategories();
      // Only allow root categories (parent_categoryid is null) as parent categories
      const roots = items.filter((c) => c.parent_categoryid === null);
      setCategories(sortCategoriesByPriority(roots));
    } catch {
      // Fallback to empty if offline/error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    const unsubscribe = subscribeToCategoryUpdates(() => {
      fetchCategories();
    });
    return unsubscribe;
  }, []);

  const selectedCategory = categories.find((c) => c.categoryid === selectedParentId);

  const getIconName = (iconStr: string | null): IconName => {
    if (iconStr && iconStr in MaterialIcons.glyphMap) {
      return iconStr as IconName;
    }
    return 'label';
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>Parent Category</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => setIsOpen(true)}
        style={styles.dropdownButton}
      >
        <View style={styles.left}>
          <MaterialIcons
            name="subdirectory-arrow-right"
            size={18}
            color={colors.onSurfaceVariant}
          />
          {selectedCategory ? (
            <View style={styles.selectedRow}>
              <MaterialIcons name={getIconName(selectedCategory.icon)} size={16} color={colors.primary} />
              <Text style={styles.selectedText}>{selectedCategory.name}</Text>
              {selectedCategory.is_custom && (
                <View style={styles.customBadge}>
                  <Text style={styles.customBadgeText}>Custom</Text>
                </View>
              )}
            </View>
          ) : (
            <Text style={styles.noneText}>None (Top-Level Category)</Text>
          )}
        </View>
        <MaterialIcons name="arrow-drop-down" size={24} color={colors.onSurfaceVariant} />
      </Pressable>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setIsOpen(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Parent Category</Text>
              <Pressable onPress={() => setIsOpen(false)}>
                <MaterialIcons name="close" size={22} color={colors.onSurface} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.listContainer}>
              <Pressable
                style={[
                  styles.optionItem,
                  selectedParentId === null && styles.optionItemActive,
                ]}
                onPress={() => {
                  onSelect(null);
                  setIsOpen(false);
                }}
              >
                <View style={styles.optionLeft}>
                  <MaterialIcons name="label-outline" size={18} color={colors.onSurfaceVariant} />
                  <Text style={[styles.optionText, selectedParentId === null && styles.optionTextActive]}>
                    None (Top-Level Category)
                  </Text>
                </View>
                {selectedParentId === null && (
                  <MaterialIcons name="check" size={18} color={colors.primary} />
                )}
              </Pressable>

              {isLoading && categories.length === 0 ? (
                <View style={styles.loaderContainer}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              ) : (
                categories.map((cat) => {
                  const isSelected = selectedParentId === cat.categoryid;
                  return (
                    <Pressable
                      key={cat.categoryid}
                      style={[
                        styles.optionItem,
                        isSelected && styles.optionItemActive,
                      ]}
                      onPress={() => {
                        onSelect(cat.categoryid);
                        setIsOpen(false);
                      }}
                    >
                      <View style={styles.optionLeft}>
                        <MaterialIcons name={getIconName(cat.icon)} size={18} color={colors.primary} />
                        <Text style={[styles.optionText, isSelected && styles.optionTextActive]}>
                          {cat.name}
                        </Text>
                        {cat.is_custom && (
                          <View style={styles.customBadge}>
                            <Text style={styles.customBadgeText}>Custom</Text>
                          </View>
                        )}
                      </View>
                      {isSelected && (
                        <MaterialIcons name="check" size={18} color={colors.primary} />
                      )}
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
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
  dropdownButton: {
    width: '100%',
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderRadius: borderRadius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(60, 74, 66, 0.3)',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  selectedText: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '600',
  },
  noneText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalContent: {
    width: '100%',
    maxHeight: '70%',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.xxl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  modalTitle: {
    ...typography.headlineSm,
    color: colors.onSurface,
  },
  listContainer: {
    gap: 4,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: borderRadius.lg,
  },
  optionItemActive: {
    backgroundColor: 'rgba(78, 222, 163, 0.12)',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  optionText: {
    ...typography.bodyMd,
    color: colors.onSurface,
  },
  optionTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  customBadge: {
    backgroundColor: 'rgba(78, 222, 163, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  customBadgeText: {
    ...typography.labelSm,
    color: colors.primary,
    fontSize: 10,
    fontWeight: '600',
  },
  loaderContainer: {
    padding: spacing.lg,
    alignItems: 'center',
  },
});
