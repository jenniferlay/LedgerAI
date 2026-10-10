import { z } from 'zod';
import { getAccessToken, invalidateSession } from '@/context/auth';

const LinkTokenResponseSchema = z.object({
  link_token: z.string().min(1),
});

const PublicTokenExchangeResponseSchema = z.object({
  item_id: z.string().min(1),
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

async function postPlaid(path: string, body?: object): Promise<unknown> {
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
      method: 'POST',
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
  const json = await postPlaid('/plaid/link-token');

  const parsed = LinkTokenResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error('The server returned an invalid Link token response.');
  }

  return parsed.data;
}

export async function exchangePublicToken(
  publicToken: string,
): Promise<z.infer<typeof PublicTokenExchangeResponseSchema>> {
  const json = await postPlaid('/plaid/exchange', { public_token: publicToken });

  const parsed = PublicTokenExchangeResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error('The server returned an invalid Plaid exchange response.');
  }

  return parsed.data;
}
