import { z } from 'zod';
import { getAccessToken, invalidateSession } from '@/context/auth';
import type { ExpensePayload } from '@/components/expenses/add-expense/types';

const ExpenseResponseSchema = z.object({
  expenseid: z.number(),
  categoryid: z.number().nullable(),
  amount_dollars: z.number(),
  amount_cents: z.number(),
  note: z.string(),
  merchant: z.string().nullable(),
  spent_on: z.string(),
});

const ExpenseFeedItemSchema = z.discriminatedUnion('source', [
  z.object({
    source: z.literal('manual'),
    id: z.number(),
    amount: z.number(),
    spent_on: z.string(),
    merchant: z.string().nullable(),
    description: z.string(),
    categoryid: z.number().nullable(),
  }),
  z.object({
    source: z.literal('plaid'),
    id: z.number(),
    amount: z.number(),
    spent_on: z.string(),
    merchant: z.string().nullable(),
    description: z.string(),
    transaction_id: z.string(),
    account_id: z.string(),
    pending: z.boolean(),
    currency: z.string().nullable(),
  }),
]);

export type ExpenseFeedItem = z.infer<typeof ExpenseFeedItemSchema>;

const ErrorBodySchema = z.object({
  detail: z.union([z.string(), z.array(z.object({ msg: z.string() }))]),
});

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, '');
const REQUEST_TIMEOUT_MS = 15_000;
const EXPENSE_CACHE_TTL_MS = 45_000;
const SESSION_EXPIRED = 'Your session has expired. Please sign in again.';
const expenseCache = new Map<string, { items: ExpenseFeedItem[]; cachedAt: number }>();
const pendingExpenseRequests = new Map<string, Promise<ExpenseFeedItem[]>>();
let expenseCacheVersion = 0;
const expenseUpdateListeners = new Set<() => void>();

export function subscribeToExpenseUpdates(listener: () => void): () => void {
  expenseUpdateListeners.add(listener);
  return () => expenseUpdateListeners.delete(listener);
}

function invalidateExpenseCache(): void {
  expenseCacheVersion += 1;
  expenseCache.clear();
  pendingExpenseRequests.clear();
  expenseUpdateListeners.forEach((listener) => listener());
}

async function requireAuth(action: string): Promise<string> {
  if (!API_BASE_URL) {
    throw new Error(`Set EXPO_PUBLIC_API_URL to the backend API address before ${action}.`);
  }
  const token = await getAccessToken();
  if (!token) {
    throw new Error(SESSION_EXPIRED);
  }
  return token;
}

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

async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  options: { method?: string; body?: unknown; token: string },
): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error('The backend API address is not configured.');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        Authorization: `Bearer ${options.token}`,
        ...(options.body !== undefined && { 'Content-Type': 'application/json' }),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    if (__DEV__) {
      console.warn(error);
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('The request timed out. Check your connection and try again.');
    }
    throw new Error(
      'Could not reach the backend. Check EXPO_PUBLIC_API_URL and make sure the API is running.',
    );
  } finally {
    clearTimeout(timeoutId);
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
    throw new Error('The server returned an invalid response.');
  }
  return parsed.data;
}

export async function getExpenses(limit = 4): Promise<ExpenseFeedItem[]> {
  const token = await requireAuth('loading expenses');
  const cacheKey = JSON.stringify([token, limit]);
  const cached = expenseCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < EXPENSE_CACHE_TTL_MS) {
    return cached.items;
  }
  if (cached) {
    expenseCache.delete(cacheKey);
  }
  const pendingRequest = pendingExpenseRequests.get(cacheKey);
  if (pendingRequest) {
    return pendingRequest;
  }

  const cacheVersion = expenseCacheVersion;
  const promise = request(
    `/expenses?limit=${encodeURIComponent(String(limit))}`,
    z.array(ExpenseFeedItemSchema),
    { token },
  ).then((items) => {
    if (cacheVersion === expenseCacheVersion) {
      expenseCache.set(cacheKey, { items, cachedAt: Date.now() });
    }
    return items;
  });
  pendingExpenseRequests.set(cacheKey, promise);

  try {
    return await promise;
  } finally {
    if (pendingExpenseRequests.get(cacheKey) === promise) {
      pendingExpenseRequests.delete(cacheKey);
    }
  }
}

export async function createExpense(
  payload: ExpensePayload,
): Promise<z.infer<typeof ExpenseResponseSchema>> {
  const token = await requireAuth('saving expenses');
  const expense = await request('/expenses', ExpenseResponseSchema, {
    method: 'POST',
    body: payload,
    token,
  });
  invalidateExpenseCache();
  return expense;
}
