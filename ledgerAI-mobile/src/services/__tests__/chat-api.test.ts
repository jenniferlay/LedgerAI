import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendChatMessage } from '../chat-api';

// Mock auth context
vi.mock('@/context/auth', () => ({
  getAccessToken: vi.fn().mockResolvedValue('test-token'),
}));

// Mock plaid-api
vi.mock('../plaid-api', () => ({
  getNetWorth: vi.fn().mockResolvedValue({ net_worth: 12500.5 }),
}));

// Mock expenses-api
vi.mock('../expenses-api', () => ({
  getExpenses: vi.fn().mockResolvedValue([
    { amount: 45.2, merchant: 'Trader Joe’s', spent_on: '2026-11-01' },
    { amount: 12.5, merchant: 'Starbucks', spent_on: '2026-11-02' },
  ]),
}));

// Mock budgets-api
vi.mock('../budgets-api', () => ({
  getBudgetsSummary: vi.fn().mockResolvedValue({
    total_budget: 1500,
    total_spent: 600,
    groups: [
      { id: 1, name: 'Groceries', limit: 500, spent: 300, icon: 'shopping-cart' },
      { id: 2, name: 'Dining Out', limit: 400, spent: 250, icon: 'restaurant' },
    ],
  }),
}));

describe('chat-api service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('answers net worth questions with live net worth data in fallback mode', async () => {
    const res = await sendChatMessage('What is my current net worth?');
    expect(res.response).toContain('$12,500.50');
    expect(res.actions).toBeDefined();
    expect(res.actions?.length).toBeGreaterThan(0);
  });

  it('answers spending questions with live expense records in fallback mode', async () => {
    const res = await sendChatMessage('How much did I spend this month?');
    expect(res.response).toContain('$57.70');
    expect(res.response).toContain('Trader Joe’s');
  });

  it('answers budget questions with live budget limits in fallback mode', async () => {
    const res = await sendChatMessage('How are my budgets looking?');
    expect(res.response).toContain('$1,500.00');
    expect(res.response).toContain('Groceries');
    expect(res.actions).toBeDefined();
  });

  it('provides a friendly greeting when greeted', async () => {
    const res = await sendChatMessage('Hello!');
    expect(res.response.toLowerCase()).toContain('marty');
    expect(res.actions).toBeDefined();
  });
});
