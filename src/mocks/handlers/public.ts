import { http, HttpResponse } from 'msw';
import { getDb } from '@/mocks/db';
import { projectToOnChain } from '@/mocks/factories/projects';
import { getMilestoneTemplatesForWorkType } from '@/mocks/factories/milestoneTemplates';
import {
  getCreatorOf,
  getMockUid,
  jsonOk,
  mockDelay,
  shouldInject500,
} from '@/mocks/utils';
import type { WorkType } from '@/types/api';

const BASE = '/arts';

export const publicHandlers = [
  http.get(`${BASE}/launch/on-chain/list`, async ({ request }) => {
    await mockDelay();
    if (shouldInject500(request))
      return HttpResponse.json({ code: 5000, msg: 'internal error', data: null });
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const type = url.searchParams.get('type') as WorkType | null;
    const scope = url.searchParams.get('scope');
    const keyword = (url.searchParams.get('keyword') ?? url.searchParams.get('q') ?? '').trim().toLowerCase();
    const sort = url.searchParams.get('sort') ?? 'featured';
    const limit = Number(url.searchParams.get('limit') ?? '10');
    const cursor = Number(url.searchParams.get('cursor') ?? '0');
    const uid = getMockUid(request);
    const creatorOf = getCreatorOf(request);
    let rows = getDb().projects.map(projectToOnChain);
    if (type) rows = rows.filter((p) => p.work_type === type);
    if (status) rows = rows.filter((p) => p.status === status);
    if (keyword) {
      rows = rows.filter(
        (p) => p.name.toLowerCase().includes(keyword) || p.symbol.toLowerCase().includes(keyword),
      );
    }
    if (scope === 'created' && uid) {
      rows = rows.filter((p) => creatorOf.includes(p.id) || p.creator_uid === uid);
    }
    if (scope === 'joined' && uid) {
      const v = getDb().vestingByUid[uid] ?? [];
      const ids = new Set(v.map((x) => x.project_id));
      rows = rows.filter((p) => ids.has(p.id));
    }
    // Status-based priority: live/upcoming first, finished middle, drafts last.
    const STATUS_RANK: Record<string, number> = {
      curve_active: 0,
      on_chain: 1,
      on_chaining: 2,
      approved: 3,
      migrating: 4,
      curve_completed: 5,
      migrated: 6,
      pending_review: 7,
      draft: 8,
      rejected: 9,
      cancelled: 10,
      abandoned: 10,
    };
    const rankOf = (s: string) => STATUS_RANK[s] ?? 99;
    if (sort === 'volume') {
      rows = [...rows].sort((a, b) => Number(b.volume_24h_raw ?? 0) - Number(a.volume_24h_raw ?? 0));
    } else if (sort === 'hot') {
      rows = [...rows].sort((a, b) => (b.holder_count ?? 0) - (a.holder_count ?? 0));
    } else if (sort === 'new') {
      rows = [...rows].sort((a, b) => b.id - a.id);
    } else {
      // 'featured' (default): active first, then by id desc within each status tier.
      rows = [...rows].sort((a, b) => {
        const d = rankOf(a.status) - rankOf(b.status);
        if (d !== 0) return d;
        return b.id - a.id;
      });
    }
    const slice = rows.slice(cursor, cursor + limit);
    for (const r of slice) {
      const phases = getDb().phases[r.id];
      r.airdrop_phase = phases?.[0] ?? null;
    }
    return HttpResponse.json(jsonOk(slice));
  }),

  http.get(`${BASE}/launch/on-chain/detail`, async ({ request }) => {
    await mockDelay();
    if (shouldInject500(request))
      return HttpResponse.json({ code: 5000, msg: 'internal error', data: null });
    const id = Number(new URL(request.url).searchParams.get('project_id'));
    const p = getDb().projects.find((x) => x.id === id);
    if (!p) return HttpResponse.json({ code: 4040, msg: 'not found', data: null });
    const d = projectToOnChain(p);
    d.airdrop_phase = getDb().phases[id]?.[0] ?? null;
    return HttpResponse.json(jsonOk(d));
  }),

  http.get(`${BASE}/launch/kline`, async ({ request }) => {
    await mockDelay();
    if (shouldInject500(request))
      return HttpResponse.json({ code: 5000, msg: 'internal error', data: null });
    const pid = Number(new URL(request.url).searchParams.get('project_id'));
    const interval = new URL(request.url).searchParams.get('interval') ?? '1h';
    const limit = Number(new URL(request.url).searchParams.get('limit') ?? '48');
    const now = Math.floor(Date.now() / 1000);
    const step =
      interval === '1m'
        ? 60
        : interval === '5m'
          ? 300
          : interval === '15m'
            ? 900
            : interval === '4h'
              ? 14400
              : interval === '1d'
                ? 86400
                : 3600;
    const candles = Array.from({ length: limit }).map((_, i) => {
      const t = now - (limit - i) * step;
      const base = 0.1 + (pid % 10) * 0.01 + i * 0.0005;
      const o = String(Math.round(base * 1e6));
      const c = String(Math.round((base + 0.001) * 1e6));
      return { t, o, h: c, l: o, c, v: '1000000' };
    });
    return HttpResponse.json(jsonOk(candles));
  }),

  http.get(`${BASE}/launch/on-chain/trades`, async ({ request }) => {
    await mockDelay();
    if (shouldInject500(request))
      return HttpResponse.json({ code: 5000, msg: 'internal error', data: null });
    const pid = Number(new URL(request.url).searchParams.get('project_id'));
    const limit = Number(new URL(request.url).searchParams.get('limit') ?? '20');
    const now = Math.floor(Date.now() / 1000);
    const rows = Array.from({ length: limit }).map((_, i) => ({
      ts: now - i * 60,
      side: i % 2 === 0 ? ('buy' as const) : ('sell' as const),
      price_raw: '110000',
      amount_token_raw: '10000000',
      wallet: `0x${(pid + i).toString(16).padStart(4, '0')}...`,
    }));
    return HttpResponse.json(jsonOk(rows));
  }),

  http.get(`${BASE}/launch/on-chain/holders`, async ({ request }) => {
    await mockDelay();
    if (shouldInject500(request))
      return HttpResponse.json({ code: 5000, msg: 'internal error', data: null });
    const pid = Number(new URL(request.url).searchParams.get('project_id'));
    const limit = Number(new URL(request.url).searchParams.get('limit') ?? '30');
    const rows = Array.from({ length: Math.min(limit, 30) }).map((_, i) => ({
      rank: i + 1,
      wallet: i === 2 ? '0x71C7E4E1A2B3C4D5E6F7E420' : `0x${(0xabc123 + i * 0x7f3a).toString(16).padStart(8, '0')}DeAdBeEf${i.toString(16).padStart(4, '0')}`,
      balance_raw: String(Math.floor((limit - i) * 9090909 * (1 + Math.sin(i) * 0.3))),
      pct_bps: Math.max(10, Math.floor(10000 / (i + 1) / (limit * 0.4))),
      buy_count: 5 + Math.floor(Math.random() * 30),
      sell_count: Math.floor(Math.random() * 15),
      last_trade_time: Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 86400 * 7),
      unrealized_pnl_usdt: String(Math.floor((Math.random() - 0.3) * 5000) * 1000000),
    }));
    void pid;
    return HttpResponse.json(jsonOk(rows));
  }),

  http.get(`${BASE}/launch/project/:id/airdrop/phases`, async ({ params, request }) => {
    await mockDelay();
    if (shouldInject500(request))
      return HttpResponse.json({ code: 5000, msg: 'internal error', data: null });
    const id = Number(params.id);
    return HttpResponse.json(jsonOk(getDb().phases[id] ?? []));
  }),

  http.get(`${BASE}/rwa/project/:id/milestones`, async ({ params, request }) => {
    await mockDelay();
    if (shouldInject500(request))
      return HttpResponse.json({ code: 5000, msg: 'internal error', data: null });
    const id = Number(params.id);
    return HttpResponse.json(jsonOk(getDb().milestones[id] ?? []));
  }),

  http.get(`${BASE}/rwa/project/:id/reconciles`, async ({ params, request }) => {
    await mockDelay();
    if (shouldInject500(request))
      return HttpResponse.json({ code: 5000, msg: 'internal error', data: null });
    const id = Number(params.id);
    const url = new URL(request.url);
    const mine = url.searchParams.get('mine') === 'true';
    const uid = getMockUid(request);
    let rows = getDb().reconciles[id] ?? [];
    if (mine && uid) {
      rows = rows.filter(() => true);
    }
    return HttpResponse.json(jsonOk(rows));
  }),

  http.get(`${BASE}/rwa/fixed-price/sales`, async ({ request }) => {
    await mockDelay();
    if (shouldInject500(request))
      return HttpResponse.json({ code: 5000, msg: 'internal error', data: null });
    const url = new URL(request.url);
    const workId = Number(url.searchParams.get('work_id'));
    const isCreator = url.searchParams.get('creator') === 'true';

    const db = getDb();

    if (isCreator) {
      // Return creator-formatted rows (with sale_id) + draft sales
      const publishedSales = db.fixedPriceSales
        .filter((s) => {
          const proj = db.projects.find((p) => p.id === s.project_id);
          return proj?.work_id === workId || s.project_id === workId || s.work_id === workId;
        })
        .map((s) => ({
          sale_id: String(s.id),
          project_id: s.project_id,
          status: s.status,
          price_usdt_per_token_raw: s.price_usdt_per_token_raw,
          target_usdt_raw: s.target_usdt_raw,
          public_bps: 6000,
          dev_bps: 3000,
          airdrop_bps: 1000,
          sale_start_unix: s.sale_start_unix,
          sale_end_unix: s.sale_end_unix,
          vesting_start_unix: s.vesting_start_unix,
          vesting_num_slices: s.vesting_num_slices,
          vesting_slice_period_sec: s.vesting_slice_period_sec,
          vesting_percentages_bps_csv: s.vesting_percentages_bps_csv,
          subscribed_usdt: undefined as string | undefined,
          asset_proof_url: undefined as string | undefined,
          created_at: s.sale_start_unix > 0 ? s.sale_start_unix : Math.floor(Date.now() / 1000),
        }));
      const draftSales = (db.creatorFpSales ?? []).filter(
        (s) => s.project_id === workId,
      );
      return HttpResponse.json(jsonOk([...draftSales, ...publishedSales]));
    }

    // Investor/public: return AdminFixedPriceSaleRow list
    const rows = db.fixedPriceSales.filter((s) => s.work_id === workId || s.project_id === workId);
    return HttpResponse.json(jsonOk(rows));
  }),

  http.get(`${BASE}/rwa/fixed-price/sales/:saleId`, async ({ params, request }) => {
    await mockDelay();
    if (shouldInject500(request))
      return HttpResponse.json({ code: 5000, msg: 'internal error', data: null });
    const sale = getDb().fixedPriceSales.find((s) => s.id === params.saleId);
    if (!sale) return HttpResponse.json({ code: 4040, msg: 'not found', data: null });
    return HttpResponse.json(jsonOk(sale));
  }),

  http.get(`${BASE}/rwa/fixed-price/sales/:saleId/orders`, async ({ params, request }) => {
    await mockDelay();
    if (shouldInject500(request))
      return HttpResponse.json({ code: 5000, msg: 'internal error', data: null });
    const uid = getMockUid(request) ?? 'anon';
    const key = `${String(params.saleId)}_${uid}`;
    return HttpResponse.json(jsonOk(getDb().fixedPriceOrders[key] ?? []));
  }),

  http.get(`${BASE}/launch/rules`, async ({ request }) => {
    await mockDelay();
    if (shouldInject500(request))
      return HttpResponse.json({ code: 5000, msg: 'internal error', data: null });
    const lang = new URL(request.url).searchParams.get('lang') ?? 'zh-CN';
    const sections = [
      { id: '1', title: lang === 'zh-CN' ? '平台与曲线' : 'Curve', body_md: '# α=4 β=2.5' },
      { id: '2', title: lang === 'zh-CN' ? '生命周期' : 'Lifecycle', body_md: 'draft→migrated' },
      { id: '3', title: 'IP Points', body_md: 'points_symbol' },
      { id: '4', title: 'Utility', body_md: '21d x 10' },
      { id: '5', title: 'Fixed price', body_md: '60/30/10' },
      { id: '6', title: 'Milestone', body_md: '8 nodes' },
      { id: '7', title: 'Reconcile', body_md: 'USDT→ENT→Token' },
      { id: '8', title: 'Vault', body_md: '20/10/10/60' },
    ];
    return HttpResponse.json(jsonOk({ sections }));
  }),

  http.get(`${BASE}/rwa/milestone/templates`, async ({ request }) => {
    await mockDelay();
    if (shouldInject500(request))
      return HttpResponse.json({ code: 5000, msg: 'internal error', data: null });
    const wt = (new URL(request.url).searchParams.get('work_type') ?? 'Fiction') as WorkType;
    return HttpResponse.json(jsonOk(getMilestoneTemplatesForWorkType(wt)));
  }),

  http.get(`${BASE}/user/points`, async ({ request }) => {
    await mockDelay();
    if (shouldInject500(request))
      return HttpResponse.json({ code: 5000, msg: 'internal error', data: null });
    const workId = Number(new URL(request.url).searchParams.get('work_id'));
    const uid = getMockUid(request);
    const p = getDb().projects.find((x) => x.work_id === workId);
    const symbol = p?.symbol ?? 'IP';
    const key = uid ? `${uid}:${workId}` : '';
    const points = key ? (getDb().userPoints[key] ?? 0) : 0;
    return HttpResponse.json(jsonOk({ points, points_symbol: `${symbol}s` }));
  }),
];
