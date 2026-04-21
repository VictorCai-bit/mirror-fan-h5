import { AppShell } from '@/components/layout/AppShell';
import { apiFetch } from '@/lib/api';
import { formatTokenFromRaw, formatUsdtFromRaw } from '@/lib/fmt';
import type { PositionSummary } from '@/types/api';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { RequireInvestor } from '@/routes/guards';

export default function MinePage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { t, i18n } = useTranslation();

  const { data } = useQuery({
    queryKey: ['rwa', 'my', 'positions'],
    queryFn: () => apiFetch<PositionSummary[]>('/rwa/my/positions'),
  });

  const pos = (data ?? []).find((p) => String(p.project_id) === id);

  return (
    <RequireInvestor>
      <AppShell>
        <div className="flex flex-col gap-3 p-3">
          <div className="flex items-center gap-2">
            <button type="button" className="rounded-lg p-2 hover:bg-white/5" onClick={() => nav(-1)}>
              <ChevronLeft className="size-5" />
            </button>
            <h1 className="text-lg font-semibold">{t('project.mine')}</h1>
          </div>
          {pos ? (
            <>
              <div className="rounded-2xl bg-surface p-4 text-sm">
                <Row label={`${t('mine.tokenAmount')} · ${pos.symbol}`}>
                  {formatTokenFromRaw(pos.token_balance_raw, i18n.language)}
                </Row>
                <Row label={t('mine.spent')}>
                  {formatUsdtFromRaw(pos.usdt_spent_raw, i18n.language)}
                </Row>
                <Row label={t('mine.pendingUnlock')}>
                  {formatTokenFromRaw(pos.pending_unlock_raw, i18n.language)}
                </Row>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => nav(`/project/${id}/trade?side=sell`)}
                  className="flex-1 rounded-xl bg-white/10 py-2.5 text-sm font-medium text-text-primary hover:bg-white/15"
                >
                  {t('mine.ctaSell')}
                </button>
                <button
                  type="button"
                  onClick={() => nav(`/project/${id}/airdrop`)}
                  className="flex-1 rounded-xl bg-white/10 py-2.5 text-sm font-medium text-text-primary hover:bg-white/15"
                >
                  {t('mine.ctaAirdrop')}
                </button>
                <button
                  type="button"
                  onClick={() => nav(`/project/${id}/vesting`)}
                  className="flex-1 rounded-xl bg-accent-gradient py-2.5 text-sm font-bold text-white"
                >
                  {t('mine.ctaVesting')}
                </button>
              </div>
            </>
          ) : (
            <p className="py-10 text-center text-sm text-text-secondary">{t('mine.empty')}</p>
          )}
        </div>
      </AppShell>
    </RequireInvestor>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5 first:pt-0 last:pb-0">
      <span className="text-xs text-text-secondary">{label}</span>
      <span className="font-mono tabular-nums text-sm font-medium text-text-primary">{children}</span>
    </div>
  );
}
