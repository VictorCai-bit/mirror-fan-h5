import { http, HttpResponse } from 'msw';
import { getDb, mutateDb } from '@/mocks/db';
import { estimateSwapOutUsdtToToken } from '@/lib/curve';
import {
  getMockUid,
  jsonOk,
  mockDelay,
  shouldInject500,
} from '@/mocks/utils';
import { nanoid } from 'nanoid';

const BASE = '/arts';

function requireUid(request: Request): string | null {
  return getMockUid(request);
}

export const investorHandlers = [
  http.post(`${BASE}/launch/swap/preview`, async ({ request }) => {
    await mockDelay();
    if (shouldInject500(request))
      return HttpResponse.json({ code: 5000, msg: 'internal error', data: null });
    if (!requireUid(request)) return HttpResponse.json({ code: 4001, msg: 'login', data: null });
    const body = (await request.json()) as {
      project_id: number;
      side: 'buy' | 'sell';
      amount_in_raw: string;
      slippage_bps: number;
    };
    const p = getDb().projects.find((x) => x.id === body.project_id);
    if (!p) return HttpResponse.json({ code: 4040, msg: 'not found', data: null });
    const usdtIn = Number(body.amount_in_raw) / 1e6;
    if (body.side === 'buy') {
      const { tokenOut } = estimateSwapOutUsdtToToken(usdtIn, 0.5, 0.01);
      void body.slippage_bps;
      const amountOutRaw = String(Math.floor(tokenOut * 1e6));
      return HttpResponse.json(
        jsonOk({
          amount_out_raw: amountOutRaw,
          price_before_raw: p.current_price ?? '100000',
          price_after_raw: String(Number(p.current_price ?? '100000') + 1000),
          fee_raw: String(Math.floor(usdtIn * 0.01 * 1e6)),
          min_amount_out_raw: amountOutRaw,
        }),
      );
    }
    const tokenIn = Number(body.amount_in_raw) / 1e6;
    const amountOutRaw = String(Math.floor(tokenIn * Number(p.current_price ?? '100000')));
    return HttpResponse.json(
      jsonOk({
        amount_out_raw: amountOutRaw,
        price_before_raw: p.current_price ?? '100000',
        price_after_raw: p.current_price ?? '100000',
        fee_raw: '1000000',
        min_amount_out_raw: amountOutRaw,
      }),
    );
  }),

  http.post(`${BASE}/launch/swap/confirm`, async ({ request }) => {
    await mockDelay();
    if (shouldInject500(request))
      return HttpResponse.json({ code: 5000, msg: 'internal error', data: null });
    const uid = requireUid(request);
    if (!uid) return HttpResponse.json({ code: 4001, msg: 'login', data: null });
    const body = (await request.json()) as {
      project_id: number;
      side: 'buy' | 'sell';
      amount_in_raw: string;
      min_amount_out_raw: string;
    };
    mutateDb((db) => {
      const p = db.projects.find((x) => x.id === body.project_id);
      if (p && body.side === 'buy') {
        const add = Number(body.min_amount_out_raw);
        p.total_sold_raw = String(Number(p.total_sold_raw ?? '0') + add);
      }
    });
    return HttpResponse.json(
      jsonOk({
        tx_signature: nanoid(),
        amount_out_raw: body.min_amount_out_raw,
        fee_raw: '1000000',
      }),
    );
  }),

  http.post(`${BASE}/rwa/airdrop/checkin`, async ({ request }) => {
    await mockDelay();
    if (shouldInject500(request))
      return HttpResponse.json({ code: 5000, msg: 'internal error', data: null });
    const uid = requireUid(request);
    if (!uid) return HttpResponse.json({ code: 4001, msg: 'login', data: null });
    const { work_id } = (await request.json()) as { work_id: number };
    const day = new Date().toISOString().slice(0, 10);
    const k = `${uid}:${work_id}:${day}`;
    const db = getDb();
    if (db.airdropDaily[k]) {
      return HttpResponse.json({ code: 4030, msg: 'Already done', data: null });
    }
    mutateDb((d) => {
      d.airdropDaily[k] = true;
      const pk = `${uid}:${work_id}`;
      d.userPoints[pk] = (d.userPoints[pk] ?? 0) + 5;
    });
    return HttpResponse.json(jsonOk({ points_delta: 5, daily_total: 5 }));
  }),

  http.post(`${BASE}/rwa/airdrop/invite-claim`, async ({ request }) => {
    await mockDelay();
    if (shouldInject500(request))
      return HttpResponse.json({ code: 5000, msg: 'internal error', data: null });
    const uid = requireUid(request);
    if (!uid) return HttpResponse.json({ code: 4001, msg: 'login', data: null });
    const { work_id } = (await request.json()) as { work_id: number };
    const day = new Date().toISOString().slice(0, 10);
    const k = `${uid}:${work_id}:invite:${day}`;
    const db = getDb();
    if (db.airdropDaily[k]) {
      return HttpResponse.json({ code: 4030, msg: 'Already done', data: null });
    }
    mutateDb((d) => {
      d.airdropDaily[k] = true;
      const pk = `${uid}:${work_id}`;
      d.userPoints[pk] = (d.userPoints[pk] ?? 0) + 10;
    });
    return HttpResponse.json(jsonOk({ points_delta: 10 }));
  }),

  http.post(`${BASE}/rwa/airdrop/team-up`, async ({ request }) => {
    await mockDelay();
    if (shouldInject500(request))
      return HttpResponse.json({ code: 5000, msg: 'internal error', data: null });
    const uid = requireUid(request);
    if (!uid) return HttpResponse.json({ code: 4001, msg: 'login', data: null });
    const { work_id } = (await request.json()) as { work_id: number };
    const day = new Date().toISOString().slice(0, 10);
    const k = `${uid}:${work_id}:team:${day}`;
    const db = getDb();
    if (db.airdropDaily[k]) {
      return HttpResponse.json({ code: 4030, msg: 'Already done', data: null });
    }
    mutateDb((d) => {
      d.airdropDaily[k] = true;
      const pk = `${uid}:${work_id}`;
      d.userPoints[pk] = (d.userPoints[pk] ?? 0) + 3;
    });
    return HttpResponse.json(jsonOk({ points_delta: 3 }));
  }),

  http.post(`${BASE}/rwa/ip-points-to-token`, async ({ request }) => {
    await mockDelay();
    if (shouldInject500(request))
      return HttpResponse.json({ code: 5000, msg: 'internal error', data: null });
    const uid = requireUid(request);
    if (!uid) return HttpResponse.json({ code: 4001, msg: 'login', data: null });
    const { project_id, points } = (await request.json()) as { project_id: number; points: number };
    const p = getDb().projects.find((x) => x.id === project_id);
    if (!p) return HttpResponse.json({ code: 4040, msg: 'not found', data: null });
    const pk = `${uid}:${p.work_id}`;
    const bal = getDb().userPoints[pk] ?? 0;
    if (points > bal) return HttpResponse.json({ code: 4020, msg: 'insufficient', data: null });
    let startId = 0;
    mutateDb((d) => {
      startId = d.nextVestingId;
      d.userPoints[pk] = bal - points;
      d.nextVestingId += 10;
      const entries = Array.from({ length: 10 }).map((_, i) => ({
        id: startId + i,
        project_id,
        symbol: p.symbol,
        amount_raw: String(Math.floor((points * 1e6) / 10)),
        unlock_at: Math.floor(Date.now() / 1000) + i * 86400,
        claimed: false,
        source: 'ip_points',
      }));
      d.vestingByUid[uid] = [...(d.vestingByUid[uid] ?? []), ...entries];
    });
    const list = getDb().vestingByUid[uid] ?? [];
    const entries = list.slice(-10);
    return HttpResponse.json(jsonOk({ vesting_entries: entries }));
  }),

  http.post(`${BASE}/rwa/fixed-price/sales/:saleId/subscribe/preview`, async ({ request, params }) => {
    await mockDelay();
    if (shouldInject500(request))
      return HttpResponse.json({ code: 5000, msg: 'internal error', data: null });
    const { usdt_raw } = (await request.json()) as { usdt_raw: string };
    const sale = getDb().fixedPriceSales.find((s) => s.id === params.saleId);
    if (!sale) return HttpResponse.json({ code: 4040, msg: 'not found', data: null });
    const token = String(Math.floor(Number(usdt_raw) / Number(sale.price_usdt_per_token_raw)));
    return HttpResponse.json(
      jsonOk({
        token_raw: token,
        first_unlock_at: sale.vesting_start_unix,
        slices: sale.vesting_percentages_bps_csv.split(',').map((x) => ({
          bps: Number(x),
          amount_raw: String(Math.floor(Number(token) * (Number(x) / 10000))),
        })),
      }),
    );
  }),

  http.post(`${BASE}/rwa/fixed-price/sales/:saleId/subscribe/confirm`, async ({ request, params }) => {
    await mockDelay();
    if (shouldInject500(request))
      return HttpResponse.json({ code: 5000, msg: 'internal error', data: null });
    const uid = requireUid(request);
    if (!uid) return HttpResponse.json({ code: 4001, msg: 'login', data: null });
    const body = (await request.json()) as { usdt_raw: string; client_order_id: string };
    const sale = getDb().fixedPriceSales.find((s) => s.id === params.saleId);
    if (!sale) return HttpResponse.json({ code: 4040, msg: 'not found', data: null });
    const token = String(Math.floor(Number(body.usdt_raw) / Number(sale.price_usdt_per_token_raw)));
    const order = {
      order_id: nanoid(),
      usdt_raw: body.usdt_raw,
      token_raw: token,
      created_at: Math.floor(Date.now() / 1000),
    };
    let vest: {
      id: number;
      project_id: number;
      symbol: string;
      amount_raw: string;
      unlock_at: number;
      claimed: boolean;
      source: string;
    }[] = [];
    mutateDb((d) => {
      const baseId = d.nextVestingId;
      vest = Array.from({ length: 4 }).map((_, i) => ({
        id: baseId + i,
        project_id: sale.project_id,
        symbol: sale.symbol,
        amount_raw: String(Math.floor(Number(token) / 4)),
        unlock_at: sale.vesting_start_unix + i * sale.vesting_slice_period_sec,
        claimed: false,
        source: 'fixed_price',
      }));
      const key = `${String(params.saleId)}_${uid}`;
      d.fixedPriceOrders[key] = [...(d.fixedPriceOrders[key] ?? []), order];
      d.nextVestingId += 4;
      d.vestingByUid[uid] = [...(d.vestingByUid[uid] ?? []), ...vest];
      const s = d.fixedPriceSales.find((x) => x.id === sale.id);
      if (s) s.raised_usdt_raw = String(Number(s.raised_usdt_raw) + Number(body.usdt_raw));
    });
    return HttpResponse.json(jsonOk({ order_id: order.order_id, vesting_entries: vest }));
  }),

  http.post(`${BASE}/rwa/vesting/:id/claim`, async ({ request, params }) => {
    await mockDelay();
    if (shouldInject500(request))
      return HttpResponse.json({ code: 5000, msg: 'internal error', data: null });
    const uid = requireUid(request);
    if (!uid) return HttpResponse.json({ code: 4001, msg: 'login', data: null });
    const id = Number(params.id);
    mutateDb((d) => {
      const list = d.vestingByUid[uid] ?? [];
      const v = list.find((x) => x.id === id);
      if (v) v.claimed = true;
    });
    return HttpResponse.json(jsonOk({ tx_signature: nanoid(), amount_raw: '1000000' }));
  }),

  http.post(`${BASE}/rwa/vesting/batch-release/preview`, async ({ request }) => {
    await mockDelay();
    if (shouldInject500(request))
      return HttpResponse.json({ code: 5000, msg: 'internal error', data: null });
    const uid = requireUid(request);
    if (!uid) return HttpResponse.json({ code: 4001, msg: 'login', data: null });
    const { ids } = (await request.json()) as { ids: number[] };
    const list = getDb().vestingByUid[uid] ?? [];
    let total = 0;
    for (const id of ids) {
      const v = list.find((x) => x.id === id);
      if (v && !v.claimed && v.unlock_at <= Math.floor(Date.now() / 1000)) {
        total += Number(v.amount_raw);
      }
    }
    return HttpResponse.json(jsonOk({ total_amount_raw: String(total), count: ids.length }));
  }),

  http.post(`${BASE}/rwa/vesting/batch-release/confirm`, async ({ request }) => {
    await mockDelay();
    if (shouldInject500(request))
      return HttpResponse.json({ code: 5000, msg: 'internal error', data: null });
    const uid = requireUid(request);
    if (!uid) return HttpResponse.json({ code: 4001, msg: 'login', data: null });
    const { ids } = (await request.json()) as { ids: number[] };
    mutateDb((d) => {
      const list = d.vestingByUid[uid] ?? [];
      for (const id of ids) {
        const v = list.find((x) => x.id === id);
        if (v && !v.claimed && v.unlock_at <= Math.floor(Date.now() / 1000)) {
          v.claimed = true;
        }
      }
    });
    const listAfter = getDb().vestingByUid[uid] ?? [];
    const rel = listAfter.filter((x) => ids.includes(x.id) && x.claimed);
    return HttpResponse.json(jsonOk({ tx_signature: nanoid(), released: rel }));
  }),

  http.get(`${BASE}/rwa/my/positions`, async ({ request }) => {
    await mockDelay();
    if (shouldInject500(request))
      return HttpResponse.json({ code: 5000, msg: 'internal error', data: null });
    const uid = requireUid(request);
    if (!uid) return HttpResponse.json({ code: 4001, msg: 'login', data: null });
    if (uid === 'U-001') {
      return HttpResponse.json(
        jsonOk([
          {
            project_id: 1001,
            symbol: 'HSHW',
            work_id: 1001,
            token_balance_raw: '9090900000',
            usdt_spent_raw: '100000000',
            pending_unlock_raw: '500000000',
          },
          {
            project_id: 1003,
            symbol: 'MUSE',
            work_id: 1003,
            token_balance_raw: '1000000000',
            usdt_spent_raw: '50000000',
            pending_unlock_raw: '0',
          },
          {
            project_id: 1005,
            symbol: 'DREAM',
            work_id: 1005,
            token_balance_raw: '200000000',
            usdt_spent_raw: '20000000',
            pending_unlock_raw: '100000000',
          },
        ]),
      );
    }
    return HttpResponse.json(jsonOk([]));
  }),

  http.get(`${BASE}/rwa/my/position`, async ({ request }) => {
    await mockDelay();
    const uid = requireUid(request);
    if (!uid) return HttpResponse.json({ code: 4001, msg: 'login', data: null });
    const pid = Number(new URL(request.url).searchParams.get('project_id') ?? 0);
    const posMap: Record<number, object> = {
      1001: { project_id: 1001, symbol: 'HSHW', work_id: 1001, token_balance_raw: '9090900000', usdt_spent_raw: '100000000', pending_unlock_raw: '500000000' },
      1003: { project_id: 1003, symbol: 'MUSE', work_id: 1003, token_balance_raw: '1000000000', usdt_spent_raw: '50000000', pending_unlock_raw: '0' },
      1005: { project_id: 1005, symbol: 'DREAM', work_id: 1005, token_balance_raw: '200000000', usdt_spent_raw: '20000000', pending_unlock_raw: '100000000' },
    };
    return HttpResponse.json(jsonOk(posMap[pid] ?? null));
  }),

  http.get(`${BASE}/rwa/my/vesting`, async ({ request }) => {
    await mockDelay();
    if (shouldInject500(request))
      return HttpResponse.json({ code: 5000, msg: 'internal error', data: null });
    const uid = requireUid(request);
    if (!uid) return HttpResponse.json({ code: 4001, msg: 'login', data: null });
    const pid = new URL(request.url).searchParams.get('project_id');
    let list = getDb().vestingByUid[uid] ?? [];
    if (pid) list = list.filter((x) => x.project_id === Number(pid));
    return HttpResponse.json(jsonOk(list));
  }),

  http.get(`${BASE}/wallet/summary`, async ({ request }) => {
    await mockDelay();
    if (shouldInject500(request))
      return HttpResponse.json({ code: 5000, msg: 'internal error', data: null });
    const uid = requireUid(request);
    if (!uid) return HttpResponse.json({ code: 4001, msg: 'login', data: null });
    const usdt = uid === 'U-001' ? '128469000000' : uid === 'U-002' ? '50000000' : '0';
    return HttpResponse.json(
      jsonOk({
        usdt_raw: usdt,
        ent_raw: uid === 'U-001' ? '15750000000000000000000' : '0',
        points_by_work: { 1001: getDb().userPoints[`${uid}:1001`] ?? 0 },
        total_value_usdt: usdt,
      }),
    );
  }),

  http.get(`${BASE}/wallet/bills`, async ({ request }) => {
    await mockDelay();
    if (shouldInject500(request))
      return HttpResponse.json({ code: 5000, msg: 'internal error', data: null });
    const uid = requireUid(request) ?? 'U-003';
    const rows = getDb().billsByUid[uid] ?? [];
    return HttpResponse.json(jsonOk(rows));
  }),

  http.post(`${BASE}/wallet/recharge`, async ({ request }) => {
    await mockDelay();
    if (shouldInject500(request))
      return HttpResponse.json({ code: 5000, msg: 'internal error', data: null });
    const uid = requireUid(request);
    if (!uid) return HttpResponse.json({ code: 4001, msg: 'login', data: null });
    const { amount_raw } = (await request.json()) as { currency: string; amount_raw: string };
    return HttpResponse.json(jsonOk({ ok: true, balance_raw: amount_raw }));
  }),

  http.post(`${BASE}/wallet/withdraw`, async ({ request }) => {
    await mockDelay();
    if (shouldInject500(request))
      return HttpResponse.json({ code: 5000, msg: 'internal error', data: null });
    const uid = requireUid(request);
    if (!uid) return HttpResponse.json({ code: 4001, msg: 'login', data: null });
    const { amount_raw } = (await request.json()) as {
      currency: string;
      amount_raw: string;
      target_type: string;
      target_addr_or_uid: string;
    };
    return HttpResponse.json(jsonOk({ ok: true, balance_raw: amount_raw }));
  }),

  http.get(`${BASE}/notifications`, async ({ request }) => {
    await mockDelay();
    if (shouldInject500(request))
      return HttpResponse.json({ code: 5000, msg: 'internal error', data: null });
    const uid = requireUid(request);
    if (!uid) return HttpResponse.json(jsonOk([]));
    return HttpResponse.json(jsonOk(getDb().notificationsByUid[uid] ?? []));
  }),

  http.post(`${BASE}/notifications/mark-read`, async ({ request }) => {
    await mockDelay();
    if (shouldInject500(request))
      return HttpResponse.json({ code: 5000, msg: 'internal error', data: null });
    const uid = requireUid(request);
    if (!uid) return HttpResponse.json({ code: 4001, msg: 'login', data: null });
    const { ids } = (await request.json()) as { ids: string[] };
    mutateDb((d) => {
      const list = d.notificationsByUid[uid] ?? [];
      for (const n of list) {
        if (ids.includes(n.id)) n.read = true;
      }
    });
    return HttpResponse.json(jsonOk({ ok: true }));
  }),
];
