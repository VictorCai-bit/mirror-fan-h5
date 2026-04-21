import type { ApiResponse } from '@/types/api';

export function jsonOk<T>(data: T): ApiResponse<T> {
  return { code: 0, msg: 'success', data };
}

export function jsonErr(code: number, msg: string) {
  return { code, msg, data: null as null };
}

export async function mockDelay(): Promise<void> {
  const ms = 300 + Math.floor(Math.random() * 400);
  await new Promise((r) => setTimeout(r, ms));
}

export function shouldInject500(request: Request): boolean {
  return request.headers.get('x-mock-always-500') === '1';
}

export function getMockUid(request: Request): string | null {
  return request.headers.get('x-mock-uid');
}

export function getMockRole(request: Request): 'investor' | 'admin' {
  const r = request.headers.get('x-mock-role');
  return r === 'admin' ? 'admin' : 'investor';
}

export function getCreatorOf(request: Request): number[] {
  try {
    const raw = request.headers.get('x-mock-creator-of');
    if (!raw) return [];
    return JSON.parse(raw) as number[];
  } catch {
    return [];
  }
}
