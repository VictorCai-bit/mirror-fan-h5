import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { ApiError, apiFetch } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatUsdtFromRaw } from '@/lib/fmt';
import { RequireCreator } from '@/routes/guards';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Lock, Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

interface VaultData {
  distribution: { early?: number; shield?: number; eco?: number; creator?: number };
  unlocked_a: { pct: number; usdt_raw: string };
  unlocked_b: { nodes: number; claimed_raw: string };
  claimable_raw: string;
  logs?: { ts: number; kind: string; usdt_raw: string }[];
}

export default function StudioProjectVault() {
  const { id } = useParams();
  const nav = useNavigate();
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();

  const { data, isPending } = useQuery({
    queryKey: ['creator', 'project', 'vault', id],
    queryFn: () => apiFetch<VaultData>(`/creator/project/${id}/vault`),
    enabled: !!id,
  });

  const release = useMutation({
    mutationFn: () =>
      apiFetch(`/launch/project/${id}/vesting/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      }),
    onSuccess: async () => {
      toast.success(t('studio2.vault.claim'));
      await qc.invalidateQueries({ queryKey: ['creator', 'project', 'vault', id] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.msg : String(e)),
  });

  return (
    <RequireCreator>
      <AppShell>
        <div className="flex flex-col gap-3 p-3 pb-8">
          <div className="flex items-center gap-2">
            <button type="button" className="rounded-lg p-2 hover:bg-white/5" onClick={() => nav(-1)}>
              <ChevronLeft className="size-5" />
            </button>
            <h1 className="text-lg font-semibold">{t('studio.vault')}</h1>
          </div>

          {isPending || !data ? <Skeleton className="h-48 w-full rounded-2xl" /> : null}

          {data ? (
            <section className="rounded-2xl bg-surface p-4 ring-1 ring-white/10">
              <p className="mb-2 text-xs font-semibold text-text-secondary">
                {t('studio2.vault.split')}
              </p>
              <DistributionBar
                segments={[
                  { key: 'raise', color: 'bg-accent-500', pct: data.distribution.creator ?? 60, label: t('studio2.vault.splitRaise') },
                  { key: 'shield', color: 'bg-primary-500', pct: data.distribution.shield ?? 20, label: t('studio2.vault.splitStable') },
                  { key: 'eco', color: 'bg-info-500', pct: data.distribution.eco ?? 10, label: t('studio2.vault.splitEco') },
                  { key: 'creator', color: 'bg-success-500', pct: data.distribution.early ?? 10, label: t('studio2.vault.splitCreator') },
                ]}
              />
            </section>
          ) : null}

          {data ? (
            <div className="grid grid-cols-2 gap-2">
              <Block
                title={t('studio2.vault.blockA')}
                subtitle={`${t('studio2.vault.blockAItems')} · ${data.unlocked_a.pct}%`}
                value={formatUsdtFromRaw(data.unlocked_a.usdt_raw, i18n.language)}
                icon={<Wallet className="size-4 text-accent-500" />}
              />
              <Block
                title={t('studio2.vault.blockB')}
                subtitle={`${t('studio2.vault.blockBItems')}`}
                value={formatUsdtFromRaw(data.unlocked_b.claimed_raw || '0', i18n.language)}
                icon={<Lock className="size-4 text-primary-500" />}
              />
            </div>
          ) : null}

          {data ? (
            <section className="rounded-2xl bg-surface p-4 ring-1 ring-white/10">
              <p className="text-xs text-text-secondary">{t('studio2.vault.claim')}</p>
              <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-text-primary">
                {formatUsdtFromRaw(data.claimable_raw, i18n.language)}
              </p>
              <Button
                className="mt-3 w-full"
                loading={release.isPending}
                onClick={() => release.mutate()}
              >
                {t('studio2.vault.claim')}
              </Button>
            </section>
          ) : null}
        </div>
      </AppShell>
    </RequireCreator>
  );
}

function DistributionBar({
  segments,
}: {
  segments: { key: string; color: string; pct: number; label: string }[];
}) {
  const total = segments.reduce((a, b) => a + b.pct, 0) || 100;
  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-black/30">
        {segments.map((s) => (
          <div
            key={s.key}
            className={cn(s.color, 'h-full')}
            style={{ width: `${(s.pct / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        {segments.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5 text-[11px] text-text-secondary">
            <span className={cn('size-2 rounded-full', s.color)} />
            <span className="flex-1 truncate">{s.label}</span>
            <span className="font-mono text-text-primary">{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Block({
  title,
  subtitle,
  value,
  icon,
}: {
  title: string;
  subtitle: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-surface p-3 ring-1 ring-white/10">
      <div className="flex items-center gap-1.5 text-[11px] text-text-secondary">
        {icon}
        <span>{title}</span>
      </div>
      <p className="mt-1 font-mono text-sm font-semibold tabular-nums text-text-primary">{value}</p>
      <p className="mt-0.5 text-[10px] text-text-secondary">{subtitle}</p>
    </div>
  );
}
