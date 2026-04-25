import { http, HttpResponse } from 'msw';
import { nanoid } from 'nanoid';
import {
  bumpSoldTotal,
  calcUnitPrice,
  communityFor,
  DEFAULT_PLATFORM_CONTRIBUTION,
  firstYearReleasePct,
  getCoBuilderState,
  getFloatRule,
  getInvitedWorks,
  getNextThreshold,
  getOrder,
  getTiers,
  inferLevel,
  memberSummaryFor,
  patchOrder,
  poolSize,
  pushClaim,
  pushOrder,
  setLevelOverride,
} from '@/mocks/db/coBuilder';
import { getMockUid, jsonOk, mockDelay, shouldInject500 } from '@/mocks/utils';
import type {
  CoBuilderClaimResult,
  CoBuilderClaimType,
  CoBuilderOrder,
  MemberLevel,
} from '@/types/coBuilder';

const BASE = '/arts';

function err500() {
  return HttpResponse.json({ code: 5000, msg: 'Internal error', data: null });
}

function notLogin() {
  return HttpResponse.json({ code: 4001, msg: 'Login required', data: null });
}

function levelByQuantity(quantity: number, unitPrice: number): Exclude<MemberLevel, 'none'> {
  // 与 mock 推断保持一致：购买总额映射到对应等级
  const total = quantity * unitPrice;
  if (total >= 50_000) return 'global';
  if (total >= 5_000) return 'ecosystem';
  if (total >= 1_000) return 'regional';
  if (total >= 300) return 'active';
  return 'base';
}

