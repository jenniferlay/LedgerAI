import { z } from 'zod';
import { getAccessToken, invalidateSession } from '@/context/auth';

const LinkTokenResponseSchema = z.object({
  link_token: z.string().min(1),
});

const SyncSummarySchema = z.object({
  accounts_imported: z.number().default(0),
  transactions_added: z.number().default(0),
  transactions_updated: z.number().default(0),
  transactions_removed: z.number().default(0),
  status: z.enum(['success', 'already_syncing', 'not_found', 'requires_reauth', 'ignored', 'failed']),
  failure_reason: z.string().nullable().optional(),
});

const PublicTokenExchangeResponseSchema = z.object({
  item_id: z.string().min(1),
  sync_summary: SyncSummarySchema.optional(),
});

export const PlaidAccountSchema = z.object({
  id: z.number(),
  item_id: z.string(),
  account_id: z.string(),
  name: z.string(),
  official_name: z.string().nullable().optional(),
  type: z.string(),
  subtype: z.string().nullable().optional(),
  mask: z.string().nullable().optional(),
  current_balance: z.number().nullable().optional(),
  available_balance: z.number().nullable().optional(),
  credit_limit: z.number().nullable().optional(),
  iso_currency_code: z.string().nullable().optional(),
  is_active: z.boolean(),
});

export type PlaidAccount = z.infer<typeof PlaidAccountSchema>;

export const NetWorthSchema = z.object({
  net_worth: z.number(),
  total_assets: z.number(),
  total_liabilities: z.number(),
  depository_total: z.number(),
  credit_total: z.number(),
  manual_cash: z.number().default(0),
  currency: z.string().default('USD'),
  account_count: z.number(),
});

export type NetWorth = z.infer<typeof NetWorthSchema>;

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

async function requestPlaid(path: string, method = 'GET', body?: object): Promise<unknown> {
  if (!API_BASE_URL) {
    throw new Error('Set EXPO_PUBLIC_API_URL to the backend API address before connecting a bank.');
  }

  const token = await getAccessToken();
  if (!token) {
    throw new Error('Your session has expired. Please sign in again.');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
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

  return json;
}

export async function createLinkToken(): Promise<z.infer<typeof LinkTokenResponseSchema>> {
  const json = await requestPlaid('/plaid/link-token', 'POST');
  const parsed = LinkTokenResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error('The server returned an invalid Link token response.');
  }
  return parsed.data;
}

export async function exchangePublicToken(
  publicToken: string,
): Promise<z.infer<typeof PublicTokenExchangeResponseSchema>> {
  const json = await requestPlaid('/plaid/exchange', 'POST', { public_token: publicToken });
  const parsed = PublicTokenExchangeResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error('The server returned an invalid Plaid exchange response.');
  }
  return parsed.data;
}

export async function getAccounts(): Promise<PlaidAccount[]> {
  const json = await requestPlaid('/plaid/accounts', 'GET');
  const parsed = z.array(PlaidAccountSchema).safeParse(json);
  if (!parsed.success) {
    throw new Error('The server returned invalid account data.');
  }
  return parsed.data;
}

export async function getNetWorth(): Promise<NetWorth> {
  const json = await requestPlaid('/plaid/accounts/net-worth', 'GET');
  const parsed = NetWorthSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error('The server returned invalid net worth data.');
  }
  return parsed.data;
}

export async function updateAccountStatus(
  accountId: string,
  isActive: boolean,
): Promise<PlaidAccount> {
  const json = await requestPlaid(`/plaid/accounts/${encodeURIComponent(accountId)}`, 'PATCH', {
    is_active: isActive,
  });
  const parsed = PlaidAccountSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error('The server returned invalid account update data.');
  }
  return parsed.data;
}

export async function disconnectItem(itemId: string): Promise<void> {
  await requestPlaid(`/plaid/items/${encodeURIComponent(itemId)}`, 'DELETE');
}
