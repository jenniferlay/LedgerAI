import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import theme from '@/constants/theme';
import { getCategories, subscribeToCategoryUpdates } from '@/services/categories-api';
import type { ExpenseCategoryOption, IconName } from '../types';

const { colors, spacing, borderRadius, typography } = theme;

const PREFERRED_COMMON_NAMES = [
  'Food And Drink',
  'General Merchandise',
  'Transportation',
  'Entertainment',
  'Rent And Utilities',
];

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
  const [allCategories, setAllCategories] = useState<ExpenseCategoryOption[]>(categories ?? []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (categories !== undefined) {
      setAllCategories(categories);
      return;
    }

    let active = true;

    const load = () => {
      getCategories()
        .then((items) => {
          if (!active) return;
          const parentMap = new Map<number, string>();
          items.forEach((c) => parentMap.set(c.categoryid, c.name));

          const mapped: ExpenseCategoryOption[] = items.map((category) => ({
            id: category.categoryid,
            name: category.name,
            icon:
              category.icon && category.icon in MaterialIcons.glyphMap
                ? (category.icon as IconName)
                : 'label',
            parentId: category.parent_categoryid,
            parentName: category.parent_categoryid
              ? parentMap.get(category.parent_categoryid) ?? null
              : null,
          }));

          setAllCategories(mapped);
        })
        .catch((error: unknown) => {
          if (active) {
            Alert.alert(
              'Unable to Load Categories',
              error instanceof Error ? error.message : 'An unexpected error occurred.',
            );
          }
        });
    };

    load();
    const unsubscribe = subscribeToCategoryUpdates(load);

    return () => {
      active = false;
      unsubscribe();
    };
  }, [categories]);

  // Compute common categories (~5)
  const commonCategories = useMemo(() => {
    const list: ExpenseCategoryOption[] = [];

    // 1. Match preferred common names first
    for (const prefName of PREFERRED_COMMON_NAMES) {
      const match = allCategories.find(
        (c) => c.name.toLowerCase() === prefName.toLowerCase(),
      );
      if (match && !list.some((existing) => existing.id === match.id)) {
        list.push(match);
      }
    }

    // 2. If fewer than 5, fill with other root categories
    if (list.length < 5) {
      for (const c of allCategories) {
        if (list.length >= 5) break;
        if (c.parentId == null && !list.some((existing) => existing.id === c.id)) {
          list.push(c);
        }
      }
    }

    return list;
  }, [allCategories]);

  // Check if currently selected category is already in the common 5
  const selectedCategory = useMemo(() => {
    if (selectedId === null) return null;
    return allCategories.find((c) => c.id === selectedId) ?? null;
  }, [allCategories, selectedId]);

  const isSelectedInCommon = useMemo(() => {
    if (selectedId === null) return true;
    return commonCategories.some((c) => c.id === selectedId);
  }, [commonCategories, selectedId]);

  // Search filter for modal
  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allCategories;
    return allCategories.filter((c) => {
      const matchesName = c.name.toLowerCase().includes(q);
      const matchesParent = c.parentName?.toLowerCase().includes(q);
      return matchesName || matchesParent;
    });
  }, [allCategories, searchQuery]);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>Category</Text>

      {/* Horizontal common chips + More button */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollList}
      >
        {/* Uncategorized */}
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

        {/* If selected item is not in common 5, display it here so the user sees it */}
        {selectedCategory && !isSelectedInCommon && (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: true }}
            onPress={() => onSelect(selectedCategory.id)}
            style={[styles.chip, styles.chipSelected]}
          >
            <MaterialIcons
              name={selectedCategory.icon}
              size={16}
              color={colors.onPrimaryContainer}
            />
            <Text style={[styles.chipText, styles.chipTextSelected]}>
              {selectedCategory.name}
            </Text>
          </Pressable>
        )}

        {/* Common 5 Categories */}
        {commonCategories.map((category) => {
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

        {/* More... Button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View more categories"
          onPress={() => setIsModalOpen(true)}
          style={[styles.chip, styles.moreChip]}
        >
          <MaterialIcons
            name="more-horiz"
            size={18}
            color={colors.primary}
          />
          <Text style={styles.moreChipText}>More...</Text>
        </Pressable>
      </ScrollView>

      {/* More Categories Search Modal */}
      <Modal
        visible={isModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setIsModalOpen(false);
          setSearchQuery('');
        }}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            setIsModalOpen(false);
            setSearchQuery('');
          }}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>All Categories</Text>
                <Text style={styles.modalSubtitle}>
                  {filteredCategories.length} available
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                hitSlop={8}
                onPress={() => {
                  setIsModalOpen(false);
                  setSearchQuery('');
                }}
              >
                <MaterialIcons name="close" size={22} color={colors.onSurface} />
              </Pressable>
            </View>

            {/* Search Bar - matching IconGrid / Create Category styling */}
            <View style={styles.searchSection}>
              <View style={styles.searchBar}>
                <MaterialIcons
                  name="search"
                  size={20}
                  color={colors.onSurfaceVariant}
                />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search categories (e.g. food, uber)..."
                  placeholderTextColor={colors.onSurfaceVariant}
                  style={styles.searchInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                  clearButtonMode="while-editing"
                />
                {searchQuery.length > 0 && (
                  <Pressable
                    hitSlop={8}
                    onPress={() => setSearchQuery('')}
                    style={styles.clearSearchButton}
                  >
                    <MaterialIcons name="close" size={16} color={colors.onSurfaceVariant} />
                  </Pressable>
                )}
              </View>
            </View>

            {/* Categories Scrollable List */}
            <ScrollView
              contentContainerStyle={styles.listContainer}
              keyboardShouldPersistTaps="handled"
            >
              {/* Option to clear to Uncategorized */}
              {searchQuery.trim() === '' && (
                <Pressable
                  style={[
                    styles.optionItem,
                    selectedId === null && styles.optionItemActive,
                  ]}
                  onPress={() => {
                    onSelect(null);
                    setIsModalOpen(false);
                    setSearchQuery('');
                  }}
                >
                  <View
                    style={[
                      styles.iconCircle,
                      selectedId === null && styles.iconCircleActive,
                    ]}
                  >
                    <MaterialIcons
                      name="label-outline"
                      size={18}
                      color={selectedId === null ? colors.onPrimaryContainer : colors.onSurfaceVariant}
                    />
                  </View>
                  <View style={styles.optionDetails}>
                    <Text
                      style={[
                        styles.optionText,
                        selectedId === null && styles.optionTextActive,
                      ]}
                    >
                      Uncategorized
                    </Text>
                  </View>
                  {selectedId === null && (
                    <MaterialIcons name="check" size={20} color={colors.primary} />
                  )}
                </Pressable>
              )}

              {/* Filtered Category Items */}
              {filteredCategories.map((cat) => {
                const isSelected = selectedId === cat.id;
                return (
                  <Pressable
                    key={cat.id}
                    style={[
                      styles.optionItem,
                      isSelected && styles.optionItemActive,
                    ]}
                    onPress={() => {
                      onSelect(cat.id);
                      setIsModalOpen(false);
                      setSearchQuery('');
                    }}
                  >
                    <View
                      style={[
                        styles.iconCircle,
                        isSelected && styles.iconCircleActive,
                      ]}
                    >
                      <MaterialIcons
                        name={cat.icon}
                        size={18}
                        color={isSelected ? colors.onPrimaryContainer : colors.primary}
                      />
                    </View>
                    <View style={styles.optionDetails}>
                      <Text
                        style={[
                          styles.optionText,
                          isSelected && styles.optionTextActive,
                        ]}
                      >
                        {cat.name}
                      </Text>
                      {cat.parentName && (
                        <Text style={styles.parentSubtitle}>
                          {cat.parentName}
                        </Text>
                      )}
                    </View>
                    {isSelected && (
                      <MaterialIcons name="check" size={20} color={colors.primary} />
                    )}
                  </Pressable>
                );
              })}

              {/* Empty state if search finds nothing */}
              {filteredCategories.length === 0 && (
                <View style={styles.emptyContainer}>
                  <MaterialIcons name="search-off" size={32} color={colors.outline} />
                  <Text style={styles.emptyText}>
                    No categories found for "{searchQuery}"
                  </Text>
                </View>
              )}
            </ScrollView>
          </Pressable>
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
  moreChip: {
    borderColor: 'rgba(78, 222, 163, 0.4)',
    backgroundColor: colors.surfaceContainer,
  },
  moreChipText: {
    ...typography.labelMd,
    color: colors.primary,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    padding: spacing.margin,
  },
  modalContent: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: borderRadius.xxl,
    maxHeight: '80%',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(60, 74, 66, 0.4)',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(60, 74, 66, 0.2)',
  },
  modalTitle: {
    ...typography.titleMedium,
    color: colors.onSurface,
    fontWeight: '700',
  },
  modalSubtitle: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  searchSection: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(60, 74, 66, 0.15)',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: borderRadius.xl,
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    color: colors.onSurface,
    padding: 0,
  },
  clearSearchButton: {
    padding: 4,
  },
  listContainer: {
    padding: spacing.sm,
    paddingBottom: spacing.lg,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
  },
  optionItemActive: {
    backgroundColor: colors.surfaceContainerHigh,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleActive: {
    backgroundColor: colors.primaryContainer,
  },
  optionDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  optionText: {
    ...typography.bodyMedium,
    color: colors.onSurface,
    fontWeight: '500',
  },
  optionTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  parentSubtitle: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyText: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
});
