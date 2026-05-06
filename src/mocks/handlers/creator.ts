import { http, HttpResponse } from 'msw';
import { getDb, mutateDb } from '@/mocks/db';
import type { CreatorFixedPriceSaleBody, FixedPriceApplyBody, PhaseDraft, RwaProject } from '@/types/api';
import {
  getCreatorOf,
  getMockUid,
  jsonOk,
  mockDelay,
  shouldInject500,
} from '@/mocks/utils';
import { nanoid } from 'nanoid';

const BASE = '/arts';

function assertCreator(request: Request, projectId: number): boolean {
  const uid = getMockUid(request);
  const co = getCreatorOf(request);
  const p = getDb().projects.find((x) => x.id === projectId);
  if (!uid || !p) return false;
  return co.includes(projectId) || p.creator_uid === uid;
}

export const creatorHandlers = [
  http.get(`${BASE}/creator/my/projects`, async ({ request }) => {
    await mockDelay();
    if (shouldInject500(request))
      return HttpResponse.json({ code: 5000, msg: 'internal error', data: null });
    const uid = getMockUid(request);
    if (!uid) return HttpResponse.json({ code: 4001, msg: 'login', data: null });
    const co = getCreatorOf(request);
    const rows = getDb().projects.filter((p) => co.includes(p.id) || p.creator_uid === uid);
    return HttpResponse.json(jsonOk(rows));
  }),

  http.get(`${BASE}/creator/works`, async ({ request }) => {
    await mockDelay();
    if (shouldInject500(request))
      return HttpResponse.json({ code: 5000, msg: 'internal error', data: null });
    const uid = getMockUid(request);
    if (!uid) return HttpResponse.json({ code: 4001, msg: 'login', data: null });
    const unBound = new URL(request.url).searchParams.get('un_bound') === 'true';
    const boundWorkIds = new Set(getDb().projects.map((p) => p.work_id));
    let works = getDb().works.filter((w) => w.creator_uid === uid);
    if (unBound) works = works.filter((w) => !boundWorkIds.has(w.id));
    return HttpResponse.json(jsonOk(works));
  }),

  http.post(`${BASE}/launch/project/mint-price-preview`, async ({ request }) => {
    await mockDelay();
    if (shouldInject500(request))
      return HttpResponse.json({ code: 5000, msg: 'internal error', data: null });
    return HttpResponse.json(
      jsonOk({
        initial_price: 0.01,
        alpha: 4,
        beta: 2.5,
        total_supply: 13_636_363,
        public_supply: 8_181_818,
        airdrop_pool: 1_363_636,
        dev_fund_pool: 4_090_909,
        expected_migrate_usdt: 150_000,
      }),
    );
  }),

  http.get(`${BASE}/launch/project/symbol-available`, async ({ request }) => {
    await mockDelay();
    if (shouldInject500(request))
      return HttpResponse.json({ code: 5000, msg: 'internal error', data: null });
    const sym = new URL(request.url).searchParams.get('symbol')?.toUpperCase() ?? '';
    const taken = getDb().projects.some((p) => p.symbol.toUpperCase() === sym);
    return HttpResponse.json(jsonOk({ available: !taken && sym.length >= 2 }));
  }),

  http.post(`${BASE}/launch/project`, async ({ request }) => {
    await mockDelay();
    if (shouldInject500(request))
      return HttpResponse.json({ code: 5000, msg: 'internal error', data: null });
    const uid = getMockUid(request);
    if (!uid) return HttpResponse.json({ code: 4001, msg: 'login', data: null });
    const body = (await request.json()) as Record<string, unknown>;
    let newId = 0;
    mutateDb((d) => {
      newId = d.nextProjectId;
      d.nextProjectId += 1;
      const p: RwaProject = {
        id: newId,
        work_id: Number(body.work_id),
        name: String(body.name),
        symbol: String(body.symbol).toUpperCase(),
        description: String(body.description ?? ''),
        cover_image_url: String(body.cover_image_url ?? ''),
        language: (body.language as 'zh-CN' | 'en-US') ?? 'zh-CN',
        work_type: (d.works.find((w) => w.id === Number(body.work_id))?.work_type ?? 'Fiction'),
        status: body.is_draft ? 'draft' : 'pending_review',
        reject_reason: null,
        deposit_status: 'unpaid',
        deposit_amount_usdt_raw: '0',
        target_financing_micro_usdt: String(body.target_financing_micro_usdt ?? '0'),
        ip_revenue_rights_valuation_micro_usdt: String(
          body.ip_revenue_rights_valuation_micro_usdt ?? '0',
        ),
        fundraising_fraction_bps: Number(body.fundraising_fraction_bps ?? 6000),
        airdrop_fraction_bps: Number(body.airdrop_fraction_bps ?? 1000),
        dev_fund_fraction_bps: Number(body.dev_fund_fraction_bps ?? 3000),
        curve_start_unix: null,
        curve_deadline_unix: null,
        meteora_pool: null,
        creator_uid: uid,
        current_price: '0',
        total_sold_raw: '0',
        volume_24h_raw: '0',
        holder_count: 0,
        progress_bps: 0,
      };
      d.projects.push(p);
      if (body.initial_airdrop_phase) {
        const ph = body.initial_airdrop_phase as PhaseDraft;
        d.phases[newId] = [
          {
            phase_id: d.nextPhaseId,
            start_at: ph.start_at,
            end_at: ph.end_at,
            timeline_state: 'pending',
            daily_sign_amount: ph.daily_sign_amount,
            invite_per_day_amount: ph.invite_per_day_amount,
            invite_daily_cap: ph.invite_daily_cap,
            team_per_day_amount: ph.team_per_day_amount,
            team_daily_cap: ph.team_daily_cap,
            total_points_cap: ph.total_points_cap,
            distributed_points: 0,
          },
        ];
        d.nextPhaseId += 1;
      }
    });
    return HttpResponse.json(jsonOk({ project_id: newId }));
  }),

  http.put(`${BASE}/launch/project/:id`, async ({ request, params }) => {
    await mockDelay();
    if (shouldInject500(request))
      return HttpResponse.json({ code: 5000, msg: 'internal error', data: null });
    const id = Number(params.id);
    if (!assertCreator(request, id)) return HttpResponse.json({ code: 4003, msg: 'forbidden', data: null });
    const patch = (await request.json()) as Partial<RwaProject>;
    mutateDb((d) => {
      const p = d.projects.find((x) => x.id === id);
      if (p) Object.assign(p, patch);
    });
    return HttpResponse.json(jsonOk({ ok: true }));
  }),

  http.post(`${BASE}/launch/project/:id/submit`, async ({ request, params }) => {
    await mockDelay();
    if (shouldInject500(request))
      return HttpResponse.json({ code: 5000, msg: 'internal error', data: null });
    const id = Number(params.id);
    if (!assertCreator(request, id)) return HttpResponse.json({ code: 4003, msg: 'forbidden', data: null });
    mutateDb((d) => {
      const p = d.projects.find((x) => x.id === id);
      if (p) p.status = 'pending_review';
    });
    return HttpResponse.json(jsonOk({ ok: true, status: 'pending_review' }));
  }),

  http.post(`${BASE}/launch/project/:id/deposit`, async ({ request, params }) => {
    await mockDelay();
    if (shouldInject500(request))
      return HttpResponse.json({ code: 5000, msg: 'internal error', data: null });
    const id = Number(params.id);
    if (!assertCreator(request, id)) return HttpResponse.json({ code: 4003, msg: 'forbidden', data: null });
    const body = (await request.json()) as {
      method?: 'platform' | 'wallet';
      amount_usdt_raw?: string;
      currency?: 'USDT' | 'ENT';
      tx_hash?: string;
    };
    const method = body.method ?? 'platform';
    const amountRaw = BigInt(body.amount_usdt_raw ?? '0');
    if (amountRaw <= 0n) {
      return HttpResponse.json({ code: 4010, msg: 'invalid amount', data: null });
    }
    if (method === 'platform') {
      const balHeader = request.headers.get('x-mock-usdt-raw');
      const bal = BigInt(balHeader ?? '0');
      if (bal < amountRaw) {
        return HttpResponse.json({ code: 4020, msg: 'insufficient balance', data: null });
      }
    } else if (!body.tx_hash) {
      return HttpResponse.json({ code: 4010, msg: 'missing tx_hash', data: null });
    }
    mutateDb((d) => {
      const p = d.projects.find((x) => x.id === id);
      if (p) {
        p.deposit_status = method === 'wallet' ? 'paying_wallet' : 'paid';
        p.deposit_amount_usdt_raw = body.amount_usdt_raw ?? '0';
      }
    });
    const status = method === 'wallet' ? 'paying_wallet' : 'paid';
    return HttpResponse.json(jsonOk({ ok: true, deposit_status: status }));
  }),

  http.post(`${BASE}/launch/project/:id/airdrop/phases`, async ({ request, params }) => {
    await mockDelay();
    if (shouldInject500(request))
      return HttpResponse.json({ code: 5000, msg: 'internal error', data: null });
    const id = Number(params.id);
    if (!assertCreator(request, id)) return HttpResponse.json({ code: 4003, msg: 'forbidden', data: null });
    const ph = (await request.json()) as PhaseDraft;
    const existing = getDb().phases[id] ?? [];
    for (const e of existing) {
      if (e.timeline_state === 'ended') continue;
      if (ph.start_at < e.end_at && ph.end_at > e.start_at) {
        return HttpResponse.json({ code: 4012, msg: 'time window overlap', data: null });
      }
    }
    if (ph.end_at <= ph.start_at + 24 * 3600) {
      return HttpResponse.json({ code: 4010, msg: 'duration must be >= 24h', data: null });
    }
    if (ph.start_at < Math.floor(Date.now() / 1000) + 30 * 60) {
      return HttpResponse.json({ code: 4010, msg: 'start must be >= now + 30min', data: null });
    }
    let phaseId = 0;
    mutateDb((d) => {
      phaseId = d.nextPhaseId;
      d.nextPhaseId += 1;
      const row = {
        phase_id: phaseId,
        start_at: ph.start_at,
        end_at: ph.end_at,
        timeline_state: 'pending' as const,
        daily_sign_amount: ph.daily_sign_amount,
        invite_per_day_amount: ph.invite_per_day_amount,
        invite_daily_cap: ph.invite_daily_cap,
        team_per_day_amount: ph.team_per_day_amount,
        team_daily_cap: ph.team_daily_cap,
        total_points_cap: ph.total_points_cap,
        distributed_points: 0,
      };
      d.phases[id] = [...(d.phases[id] ?? []), row];
    });
    return HttpResponse.json(jsonOk({ phase_id: phaseId }));
  }),

  http.put(`${BASE}/launch/project/:id/airdrop/phases/:phaseId`, async ({ request, params }) => {
    await mockDelay();
    if (shouldInject500(request))
      return HttpResponse.json({ code: 5000, msg: 'internal error', data: null });
    const id = Number(params.id);
    const phaseId = Number(params.phaseId);
    if (!assertCreator(request, id)) return HttpResponse.json({ code: 4003, msg: 'forbidden', data: null });
    const ph = (await request.json()) as PhaseDraft;
    const list = getDb().phases[id] ?? [];
    const cur = list.find((x) => x.phase_id === phaseId);
    if (cur?.timeline_state !== 'pending') {
      return HttpResponse.json({ code: 4030, msg: 'locked', data: null });
    }
    for (const e of list) {
      if (e.phase_id === phaseId) continue;
      if (e.timeline_state === 'ended') continue;
      if (ph.start_at < e.end_at && ph.end_at > e.start_at) {
        return HttpResponse.json({ code: 4012, msg: 'time window overlap', data: null });
      }
    }
    if (ph.end_at <= ph.start_at + 24 * 3600) {
      return HttpResponse.json({ code: 4010, msg: 'duration must be >= 24h', data: null });
    }
    mutateDb((d) => {
      const rows = d.phases[id] ?? [];
      const x = rows.find((r) => r.phase_id === phaseId);
      if (x) {
        x.start_at = ph.start_at;
        x.end_at = ph.end_at;
        x.daily_sign_amount = ph.daily_sign_amount;
        x.invite_per_day_amount = ph.invite_per_day_amount;
        x.invite_daily_cap = ph.invite_daily_cap;
        x.team_per_day_amount = ph.team_per_day_amount;
        x.team_daily_cap = ph.team_daily_cap;
        x.total_points_cap = ph.total_points_cap;
      }
    });
    return HttpResponse.json(jsonOk({ ok: true }));
  }),

  http.delete(`${BASE}/launch/project/:id/airdrop/phases/:phaseId`, async ({ request, params }) => {
    await mockDelay();
    if (shouldInject500(request))
      return HttpResponse.json({ code: 5000, msg: 'internal error', data: null });
    const id = Number(params.id);
    const phaseId = Number(params.phaseId);
    if (!assertCreator(request, id)) return HttpResponse.json({ code: 4003, msg: 'forbidden', data: null });
    const rows = getDb().phases[id] ?? [];
    const cur = rows.find((x) => x.phase_id === phaseId);
    if (cur?.timeline_state !== 'pending') {
      return HttpResponse.json({ code: 4030, msg: 'locked', data: null });
    }
    mutateDb((d) => {
      d.phases[id] = (d.phases[id] ?? []).filter((x) => x.phase_id !== phaseId);
    });
    return HttpResponse.json(jsonOk({ ok: true }));
  }),

  http.post(`${BASE}/rwa/project/:id/milestone/submit`, async ({ request, params }) => {
    await mockDelay();
    if (shouldInject500(request))
      return HttpResponse.json({ code: 5000, msg: 'internal error', data: null });
    const id = Number(params.id);
    if (!assertCreator(request, id)) return HttpResponse.json({ code: 4003, msg: 'forbidden', data: null });
    const body = (await request.json()) as {
      node_index: number;
      title?: string;
      description: string;
      attachments: { url: string; type: string; size: number }[];
    };
    mutateDb((d) => {
      const nodes = d.milestones[id] ?? [];
      const n = nodes.find((x) => x.node_index === body.node_index);
      if (n) {
        n.status = 'submitted';
        n.description = body.description;
        n.evidence = body.attachments;
      }
    });
    return HttpResponse.json(jsonOk({ ok: true, status: 'submitted' }));
  }),

  http.get(`${BASE}/launch/project/:id/progress`, async ({ request, params }) => {
    await mockDelay();
    if (shouldInject500(request))
      return HttpResponse.json({ code: 5000, msg: 'internal error', data: null });
    const id = Number(params.id);
    const rows = getDb().progressByProject[id] ?? [];
    return HttpResponse.json(jsonOk([...rows].sort((a, b) => b.created_at - a.created_at)));
  }),

  http.post(`${BASE}/launch/project/:id/progress`, async ({ request, params }) => {
    await mockDelay();
    if (shouldInject500(request))
      return HttpResponse.json({ code: 5000, msg: 'internal error', data: null });
    const id = Number(params.id);
    if (!assertCreator(request, id)) return HttpResponse.json({ code: 4003, msg: 'forbidden', data: null });
    const body = (await request.json()) as {
      title?: string;
      body: string;
      attachments: { url: string; type: string; size: number }[];
      is_draft: boolean;
    };
    const pid = nanoid();
    mutateDb((d) => {
      d.progressByProject[id] = [
        ...(d.progressByProject[id] ?? []),
        {
          progress_id: pid,
          project_id: id,
          title: body.title,
          body: body.body,
          attachments: body.attachments,
          is_draft: body.is_draft,
          created_at: Math.floor(Date.now() / 1000),
        },
      ];
    });
    return HttpResponse.json(jsonOk({ progress_id: pid }));
  }),

  http.post(`${BASE}/launch/project/:id/progress/:pid/publish`, async ({ request, params }) => {
    await mockDelay();
    if (shouldInject500(request))
      return HttpResponse.json({ code: 5000, msg: 'internal error', data: null });
    const id = Number(params.id);
    if (!assertCreator(request, id)) return HttpResponse.json({ code: 4003, msg: 'forbidden', data: null });
    mutateDb((d) => {
      const list = d.progressByProject[id] ?? [];
      const x = list.find((p) => p.progress_id === params.pid);
      if (x) x.is_draft = false;
    });
    return HttpResponse.json(jsonOk({ ok: true }));
  }),

  http.post(`${BASE}/rwa/project/:id/reconcile`, async ({ request, params }) => {
    await mockDelay();
    if (shouldInject500(request))
      return HttpResponse.json({ code: 5000, msg: 'internal error', data: null });
    const id = Number(params.id);
    if (!assertCreator(request, id)) return HttpResponse.json({ code: 4003, msg: 'forbidden', data: null });
    const body = (await request.json()) as {
      revenue_type: string;
      amount_usd: string;
      description: string;
      evidence_urls: string[];
      is_draft: boolean;
    };
    const rid = nanoid();
    mutateDb((d) => {
      d.reconciles[id] = [
        ...(d.reconciles[id] ?? []),
        {
          id: rid,
          revenue_type: body.revenue_type,
          amount_usd: body.amount_usd,
          description: body.description,
          evidence_urls: body.evidence_urls,
          status: body.is_draft ? 'draft' : 'pending_review',
          created_at: Math.floor(Date.now() / 1000),
        },
      ];
    });
    return HttpResponse.json(jsonOk({ reconcile_id: rid }));
  }),

  // Creator draft fixed-price sale — POST /arts/rwa/fixed-price/sales
  http.post(`${BASE}/rwa/fixed-price/sales`, async ({ request }) => {
    await mockDelay();
    if (shouldInject500(request))
      return HttpResponse.json({ code: 5000, msg: 'internal error', data: null });
    const uid = getMockUid(request);
    if (!uid) return HttpResponse.json({ code: 4001, msg: 'login', data: null });
    const body = (await request.json()) as Partial<CreatorFixedPriceSaleBody>;
    const required: (keyof CreatorFixedPriceSaleBody)[] = [
      'project_id',
      'price_usdt_per_token_raw',
      'target_usdt_raw',
      'sale_start_unix',
      'sale_end_unix',
      'vesting_start_unix',
      'vesting_num_slices',
      'vesting_slice_period_sec',
      'vesting_percentages_bps_csv',
    ];
    for (const k of required) {
      if (body[k] === undefined || body[k] === null || body[k] === '')
        return HttpResponse.json({ code: 4010, msg: `missing ${k}`, data: null });
    }
    if (!assertCreator(request, Number(body.project_id)))
      return HttpResponse.json({ code: 4003, msg: 'forbidden', data: null });
    const saleId = nanoid();
    mutateDb((d) => {
      d.creatorFpSales = d.creatorFpSales ?? [];
      d.creatorFpSales.push({
        sale_id: saleId,
        project_id: Number(body.project_id),
        status: 'draft_config' as const,
        price_usdt_per_token_raw: body.price_usdt_per_token_raw!,
        target_usdt_raw: body.target_usdt_raw!,
        public_bps: body.public_bps ?? 6000,
        dev_bps: body.dev_bps ?? 3000,
        airdrop_bps: body.airdrop_bps ?? 1000,
        sale_start_unix: Number(body.sale_start_unix),
        sale_end_unix: Number(body.sale_end_unix),
        vesting_start_unix: Number(body.vesting_start_unix),
        vesting_num_slices: Number(body.vesting_num_slices),
        vesting_slice_period_sec: Number(body.vesting_slice_period_sec),
        vesting_percentages_bps_csv: body.vesting_percentages_bps_csv!,
        asset_proof_url: body.asset_proof_url ?? '',
        created_at: Math.floor(Date.now() / 1000),
      });
    });
    return HttpResponse.json(jsonOk({ sale_id: saleId, status: 'draft_config' }));
  }),

  // Edit creator draft — PUT /arts/rwa/fixed-price/sales/:saleId
  http.put(`${BASE}/rwa/fixed-price/sales/:saleId`, async ({ request, params }) => {
    await mockDelay();
    if (shouldInject500(request))
      return HttpResponse.json({ code: 5000, msg: 'internal error', data: null });
    const uid = getMockUid(request);
    if (!uid) return HttpResponse.json({ code: 4001, msg: 'login', data: null });
    const { saleId } = params as { saleId: string };
    const body = (await request.json()) as Partial<CreatorFixedPriceSaleBody>;
    mutateDb((d) => {
      d.creatorFpSales = d.creatorFpSales ?? [];
      const idx = d.creatorFpSales.findIndex((s) => s.sale_id === saleId);
      const existing = d.creatorFpSales[idx];
      if (idx >= 0 && existing && existing.status === 'draft_config') {
        d.creatorFpSales[idx] = { ...existing, ...(body as Partial<typeof existing>) };
      }
    });
    return HttpResponse.json(jsonOk({ ok: true }));
  }),

  // Submit creator draft for admin review — POST /arts/rwa/fixed-price/sales/:saleId/submit
  http.post(`${BASE}/rwa/fixed-price/sales/:saleId/submit`, async ({ request, params }) => {
    await mockDelay();
    if (shouldInject500(request))
      return HttpResponse.json({ code: 5000, msg: 'internal error', data: null });
    const uid = getMockUid(request);
    if (!uid) return HttpResponse.json({ code: 4001, msg: 'login', data: null });
    const { saleId } = params as { saleId: string };
    mutateDb((d) => {
      d.creatorFpSales = d.creatorFpSales ?? [];
      const sale = d.creatorFpSales.find((s) => s.sale_id === saleId);
      if (sale && sale.status === 'draft_config') {
        sale.status = 'submitted';
      }
    });
    return HttpResponse.json(jsonOk({ status: 'submitted' }));
  }),

  // List creator sales (including drafts) — GET /arts/rwa/fixed-price/sales?work_id=...&creator=true
  // Note: the existing public handler in investor.ts handles work_id without creator=true.
  // This handler intercepts creator=true queries and merges drafts with published sales.
  http.get(`${BASE}/rwa/fixed-price/sales`, async ({ request }) => {
    await mockDelay();
    if (shouldInject500(request))
      return HttpResponse.json({ code: 5000, msg: 'internal error', data: null });
    const url = new URL(request.url);
    const workId = Number(url.searchParams.get('work_id'));
    const isCreator = url.searchParams.get('creator') === 'true';
    if (!isCreator) return new HttpResponse(null, { status: 404 });
    const uid = getMockUid(request);
    if (!uid) return HttpResponse.json({ code: 4001, msg: 'login', data: null });
    const db = getDb();
    // published sales from admin-side (match work_id via project lookup)
    const publishedSales = (db.fixedPriceSales ?? []).filter((s) => {
      const proj = db.projects.find((p) => p.id === s.project_id);
      return proj?.work_id === workId || s.project_id === workId;
    }).map((s) => ({
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
      subscribed_usdt: undefined,
      created_at: s.sale_start_unix > 0 ? s.sale_start_unix : Math.floor(Date.now() / 1000),
    }));
    // creator drafts
    const draftSales = (db.creatorFpSales ?? []).filter((s) => s.project_id === workId);
    return HttpResponse.json(jsonOk([...draftSales, ...publishedSales]));
  }),

  http.post(`${BASE}/studio/fixed-price/apply`, async ({ request }) => {
    await mockDelay();
    if (shouldInject500(request))
      return HttpResponse.json({ code: 5000, msg: 'internal error', data: null });
    const uid = getMockUid(request);
    if (!uid) return HttpResponse.json({ code: 4001, msg: 'login', data: null });
    const body = (await request.json()) as Partial<FixedPriceApplyBody>;
    const req: (keyof FixedPriceApplyBody)[] = [
      'project_id',
      'price_usdt_per_token_raw',
      'target_usdt_raw',
      'sale_start_unix',
      'sale_end_unix',
      'vesting_num_slices',
      'vesting_slice_period_sec',
      'vesting_percentages_bps_csv',
      'vesting_start_unix',
    ];
    for (const k of req) {
      if (body[k] === undefined || body[k] === null || body[k] === '')
        return HttpResponse.json({ code: 4010, msg: `missing ${k}`, data: null });
    }
    if (!assertCreator(request, Number(body.project_id)))
      return HttpResponse.json({ code: 4003, msg: 'forbidden', data: null });
    const aid = nanoid();
    mutateDb((d) => {
      d.fixedPriceApplies.push({
        apply_id: aid,
        project_id: Number(body.project_id),
        status: 'draft_apply',
        created_at: Math.floor(Date.now() / 1000),
        note: body.note,
      });
    });
    return HttpResponse.json(jsonOk({ apply_id: aid, status: 'draft_apply' }));
  }),

  http.get(`${BASE}/studio/fixed-price/applies`, async ({ request }) => {
    await mockDelay();
    if (shouldInject500(request))
      return HttpResponse.json({ code: 5000, msg: 'internal error', data: null });
    const pid = Number(new URL(request.url).searchParams.get('project_id'));
    return HttpResponse.json(jsonOk(getDb().fixedPriceApplies.filter((a) => a.project_id === pid)));
  }),

  http.get(`${BASE}/creator/project/:id/vault`, async ({ request, params }) => {
    await mockDelay();
    if (shouldInject500(request))
      return HttpResponse.json({ code: 5000, msg: 'internal error', data: null });
    const id = Number(params.id);
    if (!assertCreator(request, id)) return HttpResponse.json({ code: 4003, msg: 'forbidden', data: null });
    return HttpResponse.json(
      jsonOk({
        distribution: { early: 20, shield: 10, eco: 10, creator: 60 },
        unlocked_a: { pct: 15, usdt_raw: '112500000000' },
        unlocked_b: { nodes: 8, claimed_raw: '0' },
        claimable_raw: '187500000000',
        logs: [],
      }),
    );
  }),

  http.post(`${BASE}/launch/project/:id/vesting/release`, async ({ request, params }) => {
    await mockDelay();
    if (shouldInject500(request))
      return HttpResponse.json({ code: 5000, msg: 'internal error', data: null });
    const id = Number(params.id);
    if (!assertCreator(request, id)) return HttpResponse.json({ code: 4003, msg: 'forbidden', data: null });
    return HttpResponse.json(jsonOk({ tx_signature: nanoid(), released_raw: '1000000000' }));
  }),

  // Creator: single sale summary
  http.get(`${BASE}/creator/fixed-price/sales/:saleId`, async ({ request, params }) => {
    await mockDelay();
    if (shouldInject500(request))
      return HttpResponse.json({ code: 5000, msg: 'internal error', data: null });
    const sale = getDb().fixedPriceSales.find((s) => s.id === params.saleId);
    if (!sale) return HttpResponse.json({ code: 4040, msg: 'not found', data: null });
    return HttpResponse.json(
      jsonOk({
        sale_id: sale.id,
        symbol: sale.symbol,
        status: sale.status,
        price_usdt_per_token_raw: sale.price_usdt_per_token_raw,
        target_usdt_raw: sale.target_usdt_raw,
        raised_usdt_raw: sale.raised_usdt_raw,
        sale_start_unix: sale.sale_start_unix,
        sale_end_unix: sale.sale_end_unix,
      }),
    );
  }),

  // Creator: all subscriber orders for a sale (aggregated across all users)
  http.get(`${BASE}/creator/fixed-price/sales/:saleId/orders`, async ({ request, params }) => {
    await mockDelay();
    if (shouldInject500(request))
      return HttpResponse.json({ code: 5000, msg: 'internal error', data: null });
    const saleId = String(params.saleId);
    const db = getDb();
    // Collect all orders across all UIDs for this sale
    const orders = Object.entries(db.fixedPriceOrders)
      .filter(([key]) => key.startsWith(`${saleId}_`))
      .flatMap(([key, rows]) => {
        const uid = key.slice(saleId.length + 1);
        return (rows ?? []).map((o) => ({ ...o, investor_uid: uid }));
      })
      .sort((a, b) => b.created_at - a.created_at);

    // If no real orders, return seed data for demo
    if (orders.length === 0 && (saleId === 'sale-1' || saleId === 'sale-2' || saleId === 'sale-3' || saleId === 'sale-d1')) {
      const now = Math.floor(Date.now() / 1000);
      const seed = [
        { order_id: 'ord-001', investor_uid: 'U-investor-001', usdt_raw: '5000000000', token_raw: '33333333333', created_at: now - 86400 * 2 },
        { order_id: 'ord-002', investor_uid: 'U-investor-002', usdt_raw: '10000000000', token_raw: '66666666666', created_at: now - 86400 * 3 },
        { order_id: 'ord-003', investor_uid: 'U-investor-003', usdt_raw: '3000000000', token_raw: '20000000000', created_at: now - 86400 * 4 },
        { order_id: 'ord-004', investor_uid: 'U-investor-004', usdt_raw: '20000000000', token_raw: '133333333333', created_at: now - 86400 * 5 },
        { order_id: 'ord-005', investor_uid: 'U-investor-005', usdt_raw: '8000000000', token_raw: '53333333333', created_at: now - 86400 * 6 },
      ];
      return HttpResponse.json(jsonOk(seed));
    }
    return HttpResponse.json(jsonOk(orders));
  }),

  http.get(`${BASE}/creator/wallet/summary`, async ({ request }) => {
    await mockDelay();
    if (shouldInject500(request))
      return HttpResponse.json({ code: 5000, msg: 'internal error', data: null });
    if (!getMockUid(request)) return HttpResponse.json({ code: 4001, msg: 'login', data: null });
    return HttpResponse.json(
      jsonOk({
        available_raw: '58000000000',
        locked_a_raw: '120000000000',
        locked_b_raw: '100000000000',
        ip_token_held: [{ symbol: 'HSHW', raw: '1000000000000' }],
      }),
    );
  }),

  http.get(`${BASE}/creator/wallet/bills`, async ({ request }) => {
    await mockDelay();
    if (shouldInject500(request))
      return HttpResponse.json({ code: 5000, msg: 'internal error', data: null });
    const uid = getMockUid(request) ?? 'U-003';
    return HttpResponse.json(jsonOk(getDb().creatorBillsByUid[uid] ?? []));
  }),
];
