import { z } from 'zod';

const SignupResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
});

const LoginResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number(),
});

const ErrorBodySchema = z.object({
  detail: z.union([z.string(), z.array(z.object({ msg: z.string() }))]),
});

export type SignupResponse = z.infer<typeof SignupResponseSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, '');
const REQUEST_TIMEOUT_MS = 15_000;

function getApiUrl(path: string): string {
  if (!API_BASE_URL) {
    throw new Error('Set EXPO_PUBLIC_API_URL to the backend API address before signing in.');
  }

  return `${API_BASE_URL}${path}`;
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

async function postJson<T>(
  path: string,
  body: Record<string, string>,
  schema: z.ZodType<T>,
  invalidResponseMessage: string,
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(getApiUrl(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Set EXPO_PUBLIC_API_URL')) {
      throw error;
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
    throw new Error(invalidResponseMessage);
  }

  return parsed.data;
}

export function signUp(
  email: string,
  username: string,
  password: string,
): Promise<SignupResponse> {
  return postJson(
    '/auth/signup',
    { email, username, password },
    SignupResponseSchema,
    'The server returned an invalid signup response.',
  );
}

export function logIn(email: string, password: string): Promise<LoginResponse> {
  return postJson(
    '/auth/login',
    { email, password },
    LoginResponseSchema,
    'The server returned an invalid login response.',
  );
}