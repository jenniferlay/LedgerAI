export const formatMoney = (n: number) => `$${n.toLocaleString('en-US')}`;

// Percent of limit, clamped 0-100
export const percent = (spent: number, limit: number) =>
  limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;