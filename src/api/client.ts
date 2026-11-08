const fallbackBaseUrl = import.meta.env.PROD
  ? '/api/v1'
  : 'http://localhost:8081/api/v1';

export const apiBaseUrl = (
  import.meta.env.VITE_PS_MOBILE_API_BASE_URL || fallbackBaseUrl
).replace(/\/+$/, '');

const ACCESS_TOKEN_KEY = 'ps_mobile_admin_access_token';
const REFRESH_TOKEN_KEY = 'ps_mobile_admin_refresh_token';

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  expires_in: number;
}

export interface LoginChallenge {
  challenge_id: string;
  expires_in_secs: number;
  channel: 'email' | 'sms';
  debug_code?: string;
}

export class SessionChallengeRequiredError extends Error {
  constructor(public readonly challenge: LoginChallenge) {
    super('A sessão precisa de uma nova verificação de dois fatores.');
    this.name = 'SessionChallengeRequiredError';
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function isLoginChallenge(value: unknown): value is LoginChallenge {
  return typeof value === 'object' && value !== null && 'challenge_id' in value;
}

export function readAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

function readRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function readRefreshTokenForLogout(): string | null {
  return readRefreshToken();
}

export function saveTokens(tokens: TokenResponse): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

async function errorFromResponse(response: Response): Promise<ApiError> {
  let message = `${response.status} ${response.statusText}`;
  try {
    const body: unknown = await response.json();
    if (typeof body === 'object' && body !== null) {
      const record = body as Record<string, unknown>;
      if (typeof record.message === 'string') message = record.message;
      else if (typeof record.code === 'string') message = record.code;
      else if (typeof record.error === 'string') message = record.error;
    }
  } catch {
    // Keep the HTTP status when the server does not return JSON.
  }
  return new ApiError(message, response.status);
}

async function send(
  path: string,
  options: RequestInit,
  body?: unknown,
  authenticated = true,
): Promise<Response> {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (body !== undefined) headers.set('Content-Type', 'application/json');
  if (authenticated) {
    const token = readAccessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) throw await errorFromResponse(response);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

async function renewSession(): Promise<boolean> {
  const refreshToken = readRefreshToken();
  if (!refreshToken) return false;

  const response = await fetch(`${apiBaseUrl}/auth/refresh`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (response.status === 202) {
    const challenge = await response.json() as LoginChallenge;
    clearTokens();
    window.dispatchEvent(new CustomEvent<LoginChallenge>(
      'ps-mobile:auth-challenge',
      { detail: challenge },
    ));
    throw new SessionChallengeRequiredError(challenge);
  }

  if (!response.ok) {
    clearTokens();
    return false;
  }

  saveTokens(await response.json() as TokenResponse);
  return true;
}

export async function request<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    authenticated?: boolean;
    retry?: boolean;
  } = {},
): Promise<T> {
  const {
    method = 'GET',
    body,
    authenticated = true,
    retry = true,
  } = options;
  let response = await send(path, { method }, body, authenticated);
  if (response.status === 401 && authenticated && retry && await renewSession()) {
    response = await send(path, { method }, body, authenticated);
  }
  return parseResponse<T>(response);
}

export async function logout(refreshToken: string): Promise<void> {
  await request<void>('/auth/logout', {
    method: 'POST',
    body: { refresh_token: refreshToken },
    retry: false,
  });
}
