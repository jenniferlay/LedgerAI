export const PREFERRED_COMMON_NAMES = [
  'Food And Drink',
  'General Merchandise',
  'Transportation',
  'Entertainment',
  'Rent And Utilities',
  'Groceries',
  'Restaurants',
  'Gas',
  'Shopping',
  'Travel',
  'Personal Care',
];

export interface PrioritizableCategory {
  name: string;
  isCustom?: boolean;
  is_custom?: boolean;
  userid?: number;
}

/**
 * Returns a sort score for a category:
 * - 0: User-created categories (highest priority)
 * - 10..49: Exact match to preferred common categories
 * - 50..99: Partial match to common category keywords
 * - 100: Standard global categories
 */
export function getCategoryPriorityScore(category: PrioritizableCategory): number {
  const isCustom =
    category.isCustom ??
    category.is_custom ??
    (category.userid !== undefined ? category.userid > 0 : false);

  if (isCustom) {
    return 0;
  }

  const lowerName = category.name.trim().toLowerCase();
  const exactIndex = PREFERRED_COMMON_NAMES.findIndex(
    (pref) => pref.toLowerCase() === lowerName,
  );
  if (exactIndex !== -1) {
    return 10 + exactIndex;
  }

  const partialIndex = PREFERRED_COMMON_NAMES.findIndex(
    (pref) =>
      lowerName.includes(pref.toLowerCase()) || pref.toLowerCase().includes(lowerName),
  );
  if (partialIndex !== -1) {
    return 50 + partialIndex;
  }

  return 100;
}

/**
 * Sorts categories prioritizing user-created categories first,
 * then common/frequent categories, then alphabetically.
 */
export function sortCategoriesByPriority<T extends PrioritizableCategory>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const scoreA = getCategoryPriorityScore(a);
    const scoreB = getCategoryPriorityScore(b);

    if (scoreA !== scoreB) {
      return scoreA - scoreB;
    }

    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });
}

