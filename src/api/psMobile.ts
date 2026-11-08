import {
  request,
  type LoginChallenge,
  type TokenResponse,
} from './client';

export type Page<T> = {
  items: T[];
  page: number;
  per_page: number;
  total: number;
};

export type UserProfile = {
  id: string;
  email: string | null;
  phone: string | null;
  full_name: string;
  is_admin: boolean;
};

export type AdminOverview = {
  users: number;
  active_users: number;
  workspaces: number;
  active_workspaces: number;
  active_subscriptions: number;
  revenue_cents: number;
  outstanding_cents: number;
  sales_30d: number;
};

export type AdminUser = {
  id: string;
  email: string | null;
  phone: string | null;
  full_name: string;
  is_admin: boolean;
  is_active: boolean;
  created_at: string;
  workspace_count: number;
};

export type AdminWorkspace = {
  id: string;
  name: string;
  owner_id: string;
  owner_email: string | null;
  is_active: boolean;
  trial_ends_at: string;
  created_at: string;
  member_count: number;
  plan_code: string | null;
  subscription_status: string | null;
  current_period_end: string | null;
};

export type AdminPlan = {
  code: string;
  name: string;
  description: string | null;
  kind: string;
  price_cents: number;
  currency: string;
  usage_percent_bps: number;
  trial_days: number;
  features: unknown;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type AdminPayment = {
  id: string;
  workspace_id: string;
  charge_id: string | null;
  provider: string;
  payer_phone: string | null;
  provider_ref: string | null;
  amount_cents: number;
  currency: string;
  status: string;
  external_url: string | null;
  metadata: unknown;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
};

export type Charge = {
  id: string;
  workspace_id: string;
  subscription_id: string | null;
  kind: string;
  plan_code: string | null;
  description: string;
  amount_cents: number;
  currency: string;
  status: string;
  period_start: string | null;
  period_end: string | null;
  due_at: string | null;
  paid_at: string | null;
  created_at: string;
};

export function login(email: string, password: string) {
  return request<TokenResponse | LoginChallenge>('/auth/login', {
    method: 'POST',
    authenticated: false,
    body: { email, password },
  });
}

export function verifyLogin(challengeId: string, code: string) {
  return request<TokenResponse>('/auth/login/verify', {
    method: 'POST',
    authenticated: false,
    body: { challenge_id: challengeId, code },
  });
}

export function logout(refreshToken: string) {
  return request<void>('/auth/logout', {
    method: 'POST',
    body: { refresh_token: refreshToken },
    retry: false,
  });
}

export function getMe() {
  return request<UserProfile>('/auth/me');
}

export function getAdminOverview() {
  return request<AdminOverview>('/admin/overview');
}

export function listAdminUsers(q = '') {
  const search = new URLSearchParams({ per_page: '100' });
  if (q.trim()) search.set('q', q.trim());
  return request<Page<AdminUser>>(`/admin/users?${search}`);
}

export function updateAdminUser(
  id: string,
  input: Partial<Pick<AdminUser, 'is_active' | 'is_admin'>>,
) {
  return request<AdminUser>(`/admin/users/${id}`, { method: 'PATCH', body: input });
}

export function listAdminWorkspaces(q = '') {
  const search = new URLSearchParams({ per_page: '100' });
  if (q.trim()) search.set('q', q.trim());
  return request<Page<AdminWorkspace>>(`/admin/workspaces?${search}`);
}

export function updateAdminWorkspace(
  id: string,
  input: { is_active?: boolean; trial_days?: number; plan_code?: string; period_days?: number },
) {
  return request<AdminWorkspace>(`/admin/workspaces/${id}`, { method: 'PATCH', body: input });
}

export function listAdminPlans() {
  return request<AdminPlan[]>('/admin/plans');
}

export function updateAdminPlan(
  code: string,
  input: Partial<Pick<AdminPlan, 'name' | 'description' | 'price_cents' | 'usage_percent_bps' | 'is_active' | 'sort_order'>>,
) {
  return request<AdminPlan>(`/admin/plans/${encodeURIComponent(code)}`, { method: 'PATCH', body: input });
}

export function listAdminPayments() {
  return request<Page<AdminPayment>>('/admin/payments?per_page=100');
}

export function listAdminCharges() {
  return request<Page<Charge>>('/admin/charges?per_page=100');
}
