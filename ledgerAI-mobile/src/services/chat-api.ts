import { z } from 'zod';
import { getAccessToken } from '@/context/auth';
import { getNetWorth } from './plaid-api';
import { getExpenses } from './expenses-api';
import { getBudgetsSummary } from './budgets-api';
import type { ChatApiResponse } from '@/components/chat/types';

const ChatResponseSchema = z.object({
  response: z.string(),
  actions: z
    .array(
      z.object({
        label: z.string(),
        action: z.enum(['navigate', 'send']),
        target: z.string(),
      }),
    )
    .optional(),
});

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, '');
const REQUEST_TIMEOUT_MS = 25_000;

interface HistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Format currency nicely.
 */
function formatMoney(amount: number): string {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Intelligent local fallback when the remote chat service is offline or unconfigured.
 * Queries live local financial endpoints so the user still gets accurate, real numbers!
 */
async function generateLocalFallbackResponse(message: string): Promise<ChatApiResponse> {
  const lower = message.toLowerCase();

  // Net worth query
  if (lower.includes('net worth') || lower.includes('balance') || lower.includes('how much money do i have')) {
    try {
      const nw = await getNetWorth();
      const formatted = formatMoney(nw.net_worth);
      return {
        response: `Your total net worth right now is ${formatted} across all linked accounts. Checking accounts are available for everyday expenses, while savings give you a safety buffer.`,
        actions: [
          { label: 'View Spending', action: 'navigate', target: '/(app)/(home)' },
          { label: 'View Budgets', action: 'navigate', target: '/(app)/budgets' },
        ],
      };
    } catch {
      return {
        response: "I couldn't reach your bank accounts at the moment. Try linking your bank or checking back in a moment.",
      };
    }
  }

  // Budget query
  if (lower.includes('budget') || lower.includes('limit') || lower.includes('allowance')) {
    try {
      const summary = await getBudgetsSummary();
      const totalBudget = summary.total_budget;
      const totalSpent = summary.total_spent;
      const remaining = totalBudget - totalSpent;

      if (summary.groups.length === 0) {
        return {
          response: "You haven't set up any monthly budgets yet! Setting target limits for categories like Dining Out, Groceries, or Shopping helps you stay in control of your cash flow.",
          actions: [{ label: 'Set Up Budgets', action: 'navigate', target: '/(app)/budgets' }],
        };
      }

      let responseText = `You have budgeted ${formatMoney(totalBudget)} this month and spent ${formatMoney(totalSpent)}, leaving you with ${formatMoney(remaining > 0 ? remaining : 0)} remaining overall.`;

      // Find top categories
      const activeGroups = summary.groups.filter((g) => g.spent > 0).slice(0, 3);
      if (activeGroups.length > 0) {
        responseText += '\n\nTop categories this month:';
        for (const g of activeGroups) {
          responseText += `\n• ${g.name}: spent ${formatMoney(g.spent)} of ${formatMoney(g.limit)}`;
        }
      }

      return {
        response: responseText,
        actions: [{ label: 'Manage Budgets', action: 'navigate', target: '/(app)/budgets' }],
      };
    } catch {
      return {
        response: "I couldn't load your budgets right now. Head over to the Budgets tab to review or create monthly limits.",
        actions: [{ label: 'Go to Budgets', action: 'navigate', target: '/(app)/budgets' }],
      };
    }
  }

  // Spending / Expense query
  if (lower.includes('spent') || lower.includes('spend') || lower.includes('expense') || lower.includes('transaction')) {
    try {
      const expenses = await getExpenses();
      if (!expenses || expenses.length === 0) {
        return {
          response: "You have no recorded expenses for this period yet. You can log manual cash expenses or link your bank accounts through Plaid on the Home tab.",
          actions: [{ label: 'Log Expense', action: 'navigate', target: '/(app)/add-expense' }],
        };
      }

      const total = expenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);
      const recent = expenses.slice(0, 3);

      let text = `You have spent ${formatMoney(total)} across ${expenses.length} recent transactions.`;
      if (recent.length > 0) {
        text += '\n\nMost recent activity:';
        for (const item of recent) {
          const name = item.merchant || item.description || 'Expense';
          text += `\n• ${name}: ${formatMoney(item.amount)}`;
        }
      }

      return {
        response: text,
        actions: [
          { label: 'View All Activity', action: 'navigate', target: '/(app)/(home)' },
          { label: 'Add Cash Expense', action: 'navigate', target: '/(app)/add-expense' },
        ],
      };
    } catch {
      return {
        response: "I couldn't fetch your latest expenses right now. Check your internet connection or review them directly on the Home tab.",
      };
    }
  }

  // Greeting / Introduction
  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey') || lower.includes('who are you')) {
    return {
      response: "Hey there! I'm Marty, your financial advisor. I'm here to help you stay on top of your money without the stress. Ask me about your current net worth, how much you've spent this month, or how your category budgets are tracking.",
      actions: [
        { label: 'Check Net Worth', action: 'send', target: 'What is my current net worth?' },
        { label: 'Check Spending', action: 'send', target: 'How much did I spend this month?' },
        { label: 'Check Budgets', action: 'send', target: 'How are my budgets looking?' },
      ],
    };
  }

  // Savings / Advice query
  if (lower.includes('save') || lower.includes('tip') || lower.includes('advice') || lower.includes('afford')) {
    return {
      response: "A solid rule of thumb is the 50/30/20 framework: 50% for needs, 30% for wants, and 20% for savings or paying down debt. Keeping your discretionary spending under monthly budget limits is the single most effective way to grow your savings buffer.",
      actions: [
        { label: 'Check Budgets', action: 'navigate', target: '/(app)/budgets' },
        { label: 'View Spending', action: 'navigate', target: '/(app)/(home)' },
      ],
    };
  }

  // Default helpful response
  return {
    response: "I'm keeping an eye on your finances. You can ask me how much you've spent this month, what your net worth is, or how your budget limits are doing.",
    actions: [
      { label: 'Total Spending', action: 'send', target: 'How much have I spent?' },
      { label: 'Budget Status', action: 'send', target: 'How are my budgets looking?' },
      { label: 'Net Worth', action: 'send', target: "What's my net worth?" },
    ],
  };
}

/**
 * Send a message to Marty the AI Financial Advisor.
 */
export async function sendChatMessage(
  message: string,
  history: HistoryItem[] = [],
): Promise<ChatApiResponse> {
  const token = await getAccessToken();

  if (API_BASE_URL) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message,
          history,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const json = await response.json();
        const parsed = ChatResponseSchema.safeParse(json);
        if (parsed.success) {
          return parsed.data;
        }
      }
    } catch {
      // Backend /chat is either offline, returned non-200, or timed out.
      // Fall through to live financial fallback.
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // Fallback to intelligent local financial analysis
  return generateLocalFallbackResponse(message);
}
