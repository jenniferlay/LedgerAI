export type SubBudget = {
  id: string;
  name: string;
  spent: number;
  limit: number;
  /** Optional bar color override (defaults to primary) */
  barColor?: 'primary' | 'secondary';
};

export type BudgetGroupData = {
  id: string;
  name: string;
  /** MaterialIcons name */
  icon: 'restaurant' | 'home' | 'devices';
  children: SubBudget[];
};

export const daysRemaining = 11;

export const budgetGroups: BudgetGroupData[] = [
  {
    id: 'food',
    name: 'Food & Dining',
    icon: 'restaurant',
    children: [
      { id: 'groceries', name: 'Groceries', spent: 540, limit: 700 },
      { id: 'dining-out', name: 'Dining Out', spent: 300, limit: 500},
    ],
  },
  {
    id: 'housing',
    name: 'Housing & Living',
    icon: 'home',
    children: [
      { id: 'rent', name: 'Rent & Utilities', spent: 1050, limit: 1050, barColor: 'secondary' },
      { id: 'home-supplies', name: 'Home Supplies', spent: 100, limit: 150 },
    ],
  },
  {
    id: 'tech',
    name: 'Entertainment & Tech',
    icon: 'devices',
    children: [
      { id: 'subscriptions', name: 'Subscriptions', spent: 60, limit: 100 },
      { id: 'gadgets', name: 'Gadgets & Gear', spent: 400, limit: 700 },
    ],
  },
];