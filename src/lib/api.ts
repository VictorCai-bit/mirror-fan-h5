import type { ApiResponse } from '@/types/api';

const BASE = '/arts';

export class ApiError extends Error {
  code: number;
  msg: string;

  constructor(code: number, msg: string) {
    super(msg);
    this.code = code;
    this.msg = msg;
    this.name = 'ApiError';
  }
}

function readPersisted<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: T };
    return parsed.state ?? null;
  } catch {
    return null;
  }
}

export function buildMockHeaders(): HeadersInit {
  const user = readPersisted<{
    uid: string | null;
    mockRole: 'investor' | 'admin';
    creator_of: number[];
    wallet_address: string | null;
    usdt_raw?: string;
    ent_raw?: string;
  }>('mirror-user');
  const ui = readPersisted<{ always500?: boolean }>('mirror-ui');
  const h: Record<string, string> = {};
  if (user?.uid) h['x-mock-uid'] = user.uid;
  if (user?.mockRole) h['x-mock-role'] = user.mockRole;
  h['x-mock-creator-of'] = JSON.stringify(user?.creator_of ?? []);
  if (user?.wallet_address) h['x-mock-wallet'] = user.wallet_address;
  if (user?.usdt_raw) h['x-mock-usdt-raw'] = user.usdt_raw;
  if (user?.ent_raw) h['x-mock-ent-raw'] = user.ent_raw;
  if (ui?.always500) h['x-mock-always-500'] = '1';
  return h;
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { skipMockHeaders?: boolean },
): Promise<T> {
  const { skipMockHeaders, ...rest } = init ?? {};
  const headers = new Headers(rest.headers);
  if (!skipMockHeaders) {
    const mockH = buildMockHeaders();
    Object.entries(mockH).forEach(([k, v]) => headers.set(k, v));
  }
  const res = await fetch(`${BASE}${path}`, { ...rest, headers });
  const json = (await res.json()) as ApiResponse<T>;
  if (json.code !== 0) {
    throw new ApiError(json.code, json.msg);
  }
  return json.data;
}
