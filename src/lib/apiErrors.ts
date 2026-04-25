import type { TFunction } from 'i18next';

import { ApiError } from '@/lib/api';

/**
 * Co-builder API / MSW error codes mapped to i18n keys (apiErrors.coBuilder.*).
 * Keep in sync with {@link ../mocks/handlers/coBuilder.ts}.
 */
export const CO_BUILDER_API_ERROR_KEYS: Record<number, string> = {
  4001: 'apiErrors.coBuilder.loginRequired',
  5000: 'apiErrors.internal',
  4011: 'apiErrors.coBuilder.minPurchase',
  4012: 'apiErrors.coBuilder.maxPurchase',
  4013: 'apiErrors.coBuilder.stepMultiple',
  4014: 'apiErrors.coBuilder.orderParams',
  4015: 'apiErrors.coBuilder.orderNoRequired',
  4041: 'apiErrors.coBuilder.orderNotFound',
  4042: 'apiErrors.coBuilder.workNotFound',
  4016: 'apiErrors.coBuilder.claimAmount',
  4020: 'apiErrors.coBuilder.claimExceeds',
  4017: 'apiErrors.coBuilder.addressInvalid',
};

/**
 * Resolves a thrown {@link ApiError} to a user-facing string in the current locale.
 * Unknown codes fall back to {@link ApiError#msg} (should be non-localized in production).
 */
export function translateCoBuilderApiError(
  e: unknown,
  t: TFunction,
  networkFallbackKey = 'common.networkError',
): string {
  if (e instanceof ApiError) {
    const k = CO_BUILDER_API_ERROR_KEYS[e.code];
    if (k) return t(k);
    if (e.msg) return e.msg;
  }
  return t(networkFallbackKey);
}
