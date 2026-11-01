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

export const BudgetResponseSchema = z.object({
  budgetid: z.number(),
  categoryid: z.number(),
  parent_categoryid: z.number().nullable(),
  name: z.string(),
  icon: z.string().nullable(),
  amount: z.number(),
  spent: z.number(),
  remaining: z.number(),
});

const DeleteResponseSchema = z.object({
  message: z.string(),
});

export type SubBudget = z.infer<typeof SubBudgetResponseSchema>;
export type BudgetGroupData = z.infer<typeof BudgetGroupResponseSchema>;
export type BudgetSummary = z.infer<typeof BudgetSummaryResponseSchema>;
export type BudgetResponse = z.infer<typeof BudgetResponseSchema>;

export interface CreateBudgetPayload {
  categoryid: number;
  amount: number;
}

export interface UpdateBudgetPayload {
  amount: number;
}

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

async function budgetRequest<T>(
  path: string,
  schema: z.ZodType<T>,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error('Set EXPO_PUBLIC_API_URL to the backend API address before calling budgets.');
  }

  const token = await getAccessToken();
  if (!token) {
    throw new Error(SESSION_EXPIRED);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}${path}`, {
        method: options.method ?? 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          ...(options.body !== undefined && { 'Content-Type': 'application/json' }),
          Accept: 'application/json',
        },
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
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
    } catch {
      throw new Error(`The server returned an invalid response (${response.status}).`);
    }

    if (!response.ok) {
      throw new Error(getErrorMessage(json, response.status));
    }

    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      if (__DEV__) {
        console.error('Budget API validation error:', parsed.error);
      }
      throw new Error('The server returned an invalid budget response.');
    }

    return parsed.data;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function getBudgetsSummary(month?: string): Promise<BudgetSummary> {
  const url = month ? `/budgets?month=${encodeURIComponent(month)}` : '/budgets';
  return budgetRequest(url, BudgetSummaryResponseSchema);
}

export async function createBudget(payload: CreateBudgetPayload): Promise<BudgetResponse> {
  return budgetRequest('/budgets', BudgetResponseSchema, {
    method: 'POST',
    body: payload,
  });
}

export async function updateBudget(
  budgetid: number,
  payload: UpdateBudgetPayload,
): Promise<BudgetResponse> {
  return budgetRequest(`/budgets/${budgetid}`, BudgetResponseSchema, {
    method: 'PUT',
    body: payload,
  });
}

export async function deleteBudget(budgetid: number): Promise<{ message: string }> {
  return budgetRequest(`/budgets/${budgetid}`, DeleteResponseSchema, {
    method: 'DELETE',
  });
}
