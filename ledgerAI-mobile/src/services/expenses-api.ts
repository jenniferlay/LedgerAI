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

const ErrorBodySchema = z.object({
  detail: z.union([z.string(), z.array(z.object({ msg: z.string() }))]),
});

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, '');
const REQUEST_TIMEOUT_MS = 15_000;

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

export async function createExpense(
  payload: ExpensePayload,
): Promise<z.infer<typeof ExpenseResponseSchema>> {
  if (!API_BASE_URL) {
    throw new Error('Set EXPO_PUBLIC_API_URL to the backend API address before saving expenses.');
  }

  const token = await getAccessToken();
  if (!token) {
    throw new Error('Your session has expired. Please sign in again.');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/expenses`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (error) {
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
    throw new Error('Your session has expired. Please sign in again.');
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

  const parsed = ExpenseResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error('The server returned an invalid expense response.');
  }

  return parsed.data;
}
