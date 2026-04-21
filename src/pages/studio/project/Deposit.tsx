import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { ApiError, apiFetch } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatUsdtFromRaw } from '@/lib/fmt';
import { RequireCreator } from '@/routes/guards';
import { useUserStore } from '@/stores/useUserStore';
import type { OnChainDetail } from '@/types/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Copy, Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

type Method = 'platform' | 'wallet';

const DEPOSIT_RECEIVER = 'DEP0xMirrorFanEscrow0000000000000000000000';

function scaleMicroToUsdtRaw(micro: string): bigint {
  try {
    return BigInt(micro ?? '0');
  } catch {
    return 0n;
  }
}

export default function StudioProjectDeposit() {
  const { id } = useParams();
  const nav = useNavigate();
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const usdtRaw = useUserStore((s) => s.usdt_raw);

  const { data, isPending } = useQuery({
    queryKey: ['launch', 'on-chain', 'detail', id],
    queryFn: () => apiFetch<OnChainDetail>(`/launch/on-chain/detail?project_id=${id}`),
    enabled: !!id,
  });

  const tiers = useMemo(() => {
    if (!data) return [] as { key: string; label: string; amountRaw: string }[];
    const target = scaleMicroToUsdtRaw(data.target_financing_micro_usdt);
    return [
      {
        key: 'A',
        label: t('studio2.deposit.optA'),
        amountRaw: (target / 10n).toString(),
      },
      {
        key: 'B',
        label: t('studio2.deposit.optB'),
        amountRaw: (target / 20n).toString(),
      },
      {
        key: 'C',
        label: t('studio2.deposit.optC'),
        amountRaw: '30000000000',
      },
    ];
  }, [data, t]);

  const [selectedTier, setSelectedTier] = useState<string>('A');
  const [method, setMethod] = useState<Method>('platform');
  const [txHash, setTxHash] = useState('');

  const activeTier = tiers.find((x) => x.key === selectedTier) ?? tiers[0];
  const amountRaw = activeTier?.amountRaw ?? '0';
  const balance = BigInt(usdtRaw || '0');
  const amount = BigInt(amountRaw || '0');
  const after = balance - amount;
  const insufficient = method === 'platform' && after < 0n;

  const m = useMutation({
    mutationFn: async () => {
      await apiFetch(`/launch/project/${id}/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method,
          amount_usdt_raw: amountRaw,
          currency: 'USDT',
          ...(method === 'wallet' ? { tx_hash: txHash } : {}),
        }),
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['launch', 'on-chain', 'detail', id] });
      await qc.invalidateQueries({ queryKey: ['creator', 'my', 'projects'] });
      toast.success(t('studio2.deposit.paid'));
      nav(`/studio/project/${id}/overview`);
    },
    onError: (e) => {
      if (e instanceof ApiError && e.code === 4020) {
        toast.error(t('errors.4020'));
      } else {
        toast.error(e instanceof ApiError ? e.msg : String(e));
      }
    },
  });

  return (
    <RequireCreator>
      <AppShell>
        <div className="flex flex-col gap-3 p-3 pb-8">
          <div className="flex items-center gap-2">
            <button type="button" className="rounded-lg p-2 hover:bg-white/5" onClick={() => nav(-1)}>
              <ChevronLeft className="size-5" />
            </button>
            <h1 className="text-lg font-semibold">{t('studio.deposit')}</h1>
          </div>

          <p className="rounded-xl bg-warn-500/10 p-2 text-[11px] text-warn-500">
            {t('studio2.deposit.banner')}
          </p>

          {isPending || !data ? <Skeleton className="h-28 w-full rounded-2xl" /> : null}

          <section>
            <p className="mb-1.5 text-xs font-semibold text-text-secondary">
              {t('studio2.deposit.tip3')}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {tiers.map((x) => (
                <button
                  key={x.key}
                  type="button"
                  onClick={() => setSelectedTier(x.key)}
                  className={cn(
                    'flex flex-col items-start rounded-2xl border p-3 text-left transition',
                    selectedTier === x.key
                      ? 'border-accent-500/70 bg-accent-500/10'
                      : 'border-white/10 bg-surface hover:border-white/20',
                  )}
                >
                  <span className="text-[10px] text-text-secondary">{x.label}</span>
                  <span className="mt-1 font-mono text-sm font-semibold tabular-nums text-text-primary">
                    {formatUsdtFromRaw(x.amountRaw, i18n.language)}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section>
            <p className="mb-1.5 text-xs font-semibold text-text-secondary">
              {t('studio2.deposit.method')}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <MethodPill active={method === 'platform'} onClick={() => setMethod('platform')}>
                {t('studio2.deposit.methodPlatform')}
              </MethodPill>
              <MethodPill active={method === 'wallet'} onClick={() => setMethod('wallet')}>
                {t('studio2.deposit.methodWallet')}
              </MethodPill>
            </div>
          </section>

          {method === 'platform' ? (
            <div className="rounded-2xl bg-surface p-3 text-sm ring-1 ring-white/10">
              <Row label={t('studio2.deposit.balance')}>
                <span className="font-mono tabular-nums">
                  {formatUsdtFromRaw(usdtRaw, i18n.language)}
                </span>
              </Row>
              <Row label={t('studio2.deposit.afterDeduct')}>
                <span
                  className={cn(
                    'font-mono tabular-nums',
                    insufficient ? 'text-danger-500' : 'text-text-primary',
                  )}
                >
                  {formatUsdtFromRaw(after < 0n ? '0' : after.toString(), i18n.language)}
                </span>
              </Row>
              {insufficient ? (
                <div className="mt-2 flex items-center justify-between rounded-xl bg-danger-500/10 px-3 py-2 text-xs text-danger-500">
                  <span>{t('studio2.deposit.insufficient')}</span>
                  <button
                    type="button"
                    className="underline"
                    onClick={() => nav('/wallet/recharge')}
                  >
                    {t('studio2.deposit.goRecharge')}
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-col gap-2 rounded-2xl bg-surface p-3 text-sm ring-1 ring-white/10">
              <Row label={t('studio2.deposit.receiver')}>
                <button
                  type="button"
                  className="flex items-center gap-1 font-mono text-xs text-primary-500"
                  onClick={() => {
                    navigator.clipboard?.writeText(DEPOSIT_RECEIVER);
                    toast.success(t('common.copied'));
                  }}
                >
                  <Wallet className="size-3" />
                  <span>{`${DEPOSIT_RECEIVER.slice(0, 8)}…${DEPOSIT_RECEIVER.slice(-6)}`}</span>
                  <Copy className="size-3" />
                </button>
              </Row>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-text-secondary">{t('studio2.deposit.txHash')}</span>
                <Input
                  placeholder={String(t('studio2.deposit.txHashPh'))}
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value.trim())}
                  className="font-mono text-xs"
                />
              </label>
            </div>
          )}

          <Button
            loading={m.isPending}
            disabled={(method === 'platform' && insufficient) || (method === 'wallet' && !txHash)}
            onClick={() => m.mutate()}
          >
            {method === 'platform' ? t('studio.deposit') : t('studio2.deposit.confirmPaid')}
          </Button>
        </div>
      </AppShell>
    </RequireCreator>
  );
}

function MethodPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-2xl border px-3 py-2 text-sm font-medium transition',
        active
          ? 'border-accent-500/70 bg-accent-500/10 text-text-primary'
          : 'border-white/10 bg-surface text-text-secondary hover:border-white/20',
      )}
    >
      {children}
    </button>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1 text-xs">
      <span className="text-text-secondary">{label}</span>
      {children}
    </div>
  );
}
