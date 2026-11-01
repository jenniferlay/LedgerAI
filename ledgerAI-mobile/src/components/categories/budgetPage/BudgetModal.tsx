import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import theme from '@/constants/theme';
import { getCategories, CategoryResponse } from '@/services/categories-api';
import { createBudget, updateBudget, deleteBudget } from '@/services/budgets-api';
import { sortCategoriesByPriority } from '@/utils/category-priority';

const { colors, spacing, borderRadius, typography } = theme;

export interface BudgetModalItem {
  budgetid?: number | null;
  categoryid?: number | null;
  name?: string;
  amount?: number;
  icon?: string | null;
}

interface Props {
  visible: boolean;
  budget?: BudgetModalItem | null;
  existingBudgetCategoryIds?: Set<number>;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BudgetModal({
  visible,
  budget,
  existingBudgetCategoryIds = new Set(),
  onClose,
  onSuccess,
}: Props) {
  const router = useRouter();
  const isEditing = Boolean(budget?.budgetid);

  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize form when modal opens or budget changes
  useEffect(() => {
    if (visible) {
      setErrorMessage(null);
      setSearchQuery('');
      if (budget) {
        setSelectedCategoryId(budget.categoryid ?? null);
        setAmount(budget.amount !== undefined ? budget.amount.toString() : '');
      } else {
        setSelectedCategoryId(null);
        setAmount('');
        // Load categories if adding a new budget
        setLoadingCategories(true);
        getCategories()
          .then((list) => {
            setCategories(list);
          })
          .catch((err) => {
            setErrorMessage(err instanceof Error ? err.message : 'Failed to load categories');
          })
          .finally(() => {
            setLoadingCategories(false);
          });
      }
    }
  }, [visible, budget]);

  const selectedCategory = useMemo(() => {
    if (budget?.categoryid) {
      return {
        categoryid: budget.categoryid,
        name: budget.name ?? 'Category',
        icon: budget.icon ?? 'folder',
      };
    }
    return categories.find((c) => c.categoryid === selectedCategoryId) ?? null;
  }, [budget, categories, selectedCategoryId]);

  const prioritizedCategories = useMemo(() => {
    return sortCategoriesByPriority(categories);
  }, [categories]);

  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return prioritizedCategories;
    return prioritizedCategories.filter((c) => {
      return c.name.toLowerCase().includes(q);
    });
  }, [prioritizedCategories, searchQuery]);

  const handleSave = async () => {
    Keyboard.dismiss();
    setErrorMessage(null);
    const cleaned = amount.replace(/[^0-9.]/g, '');
    const num = parseFloat(cleaned);

    if (isNaN(num) || num <= 0) {
      setErrorMessage('Please enter a valid monthly amount greater than 0.');
      return;
    }

    const roundedAmount = Math.round(num * 100) / 100;

    setIsSubmitting(true);
    try {
      if (isEditing && budget?.budgetid) {
        await updateBudget(budget.budgetid, { amount: roundedAmount });
      } else {
        if (!selectedCategoryId) {
          setErrorMessage('Please select a category for this budget.');
          setIsSubmitting(false);
          return;
        }
        await createBudget({
          categoryid: selectedCategoryId,
          amount: roundedAmount,
        });
      }
      onSuccess();
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save budget.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!budget?.budgetid) return;
    Keyboard.dismiss();

    Alert.alert(
      'Delete Budget',
      `Are you sure you want to delete the budget for "${budget.name ?? 'this category'}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsSubmitting(true);
            try {
              await deleteBudget(budget.budgetid!);
              onSuccess();
              onClose();
            } catch (err) {
              setErrorMessage(err instanceof Error ? err.message : 'Failed to delete budget.');
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ],
    );
  };

  const handleAddNewCategory = () => {
    Keyboard.dismiss();
    onClose();
    router.push('/(app)/(budgets)/add-category');
  };

  const handleDismiss = () => {
    Keyboard.dismiss();
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleDismiss}
    >
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.overlay} onPress={handleDismiss}>
          <Pressable style={styles.container} onPress={(e) => e.stopPropagation()}>
            {/* Header */}
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>
                  {isEditing ? 'Edit Budget' : 'Set Category Budget'}
                </Text>
                <Text style={styles.subtitle}>
                  {isEditing
                    ? 'Update or remove this monthly limit'
                    : 'Select a category and assign a monthly limit'}
                </Text>
              </View>
              <Pressable hitSlop={8} onPress={handleDismiss} style={styles.closeBtn}>
                <MaterialIcons name="close" size={22} color={colors.onSurfaceVariant} />
              </Pressable>
            </View>

            {/* Scrollable Content inside Modal to never get blocked by keyboard */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scrollContent}
              bounces={false}
            >
              {/* Error Message */}
              {errorMessage && (
                <View style={styles.errorBox}>
                  <MaterialIcons name="error-outline" size={18} color={colors.error} />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              )}

              {/* Category Section */}
              {isEditing ? (
                <View style={styles.selectedCategoryCard}>
                  <View style={styles.categoryIconBox}>
                    <MaterialIcons
                      name={
                        (selectedCategory?.icon && selectedCategory.icon in MaterialIcons.glyphMap
                          ? selectedCategory.icon
                          : 'folder') as keyof typeof MaterialIcons.glyphMap
                      }
                      size={20}
                      color={colors.primary}
                    />
                  </View>
                  <Text style={styles.selectedCategoryText}>
                    {selectedCategory?.name ?? 'Category'}
                  </Text>
                </View>
              ) : (
                <View style={styles.section}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.fieldLabel}>Category</Text>
                    <Pressable onPress={handleAddNewCategory} style={styles.newCategoryLink}>
                      <MaterialIcons name="add" size={16} color={colors.primary} />
                      <Text style={styles.newCategoryLinkText}>New Category</Text>
                    </Pressable>
                  </View>

                  {/* Category Search Input */}
                  <View style={styles.searchBar}>
                    <MaterialIcons name="search" size={18} color={colors.onSurfaceVariant} />
                    <TextInput
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      placeholder="Search categories..."
                      placeholderTextColor="rgba(134, 148, 138, 0.4)"
                      style={styles.searchInput}
                      autoCapitalize="none"
                      returnKeyType="done"
                    />
                    {searchQuery.length > 0 && (
                      <Pressable hitSlop={8} onPress={() => setSearchQuery('')}>
                        <MaterialIcons name="close" size={16} color={colors.onSurfaceVariant} />
                      </Pressable>
                    )}
                  </View>

                  {/* Categories List */}
                  <View style={styles.categoryPickerContainer}>
                    {loadingCategories ? (
                      <ActivityIndicator size="small" color={colors.primary} style={{ padding: 20 }} />
                    ) : (
                      <ScrollView
                        style={styles.categoryScroll}
                        nestedScrollEnabled
                        keyboardShouldPersistTaps="handled"
                      >
                        {filteredCategories.length === 0 ? (
                          <Text style={styles.noCategoriesText}>No categories found</Text>
                        ) : (
                          filteredCategories.map((cat) => {
                            const isSelected = selectedCategoryId === cat.categoryid;
                            const hasExistingBudget = existingBudgetCategoryIds.has(cat.categoryid);
                            const iconName = (cat.icon && cat.icon in MaterialIcons.glyphMap
                              ? cat.icon
                              : 'folder') as keyof typeof MaterialIcons.glyphMap;

                            return (
                              <Pressable
                                key={cat.categoryid}
                                style={[
                                  styles.categoryItem,
                                  isSelected && styles.categoryItemSelected,
                                ]}
                                onPress={() => {
                                  Keyboard.dismiss();
                                  setSelectedCategoryId(cat.categoryid);
                                }}
                              >
                                <View style={styles.categoryItemLeft}>
                                  <MaterialIcons
                                    name={iconName}
                                    size={18}
                                    color={isSelected ? colors.primary : colors.onSurfaceVariant}
                                  />
                                  <Text
                                    style={[
                                      styles.categoryItemText,
                                      isSelected && styles.categoryItemTextSelected,
                                    ]}
                                  >
                                    {cat.name}
                                  </Text>
                                  {cat.is_custom && (
                                    <View style={styles.customBadge}>
                                      <Text style={styles.customBadgeText}>Custom</Text>
                                    </View>
                                  )}
                                </View>
                                {hasExistingBudget && (
                                  <View style={styles.hasBudgetBadge}>
                                    <Text style={styles.hasBudgetText}>Has Budget</Text>
                                  </View>
                                )}
                                {isSelected && (
                                  <MaterialIcons name="check" size={18} color={colors.primary} />
                                )}
                              </Pressable>
                            );
                          })
                        )}
                      </ScrollView>
                    )}
                  </View>
                </View>
              )}

              {/* Amount Input */}
              <View style={styles.section}>
                <Text style={styles.fieldLabel}>Monthly Spending Limit</Text>
                <View style={styles.amountInputContainer}>
                  <Text style={styles.currencyPrefix}>$</Text>
                  <TextInput
                    accessibilityLabel="Monthly budget amount"
                    style={styles.amountInput}
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="0.00"
                    placeholderTextColor="rgba(134, 148, 138, 0.35)"
                    keyboardType="decimal-pad"
                    returnKeyType="done"
                    selectionColor={colors.primary}
                    cursorColor={colors.primary}
                  />
                  <Text style={styles.perMonthText}>/ month</Text>
                </View>
              </View>

              {/* Actions */}
              <View style={styles.actions}>
                {isEditing && (
                  <Pressable
                    accessibilityLabel="Delete budget"
                    disabled={isSubmitting}
                    onPress={handleDelete}
                    style={({ pressed }) => [
                      styles.btnDelete,
                      pressed && { opacity: 0.7 },
                      isSubmitting && { opacity: 0.5 },
                    ]}
                  >
                    <MaterialIcons name="delete-outline" size={18} color={colors.error} />
                    <Text style={styles.btnDeleteText}>Delete</Text>
                  </Pressable>
                )}

                <Pressable
                  accessibilityLabel="Save budget"
                  disabled={isSubmitting}
                  onPress={handleSave}
                  style={({ pressed }) => [
                    styles.btnSave,
                    pressed && { opacity: 0.8 },
                    isSubmitting && { opacity: 0.5 },
                  ]}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color={colors.onPrimaryContainer} />
                  ) : (
                    <>
                      <MaterialIcons name="check" size={18} color={colors.onPrimaryContainer} />
                      <Text style={styles.btnSaveText}>
                        {isEditing ? 'Update Budget' : 'Save Budget'}
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  container: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.xxl,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  scrollContent: {
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    ...typography.headlineSm,
    color: colors.onSurface,
  },
  subtitle: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorText: {
    ...typography.bodySm,
    color: colors.error,
    flex: 1,
  },
  section: {
    gap: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  newCategoryLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  newCategoryLinkText: {
    ...typography.labelSm,
    color: colors.primary,
    fontWeight: '600',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: borderRadius.lg,
    gap: 8,
  },
  searchInput: {
    ...typography.bodyMd,
    color: colors.onSurface,
    flex: 1,
    padding: 0,
  },
  categoryPickerContainer: {
    maxHeight: 140,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surfaceContainerHigh,
    overflow: 'hidden',
  },
  categoryScroll: {
    maxHeight: 140,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  categoryItemSelected: {
    backgroundColor: 'rgba(78, 222, 163, 0.12)',
  },
  categoryItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  categoryItemText: {
    ...typography.bodyMd,
    color: colors.onSurface,
  },
  categoryItemTextSelected: {
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
  hasBudgetBadge: {
    backgroundColor: colors.surfaceContainerLowest ?? '#121212',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginRight: 6,
  },
  hasBudgetText: {
    ...typography.labelSm,
    color: colors.outline,
    fontSize: 10,
  },
  noCategoriesText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    padding: 16,
    textAlign: 'center',
  },
  selectedCategoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surfaceContainerHigh,
    padding: 12,
    borderRadius: borderRadius.xl,
  },
  categoryIconBox: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCategoryText: {
    ...typography.headlineSm,
    color: colors.onSurface,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: borderRadius.xl,
    paddingHorizontal: 14,
    height: 52,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  currencyPrefix: {
    ...typography.headlineMd,
    color: colors.primary,
    fontWeight: '700',
    marginRight: 6,
  },
  amountInput: {
    ...typography.headlineMd,
    color: colors.onSurface,
    flex: 1,
    padding: 0,
    margin: 0,
  },
  perMonthText: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    marginLeft: 6,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 4,
  },
  btnDelete: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
    height: 48,
    borderRadius: borderRadius.xl,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  btnDeleteText: {
    ...typography.labelLg,
    color: colors.error,
    fontWeight: '600',
  },
  btnSave: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 48,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.primaryContainer,
  },
  btnSaveText: {
    ...typography.labelLg,
    color: colors.onPrimaryContainer,
    fontWeight: '600',
  },
});
