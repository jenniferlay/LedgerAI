import { z } from 'zod';
import { getAccessToken, invalidateSession } from '@/context/auth';

const SubBudgetResponseSchema = z.object({
  id: z.number(),
  budgetid: z.number(),
  name: z.string(),
  icon: z.string().nullable(),
  spent: z.number(),
  limit: z.number(),
});

const BudgetGroupResponseSchema = z.object({
  id: z.number(),
  budgetid: z.number().nullable(),
  name: z.string(),
  icon: z.string().nullable(),
  spent: z.number(),
  limit: z.number(),
  children: z.array(SubBudgetResponseSchema),
});

const BudgetSummaryResponseSchema = z.object({
  month: z.string(),
  total_budget: z.number(),
  total_spent: z.number(),
  total_remaining: z.number(),
  uncategorized_spent: z.number(),
  days_remaining: z.number(),
  groups: z.array(BudgetGroupResponseSchema),
});

export type SubBudget = z.infer<typeof SubBudgetResponseSchema>;
export type BudgetGroupData = z.infer<typeof BudgetGroupResponseSchema>;
export type BudgetSummary = z.infer<typeof BudgetSummaryResponseSchema>;

const ErrorBodySchema = z.object({
  detail: z.union([z.string(), z.array(z.object({ msg: z.string() }))]),
});

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, '');
const REQUEST_TIMEOUT_MS = 15_000;
const SESSION_EXPIRED = 'Your session has expired. Please sign in again.';

function getErrorMessage(body: unknown, status: number): string {
  const fallback = `The server returned an error (${status}).`;
  const parsed = ErrorBodySchema.safeParse(body);
  if (!parsed.success) {
    return fallback;
  }

  const { detail } = parsed.data;
  if (typeof detail === 'string') {
    return detail || fallback;
  }

  return detail.map((item) => item.msg).join(' ') || fallback;
}

export async function getBudgetsSummary(month?: string): Promise<BudgetSummary> {
  if (!API_BASE_URL) {
    throw new Error('Set EXPO_PUBLIC_API_URL to the backend API address before loading budgets.');
  }

  const token = await getAccessToken();
  if (!token) {
    throw new Error(SESSION_EXPIRED);
  }

  const url = month ? `/budgets?month=${encodeURIComponent(month)}` : '/budgets';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}${url}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('The request timed out. Check your connection and try again.');
      }
      throw new Error(
        'Could not reach the backend. Check EXPO_PUBLIC_API_URL and make sure the API is running.',
      );
    }

    if (response.status === 401) {
      await invalidateSession();
      throw new Error(SESSION_EXPIRED);
    }

    let json: unknown;
    try {
      json = await response.json();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('The request timed out. Check your connection and try again.');
      }
      throw new Error(`The server returned an invalid response (${response.status}).`);
    }

    if (!response.ok) {
      throw new Error(getErrorMessage(json, response.status));
    }

    const parsed = BudgetSummaryResponseSchema.safeParse(json);
    if (!parsed.success) {
      if (__DEV__) {
        console.error('BudgetSummaryResponse validation error:', parsed.error);
      }
      throw new Error('The server returned an invalid budget summary response.');
    }

    return parsed.data;
  } finally {
    clearTimeout(timeoutId);
  }
}