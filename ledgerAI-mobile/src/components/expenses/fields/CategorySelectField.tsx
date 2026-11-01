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
import { sortCategoriesByPriority } from '@/utils/category-priority';
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
            isCustom: category.is_custom || (category.userid ? category.userid > 0 : false),
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

  // Compute prioritized chips: all user-created categories first, then common ones
  const prioritizedChips = useMemo(() => {
    const userCategories = sortCategoriesByPriority(allCategories.filter((c) => c.isCustom));
    const commonCategories = sortCategoriesByPriority(allCategories.filter((c) => !c.isCustom));

    const list: ExpenseCategoryOption[] = [...userCategories];
    for (const cat of commonCategories) {
      if (list.length >= 8) break;
      if (!list.some((existing) => existing.id === cat.id)) {
        list.push(cat);
      }
    }
    return list;
  }, [allCategories]);

  // Check if currently selected category is already in the prioritized chips
  const selectedCategory = useMemo(() => {
    if (selectedId === null) return null;
    return allCategories.find((c) => c.id === selectedId) ?? null;
  }, [allCategories, selectedId]);

  const isSelectedInChips = useMemo(() => {
    if (selectedId === null) return true;
    return prioritizedChips.some((c) => c.id === selectedId);
  }, [prioritizedChips, selectedId]);

  // Prioritized list for modal
  const sortedCategories = useMemo(() => {
    return sortCategoriesByPriority(allCategories);
  }, [allCategories]);

  // Search filter for modal (maintains priority ordering)
  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sortedCategories;
    return sortedCategories.filter((c) => {
      const matchesName = c.name.toLowerCase().includes(q);
      const matchesParent = c.parentName?.toLowerCase().includes(q);
      return matchesName || matchesParent;
    });
  }, [sortedCategories, searchQuery]);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>Category</Text>

      {/* Horizontal prioritized chips + More button */}
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

        {/* If selected item is not in the chips, display it here so the user sees it */}
        {selectedCategory && !isSelectedInChips && (
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

        {/* Prioritized Categories (User-created first, then common) */}
        {prioritizedChips.map((category) => {
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
              {category.isCustom && (
                <View style={styles.chipCustomDot} />
              )}
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
          <Text style={[styles.chipText, styles.moreChipText]}>More...</Text>
        </Pressable>
      </ScrollView>

      {/* Searchable Modal for All Categories */}
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

            {/* Search Bar */}
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
                      <View style={styles.nameRow}>
                        <Text
                          style={[
                            styles.optionText,
                            isSelected && styles.optionTextActive,
                          ]}
                        >
                          {cat.name}
                        </Text>
                        {cat.isCustom && (
                          <View style={styles.customBadge}>
                            <Text style={styles.customBadgeText}>Custom</Text>
                          </View>
                        )}
                      </View>
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
    marginBottom: 6,
  },
  scrollList: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
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
    borderColor: 'transparent',
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
    fontWeight: '600',
  },
  chipCustomDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  moreChip: {
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: 'rgba(78, 222, 163, 0.25)',
  },
  moreChipText: {
    color: colors.primary,
    fontWeight: '600',
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
    maxHeight: '80%',
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
    gap: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  modalTitle: {
    ...typography.headlineSm,
    color: colors.onSurface,
  },
  modalSubtitle: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  searchSection: {
    width: '100%',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: borderRadius.xl,
    gap: 8,
  },
  searchInput: {
    ...typography.bodyMd,
    color: colors.onSurface,
    flex: 1,
    padding: 0,
  },
  clearSearchButton: {
    padding: 4,
  },
  listContainer: {
    gap: 4,
    paddingVertical: 4,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: borderRadius.lg,
    gap: 12,
  },
  optionItemActive: {
    backgroundColor: 'rgba(78, 222, 163, 0.12)',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleActive: {
    backgroundColor: colors.primary,
  },
  optionDetails: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  optionText: {
    ...typography.bodyLg,
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
  parentSubtitle: {
    ...typography.bodySm,
    color: colors.outline,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyText: {
    ...typography.bodyMd,
    color: colors.outline,
    textAlign: 'center',
  },
});
