import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { CoBuilderLayout } from '@/pages/co-builder/CoBuilderLayout';
import { DynamicPriceTicker } from '@/components/co-builder/DynamicPriceTicker';
import { PurchaseSheet } from '@/components/co-builder/PurchaseSheet';
import { TierCard } from '@/components/co-builder/TierCard';
import { apiFetch } from '@/lib/api';
import { useUserStore } from '@/stores/useUserStore';
import { useUIStore } from '@/stores/useUIStore';
import type { CoBuilderIndexData, CoBuilderLivePrice, MemberLevel, TierCardData } from '@/types/coBuilder';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowDownToLine, ArrowRight, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface MemberSummaryLite {
  level: MemberLevel;
}

export default function BuyPage() {
  const logged = useUserStore((s) => s.is_logged_in());
  const setSheet = useUIStore((s) => s.setBottomSheet);

  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [selectedQty, setSelectedQty] = useState(100);

  const { data: idx, isLoading } = useQuery({
    queryKey: ['co-builder', 'index'],
    queryFn: () => apiFetch<CoBuilderIndexData>('/co-builder/index'),
  });

  const { data: live } = useQuery({
    queryKey: ['co-builder', 'price', 'live'],
    queryFn: () => apiFetch<CoBuilderLivePrice>('/co-builder/price/live'),
    refetchInterval: 5_000,
  });

  const { data: my } = useQuery({
    queryKey: ['co-builder', 'member', 'my'],
    queryFn: () => apiFetch<MemberSummaryLite>('/co-builder/member/my'),
    enabled: logged,
  });

  const myLevel: MemberLevel = my?.level ?? 'none';
  const livePrice = live?.unit_price ?? idx?.unit_price ?? 100;

  const onTierBuy = (tier: TierCardData) => {
    if (!logged) {
      setSheet('connect');
      return;
    }
    setSelectedQty(tier.base_contribution);
    setPurchaseOpen(true);
  };

  const onHeroCta = () => {
    if (!logged) {
      setSheet('connect');
      return;
    }
    setSelectedQty(100);
    setPurchaseOpen(true);
  };

  return (
    <CoBuilderLayout>
      <div className="space-y-4 px-3 pb-32 pt-1">
        <Hero onCta={onHeroCta} loggedIn={logged} />

        {isLoading || !idx ? (
          <div className="space-y-3">
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-48 rounded-3xl" />
          </div>
        ) : (
          <>
            <EcoStats idx={idx} />
            <DynamicPriceTicker
              unitPrice={livePrice}
              soldTotal={live?.sold_total ?? idx.sold_total}
              nextThresholdAt={live?.next_threshold_at ?? idx.next_threshold_at}
              thresholdStep={idx.threshold_step}
              stepIncreasePct={idx.step_increase_pct}
            />
            <div className="space-y-3">
              {idx.tiers.map((t, i) => (
                <motion.div
                  key={t.level}
                  initial={{ y: 12, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.05 + i * 0.04, duration: 0.32 }}
                >
                  <TierCard tier={t} myLevel={myLevel} onBuy={() => onTierBuy(t)} />
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>

      <StickyCta onClick={onHeroCta} loggedIn={logged} unitPrice={livePrice} />

      {idx ? (
        <PurchaseSheet
          open={purchaseOpen}
          onClose={() => setPurchaseOpen(false)}
          initialQty={selectedQty}
          index={idx}
        />
      ) : null}
    </CoBuilderLayout>
  );
}

function Hero({ onCta, loggedIn }: { onCta: () => void; loggedIn: boolean }) {
  const { t } = useTranslation();
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-elevated/90 p-4">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full opacity-50 blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(255,61,139,0.45), transparent 65%)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-12 -left-12 size-44 rounded-full opacity-40 blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.45), transparent 60%)' }}
      />
      <div className="relative">
        <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-text-primary">
          <Sparkles className="size-3" />
          {t('coBuilder.brand')}
        </span>
        <h1 className="mt-2 text-xl font-extrabold leading-tight">
          <span className="bg-accent-gradient bg-clip-text text-transparent">
            {t('coBuilder.hero.title')}
          </span>
        </h1>
        <p className="mt-1.5 text-[11px] leading-relaxed text-text-secondary">
          {t('coBuilder.hero.subtitle')}
        </p>
        <Button variant="primary" className="mt-3" onClick={onCta}>
          {loggedIn ? t('coBuilder.hero.cta') : t('coBuilder.hero.connectFirst')}
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function EcoStats({ idx }: { idx: CoBuilderIndexData }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-3xl border border-white/8 bg-surface/85 p-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-[0.16em] text-text-secondary">
          {t('coBuilder.eco.title')}
        </p>
        <span className="text-[10px] text-text-secondary tabular-nums">
          {(idx.first_year_release_pct * 100).toFixed(0)}% · Y1
        </span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
        <Cell label={t('coBuilder.eco.poolTotal')} value={`${(idx.pool_total / 1e9).toFixed(1)}B ENT`} />
        <Cell
          label={t('coBuilder.eco.firstYear')}
          value={`${(idx.first_year_release / 1e9).toFixed(2)}B ENT`}
        />
        <Cell
          label={t('coBuilder.eco.currentTotal')}
          value={`${idx.total_contribution_platform.toLocaleString()}A`}
          full
        />
      </div>
      <div className="mt-3 space-y-1.5">
        <div className="flex justify-between text-[10px] text-text-secondary">
          <span>
            {t('coBuilder.eco.base')} {(idx.weights.base * 100).toFixed(0)}%
          </span>
          <span>
            {t('coBuilder.eco.floating')} {(idx.weights.floating * 100).toFixed(0)}%
          </span>
          <span>
            {t('coBuilder.eco.identity')} {(idx.weights.identity * 100).toFixed(0)}%
          </span>
        </div>
        <div className="flex h-1.5 overflow-hidden rounded-full bg-white/8">
          <div className="bg-info-500" style={{ width: `${idx.weights.base * 100}%` }} />
          <div className="bg-accent-500" style={{ width: `${idx.weights.floating * 100}%` }} />
          <div className="bg-primary-500" style={{ width: `${idx.weights.identity * 100}%` }} />
        </div>
      </div>
    </div>
  );
}

function Cell({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div
      className={['rounded-2xl bg-white/5 px-2.5 py-2 ring-1 ring-white/8', full ? 'col-span-2' : ''].join(' ')}
    >
      <p className="text-[10px] text-text-secondary">{label}</p>
      <p className="mt-0.5 text-sm font-bold tabular-nums">{value}</p>
    </div>
  );
}

function StickyCta({
  onClick,
  loggedIn,
  unitPrice,
}: {
  onClick: () => void;
  loggedIn: boolean;
  unitPrice: number;
}) {
  const { t } = useTranslation();
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-14 z-20 flex justify-center px-3 pb-2">
      <div className="pointer-events-auto flex w-full items-center justify-between gap-3 rounded-full border border-white/10 bg-elevated/95 px-3 py-2 shadow-2xl backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-full bg-accent-gradient text-white">
            <ArrowDownToLine className="size-4" />
          </span>
          <div className="leading-tight">
            <p className="text-[10px] text-text-secondary">{t('coBuilder.price.label')}</p>
            <p className="text-sm font-bold tabular-nums">{unitPrice.toFixed(2)} USDT</p>
          </div>
        </div>
        <Button size="sm" variant="primary" onClick={onClick}>
          {loggedIn ? t('coBuilder.hero.cta') : t('coBuilder.hero.connectFirst')}
        </Button>
      </div>
    </div>
  );
}
