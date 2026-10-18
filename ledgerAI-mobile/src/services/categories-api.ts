import { z } from 'zod';
import { getAccessToken, invalidateSession } from '@/context/auth';

const CategoryResponseSchema = z.object({
  categoryid: z.number(),
  parent_categoryid: z.number().nullable(),
  name: z.string(),
  icon: z.string().nullable(),
});

export type CategoryResponse = z.infer<typeof CategoryResponseSchema>;

export interface CategoryPayload {
  name: string;
  parent_categoryid?: number | null;
  icon?: string | null;
}

const ErrorBodySchema = z.object({
  detail: z.union([z.string(), z.array(z.object({ msg: z.string() }))]),
});

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, '');
const REQUEST_TIMEOUT_MS = 15_000;
const CATEGORY_CACHE_TTL_MS = 45_000;
const SESSION_EXPIRED = 'Your session has expired. Please sign in again.';

let cachedCategories: CategoryResponse[] | null = null;
let categoriesCachedAt = 0;
let categoryCacheVersion = 0;
const categoryUpdateListeners = new Set<() => void>();

export function subscribeToCategoryUpdates(listener: () => void): () => void {
  categoryUpdateListeners.add(listener);
  return () => categoryUpdateListeners.delete(listener);
}

function invalidateCategoryCache(): void {
  categoryCacheVersion += 1;
  cachedCategories = null;
  categoriesCachedAt = 0;
  categoryUpdateListeners.forEach((listener) => listener());
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

export async function getCategories(): Promise<CategoryResponse[]> {
  const token = await requireAuth('loading categories');
  if (cachedCategories && Date.now() - categoriesCachedAt < CATEGORY_CACHE_TTL_MS) {
    return cachedCategories;
  }

  const items = await request('/categories', z.array(CategoryResponseSchema), { token });
  cachedCategories = items;
  categoriesCachedAt = Date.now();
  return items;
}

export async function createCategory(
  payload: CategoryPayload,
): Promise<CategoryResponse> {
  const token = await requireAuth('creating category');
  const category = await request('/categories', CategoryResponseSchema, {
    method: 'POST',
    body: payload,
    token,
  });
  invalidateCategoryCache();
  return category;
}