export const coBuilderHandlers = [
  http.get(`${BASE}/co-builder/index`, async ({ request }) => {
    await mockDelay();
    if (shouldInject500(request)) return err500();
    const s = getCoBuilderState();
    const unitPrice = calcUnitPrice(s.sold_total);
    return HttpResponse.json(
      jsonOk({
        pool_total: poolSize(),
        first_year_release_pct: firstYearReleasePct(),
        first_year_release: poolSize() * firstYearReleasePct(),
        total_contribution_platform: DEFAULT_PLATFORM_CONTRIBUTION,
        weights: { base: 0.6, floating: 0.3, identity: 0.1 },
        unit_price: unitPrice,
        sold_total: s.sold_total,
        next_threshold_at: getNextThreshold(s.sold_total),
        step_increase_pct: 0.01,
        threshold_step: 150_000,
        tiers: getTiers(),
      }),
    );
  }),

  http.get(`${BASE}/co-builder/price/live`, async ({ request }) => {
    await mockDelay();
    if (shouldInject500(request)) return err500();
    const s = getCoBuilderState();
    return HttpResponse.json(
      jsonOk({
        unit_price: calcUnitPrice(s.sold_total),
        sold_total: s.sold_total,
        next_threshold_at: getNextThreshold(s.sold_total),
        step_increase_pct: 0.01,
        threshold_step: 150_000,
      }),
    );
  }),

  http.post(`${BASE}/co-builder/order/pre`, async ({ request }) => {
    await mockDelay();
    if (shouldInject500(request)) return err500();
    const uid = getMockUid(request);
    if (!uid) return notLogin();
    const body = (await request.json()) as { quantity: number };
    const quantity = Number(body.quantity ?? 0);
    if (!Number.isFinite(quantity) || quantity < 100) {
      return HttpResponse.json({ code: 4011, msg: 'Min 100A', data: null });
    }
    if (quantity > 885_000) {
      return HttpResponse.json({ code: 4012, msg: 'Max 885000A', data: null });
    }
    if (quantity % 100 !== 0) {
      return HttpResponse.json({ code: 4013, msg: 'Multiple of 100A', data: null });
    }
    const s = getCoBuilderState();
    const unitPrice = calcUnitPrice(s.sold_total);
    const orderNo = `ORD-${nanoid(8).toUpperCase()}`;
    const lockExpiresAt = Math.floor(Date.now() / 1000) + 60;
    const total = Math.round(quantity * unitPrice * 100) / 100;
    return HttpResponse.json(
      jsonOk({
        order_no: orderNo,
        quantity,
        lock_price: unitPrice,
        lock_expires_at: lockExpiresAt,
        total_amount: total,
      }),
    );
  }),

  http.post(`${BASE}/co-builder/order/confirm`, async ({ request }) => {
    await mockDelay();
    if (shouldInject500(request)) return err500();
    const uid = getMockUid(request);
    if (!uid) return notLogin();
    const body = (await request.json()) as {
      order_no: string;
      quantity: number;
      lock_price: number;
    };
    const quantity = Number(body.quantity ?? 0);
    const lockPrice = Number(body.lock_price ?? 0);
    if (quantity <= 0 || lockPrice <= 0) {
      return HttpResponse.json({ code: 4014, msg: 'Bad order params', data: null });
    }
    const total = Math.round(quantity * lockPrice * 100) / 100;
    const order: CoBuilderOrder = {
      order_no: body.order_no,
      uid,
      level: levelByQuantity(quantity, lockPrice),
      quantity,
      unit_price: lockPrice,
      total_amount: total,
      status: 'paid',
      tx_hash: `0x${nanoid(40).toLowerCase()}`,
      created_at: Math.floor(Date.now() / 1000),
      paid_at: Math.floor(Date.now() / 1000),
    };
    pushOrder(order);
    bumpSoldTotal(quantity);
    return HttpResponse.json(jsonOk(order));
  }),

  http.get(`${BASE}/co-builder/order/query`, async ({ request }) => {
    await mockDelay();
    if (shouldInject500(request)) return err500();
    const uid = getMockUid(request);
    if (!uid) return notLogin();
    const orderNo = new URL(request.url).searchParams.get('order_no');
    if (!orderNo) {
      return HttpResponse.json({ code: 4015, msg: 'order_no required', data: null });
    }
    const o = getOrder(orderNo);
    if (!o) return HttpResponse.json({ code: 4041, msg: 'Order not found', data: null });
    return HttpResponse.json(jsonOk(o));
  }),

  http.get(`${BASE}/co-builder/member/my`, async ({ request }) => {
    await mockDelay();
    if (shouldInject500(request)) return err500();
    const uid = getMockUid(request);
    if (!uid) return notLogin();
    const wallet = request.headers.get('x-mock-wallet');
    return HttpResponse.json(jsonOk(memberSummaryFor(uid, wallet)));
  }),

  http.post(`${BASE}/co-builder/ent/claim`, async ({ request }) => {
    await mockDelay();
    if (shouldInject500(request)) return err500();
    const uid = getMockUid(request);
    if (!uid) return notLogin();
    const body = (await request.json()) as {
      amount: number;
      claim_type: CoBuilderClaimType;
      to_address?: string;
    };
    const amount = Number(body.amount ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      return HttpResponse.json({ code: 4016, msg: 'Invalid amount', data: null });
    }
    const summary = memberSummaryFor(uid, request.headers.get('x-mock-wallet'));
    if (amount > summary.ent.claimable + 1e-6) {
      return HttpResponse.json({ code: 4020, msg: 'Exceeds claimable', data: null });
    }
    if (body.claim_type === 'onchain') {
      const a = (body.to_address ?? '').trim();
      if (!a || a.length < 24 || a.length > 64) {
        return HttpResponse.json({ code: 4017, msg: 'Invalid address', data: null });
      }
    }
    const fee = Math.round(amount * 0.1 * 1000) / 1000;
    const actual = Math.round((amount - fee) * 1000) / 1000;
    const r: CoBuilderClaimResult = {
      claim_no: `CLM-${nanoid(8).toUpperCase()}`,
      amount,
      service_fee_ratio: 0.1,
      service_fee_amount: fee,
      actual_amount: actual,
      claim_type: body.claim_type,
      to_address: body.claim_type === 'onchain' ? body.to_address ?? null : null,
      tx_hash: body.claim_type === 'onchain' ? `0x${nanoid(40).toLowerCase()}` : null,
      created_at: Math.floor(Date.now() / 1000),
    };
    pushClaim(r);
    return HttpResponse.json(jsonOk(r));
  }),

  http.get(`${BASE}/co-builder/float/list`, async ({ request }) => {
    await mockDelay();
    if (shouldInject500(request)) return err500();
    const uid = getMockUid(request);
    if (!uid) return notLogin();
    const level = inferLevel(uid);
    if (level === 'none' || level === 'base') {
      return HttpResponse.json(jsonOk({ total: 0, items: [] }));
    }
    return HttpResponse.json(
      jsonOk({
        total: getInvitedWorks().length,
        items: getInvitedWorks(),
      }),
    );
  }),

  http.get(`${BASE}/co-builder/float/rule`, async ({ request }) => {
    await mockDelay();
    if (shouldInject500(request)) return err500();
    return HttpResponse.json(jsonOk(getFloatRule()));
  }),

  http.get(`${BASE}/co-builder/float/work-detail`, async ({ request }) => {
    await mockDelay();
    if (shouldInject500(request)) return err500();
    const id = Number(new URL(request.url).searchParams.get('work_id'));
    const w = getInvitedWorks().find((x) => x.work_id === id);
    if (!w) return HttpResponse.json({ code: 4042, msg: 'Work not found', data: null });
    return HttpResponse.json(jsonOk(w));
  }),

  http.get(`${BASE}/co-builder/community/my`, async ({ request }) => {
    await mockDelay();
    if (shouldInject500(request)) return err500();
    const uid = getMockUid(request);
    if (!uid) return notLogin();
    return HttpResponse.json(jsonOk(communityFor(uid)));
  }),

  http.post(`${BASE}/co-builder/debug/level`, async ({ request }) => {
    if (shouldInject500(request)) return err500();
    const body = (await request.json()) as { level: MemberLevel | null };
    setLevelOverride(body.level ?? null);
    return HttpResponse.json(jsonOk({ ok: true }));
  }),
];

// patchOrder is exported only to keep linter happy on potential future flows
void patchOrder;
