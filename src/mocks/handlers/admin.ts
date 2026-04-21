import { http, HttpResponse } from 'msw';
import { mutateDb } from '@/mocks/db';
import { getMockRole, getMockUid, jsonOk, mockDelay, shouldInject500 } from '@/mocks/utils';
import { nanoid } from 'nanoid';

const BASE = '/arts';

function requireAdmin(request: Request): boolean {
  return getMockRole(request) === 'admin' && !!getMockUid(request);
}

export const adminHandlers = [
  http.post(`${BASE}/admin/launch/project/:id/approve`, async ({ request, params }) => {
    await mockDelay();
    if (shouldInject500(request))
      return HttpResponse.json({ code: 5000, msg: 'internal error', data: null });
    if (!requireAdmin(request)) return HttpResponse.json({ code: 4003, msg: 'forbidden', data: null });
    const id = Number(params.id);
    mutateDb((d) => {
      const p = d.projects.find((x) => x.id === id);
      if (p) p.status = 'approved';
    });
    return HttpResponse.json(jsonOk({ ok: true }));
  }),

  http.post(`${BASE}/admin/launch/project/:id/reject`, async ({ request, params }) => {
    await mockDelay();
    if (shouldInject500(request))
      return HttpResponse.json({ code: 5000, msg: 'internal error', data: null });
    if (!requireAdmin(request)) return HttpResponse.json({ code: 4003, msg: 'forbidden', data: null });
    const id = Number(params.id);
    const body = (await request.json()) as { reason: string };
    mutateDb((d) => {
      const p = d.projects.find((x) => x.id === id);
      if (p) {
        p.status = 'rejected';
        p.reject_reason = body.reason;
      }
    });
    return HttpResponse.json(jsonOk({ ok: true }));
  }),

  http.post(`${BASE}/admin/launch/project/:id/on-chain`, async ({ request, params }) => {
    await mockDelay();
    if (shouldInject500(request))
      return HttpResponse.json({ code: 5000, msg: 'internal error', data: null });
    if (!requireAdmin(request)) return HttpResponse.json({ code: 4003, msg: 'forbidden', data: null });
    const id = Number(params.id);
    mutateDb((d) => {
      const p = d.projects.find((x) => x.id === id);
      if (p) {
        p.status = 'on_chain';
        const now = Math.floor(Date.now() / 1000);
        p.curve_start_unix = now - 10;
        p.curve_deadline_unix = now + 86400 * 30;
      }
    });
    return HttpResponse.json(jsonOk({ ok: true, tx: nanoid() }));
  }),

  http.post(`${BASE}/admin/launch/project/:id/migrate`, async ({ request, params }) => {
    await mockDelay();
    if (shouldInject500(request))
      return HttpResponse.json({ code: 5000, msg: 'internal error', data: null });
    if (!requireAdmin(request)) return HttpResponse.json({ code: 4003, msg: 'forbidden', data: null });
    const id = Number(params.id);
    mutateDb((d) => {
      const p = d.projects.find((x) => x.id === id);
      if (p) {
        p.status = 'migrated';
        p.meteora_pool = 'POOL_' + String(id);
      }
    });
    return HttpResponse.json(jsonOk({ ok: true }));
  }),

  http.post(`${BASE}/admin/rwa/fixed-price/sales`, async ({ request }) => {
    await mockDelay();
    if (shouldInject500(request))
      return HttpResponse.json({ code: 5000, msg: 'internal error', data: null });
    if (!requireAdmin(request)) return HttpResponse.json({ code: 4003, msg: 'forbidden', data: null });
    const body = (await request.json()) as Record<string, unknown>;
    const id = nanoid();
    mutateDb((d) => {
      d.fixedPriceSales.push({
        id,
        work_id: Number(body.work_id),
        project_id: Number(body.project_id),
        symbol: String(body.symbol ?? 'HSHW'),
        status: 'admin_drafting',
        price_usdt_per_token_raw: String(body.price_usdt_per_token_raw ?? '100000'),
        target_usdt_raw: String(body.target_usdt_raw ?? '1000000000000'),
        raised_usdt_raw: '0',
        sale_start_unix: Number(body.sale_start_unix),
        sale_end_unix: Number(body.sale_end_unix),
        vesting_num_slices: Number(body.vesting_num_slices ?? 4),
        vesting_slice_period_sec: Number(body.vesting_slice_period_sec ?? 86400 * 30),
        vesting_percentages_bps_csv: String(body.vesting_percentages_bps_csv ?? '2500,2500,2500,2500'),
        vesting_start_unix: Number(body.vesting_start_unix),
      });
    });
    return HttpResponse.json(jsonOk({ id }));
  }),

  http.post(`${BASE}/admin/rwa/fixed-price/sales/:id/publish`, async ({ request, params }) => {
    await mockDelay();
    if (shouldInject500(request))
      return HttpResponse.json({ code: 5000, msg: 'internal error', data: null });
    if (!requireAdmin(request)) return HttpResponse.json({ code: 4003, msg: 'forbidden', data: null });
    mutateDb((d) => {
      const s = d.fixedPriceSales.find((x) => x.id === params.id);
      if (s) s.status = 'subscribing';
    });
    return HttpResponse.json(jsonOk({ ok: true }));
  }),

  http.post(`${BASE}/admin/rwa/fixed-price/sales/:id/cancel`, async ({ request, params }) => {
    await mockDelay();
    if (shouldInject500(request))
      return HttpResponse.json({ code: 5000, msg: 'internal error', data: null });
    if (!requireAdmin(request)) return HttpResponse.json({ code: 4003, msg: 'forbidden', data: null });
    mutateDb((d) => {
      const s = d.fixedPriceSales.find((x) => x.id === params.id);
      if (s) s.status = 'cancelled';
    });
    return HttpResponse.json(jsonOk({ ok: true }));
  }),

  http.post(`${BASE}/admin/rwa/fixed-price/sales/:id/finalize`, async ({ request, params }) => {
    await mockDelay();
    if (shouldInject500(request))
      return HttpResponse.json({ code: 5000, msg: 'internal error', data: null });
    if (!requireAdmin(request)) return HttpResponse.json({ code: 4003, msg: 'forbidden', data: null });
    mutateDb((d) => {
      const s = d.fixedPriceSales.find((x) => x.id === params.id);
      if (s) s.status = 'finalized';
    });
    return HttpResponse.json(jsonOk({ ok: true }));
  }),

  http.post(`${BASE}/admin/rwa/reconcile/:id/approve`, async ({ request, params }) => {
    await mockDelay();
    if (shouldInject500(request))
      return HttpResponse.json({ code: 5000, msg: 'internal error', data: null });
    if (!requireAdmin(request)) return HttpResponse.json({ code: 4003, msg: 'forbidden', data: null });
    const rid = String(params.id);
    mutateDb((d) => {
      for (const pid of Object.keys(d.reconciles)) {
        const list = d.reconciles[Number(pid)] ?? [];
        const x = list.find((r) => r.id === rid);
        if (x) x.status = 'approved';
      }
    });
    return HttpResponse.json(jsonOk({ ok: true }));
  }),

  http.post(`${BASE}/admin/rwa/reconcile/:id/distribute`, async ({ request, params }) => {
    await mockDelay();
    if (shouldInject500(request))
      return HttpResponse.json({ code: 5000, msg: 'internal error', data: null });
    if (!requireAdmin(request)) return HttpResponse.json({ code: 4003, msg: 'forbidden', data: null });
    const rid = String(params.id);
    mutateDb((d) => {
      for (const pid of Object.keys(d.reconciles)) {
        const list = d.reconciles[Number(pid)] ?? [];
        const x = list.find((r) => r.id === rid);
        if (x) x.status = 'distributed';
      }
    });
    return HttpResponse.json(jsonOk({ ok: true }));
  }),
];
