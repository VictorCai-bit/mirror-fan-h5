import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { apiFetch } from '@/lib/api';
import { translateCoBuilderApiError } from '@/lib/apiErrors';
import { cn } from '@/lib/cn';
import { shortenAddress } from '@/lib/fmt';
import type { CoBuilderClaimResult, CoBuilderClaimType } from '@/types/coBuilder';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Building2, CheckCircle2, Copy, Wallet } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
  claimable: number;
  walletAddress: string | null;
}

const SOLANA_ADDR_RE = /^[1-9A-HJ-NP-Za-km-z]{24,64}$/;

export function EntClaimSheet({ open, onClose, claimable, walletAddress }: Props) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<CoBuilderClaimType>('platform');
  const [addr, setAddr] = useState('');
  const [result, setResult] = useState<CoBuilderClaimResult | null>(null);

  useEffect(() => {
    if (open) {
      setAmount('');
      setType('platform');
      setAddr(walletAddress ?? '');
      setResult(null);
    }
  }, [open, walletAddress]);

  const numericAmount = useMemo(() => {
    const n = Number(amount);
    return Number.isFinite(n) ? n : 0;
  }, [amount]);
  const fee = useMemo(() => Math.round(numericAmount * 0.1 * 1000) / 1000, [numericAmount]);
  const actual = useMemo(() => Math.round((numericAmount - fee) * 1000) / 1000, [numericAmount, fee]);

  const error = useMemo(() => {
    if (!amount) return null;
    if (numericAmount <= 0) return t('coBuilder.claim.errors.amountRequired');
    if (numericAmount < 0.01) return t('coBuilder.claim.errors.amountTooSmall');
    if (numericAmount > claimable + 1e-6) return t('coBuilder.claim.errors.amountExceed');
    return null;
  }, [amount, numericAmount, claimable, t]);

  const addrError = useMemo(() => {
    if (type !== 'onchain') return null;
    if (!addr.trim()) return t('coBuilder.claim.errors.addrRequired');
    if (!SOLANA_ADDR_RE.test(addr.trim())) return t('coBuilder.claim.errors.addrInvalid');
    return null;
  }, [type, addr, t]);

  const claim = useMutation({
    mutationFn: () =>
      apiFetch<CoBuilderClaimResult>('/co-builder/ent/claim', {
        method: 'POST',
        body: JSON.stringify({
          amount: numericAmount,
          claim_type: type,
          to_address: type === 'onchain' ? addr.trim() : undefined,
        }),
        headers: { 'content-type': 'application/json' },
      }),
    onSuccess: (r) => {
      setResult(r);
      void qc.invalidateQueries({ queryKey: ['co-builder', 'member', 'my'] });
    },
    onError: (e) => {
      toast.error(translateCoBuilderApiError(e, t, 'common.networkError'));
    },
  });

  const onClaim = () => {
    if (error) {
      toast.error(error);
      return;
    }
    if (addrError) {
      toast.error(addrError);
      return;
    }
    if (!amount || numericAmount <= 0) {
      toast.error(t('coBuilder.claim.errors.amountRequired'));
      return;
    }
    claim.mutate();
  };

  const onCopyClaimNo = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.claim_no);
      toast.success(t('common.copied'));
    } catch {
      /* ignore */
    }
  };

  const onMax = () => setAmount(claimable.toFixed(3));

  if (result) {
    return (
      <BottomSheet open={open} onClose={onClose} title={t('coBuilder.claim.successTitle')}>
        <motion.div
          className="flex flex-col items-center gap-3 pb-4 pt-2"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <span className="flex size-14 items-center justify-center rounded-full bg-success-500/15 text-success-400 ring-2 ring-success-500/30">
            <CheckCircle2 className="size-8" />
          </span>
          <p className="text-sm text-text-secondary">{t('coBuilder.claim.successBody')}</p>
          <p className="text-3xl font-extrabold tabular-nums text-text-primary">
            +{result.actual_amount.toFixed(3)} ENT
          </p>
          <div className="w-full space-y-2 rounded-2xl bg-elevated/80 px-3 py-3">
            <Row label={t('coBuilder.claim.amountLabel')} value={`${result.amount.toFixed(3)} ENT`} />
            <Row
              label={t('coBuilder.claim.feeLabel')}
              value={`-${result.service_fee_amount.toFixed(3)} ENT`}
            />
            <Row
              label={t('coBuilder.claim.actualLabel')}
              value={`${result.actual_amount.toFixed(3)} ENT`}
              emphasized
            />
            <Row
              label={t('coBuilder.claim.typeLabel')}
              value={
                result.claim_type === 'platform'
                  ? t('coBuilder.claim.typePlatform')
                  : shortenAddress(result.to_address ?? '', 6, 4)
              }
            />
            <Row
              label={t('coBuilder.claim.claimNo')}
              value={
                <button
                  type="button"
                  onClick={onCopyClaimNo}
                  className="inline-flex items-center gap-1 font-mono text-text-primary"
                >
                  {result.claim_no}
                  <Copy className="size-3 text-text-secondary" />
                </button>
              }
            />
          </div>
          <Button variant="primary" className="w-full" onClick={onClose}>
            {t('coBuilder.claim.backToMember')}
          </Button>
        </motion.div>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={t('coBuilder.claim.title')}>
      <div className="space-y-3 pb-2">
        <div className="rounded-2xl bg-elevated/80 px-3 py-3">
          <p className="text-[10px] uppercase tracking-wider text-text-secondary">
            {t('coBuilder.claim.claimableLabel')}
          </p>
          <p className="text-2xl font-bold tabular-nums">{claimable.toFixed(3)} ENT</p>
        </div>

        <div>
          <p className="mb-1.5 text-[11px] text-text-secondary">{t('coBuilder.claim.amountLabel')}</p>
          <Input
            inputMode="decimal"
            placeholder={t('coBuilder.claim.amountPlaceholder')}
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
            error={error ?? undefined}
            suffix={
              <button
                type="button"
                onClick={onMax}
                className="rounded-full bg-primary-500/15 px-2 py-0.5 text-[10px] font-bold text-primary-500"
              >
                {t('coBuilder.claim.max')}
              </button>
            }
          />
        </div>

        <div>
          <p className="mb-1.5 text-[11px] text-text-secondary">{t('coBuilder.claim.typeLabel')}</p>
          <div className="grid grid-cols-2 gap-2">
            <TypeBtn
              icon={<Building2 className="size-4" />}
              label={t('coBuilder.claim.typePlatform')}
              active={type === 'platform'}
              onClick={() => setType('platform')}
            />
            <TypeBtn
              icon={<Wallet className="size-4" />}
              label={t('coBuilder.claim.typeChain')}
              active={type === 'onchain'}
              onClick={() => setType('onchain')}
            />
          </div>
        </div>

        {type === 'onchain' ? (
          <div>
            <p className="mb-1.5 text-[11px] text-text-secondary">{t('coBuilder.claim.addrLabel')}</p>
            <Input
              placeholder={t('coBuilder.claim.addrPlaceholder')}
              value={addr}
              onChange={(e) => setAddr(e.target.value)}
              error={addrError ?? undefined}
            />
          </div>
        ) : null}

        <div className="space-y-1.5 rounded-2xl bg-white/4 px-3 py-2.5">
          <Row
            label={t('coBuilder.claim.feeLabel')}
            value={
              <span className="text-text-primary">
                {fee.toFixed(3)} ENT
                <span className="ml-1 text-[10px] text-text-secondary">
                  ({t('coBuilder.claim.feeNote')})
                </span>
              </span>
            }
          />
          <Row
            label={t('coBuilder.claim.actualLabel')}
            value={<span className="font-bold text-text-primary">{actual.toFixed(3)} ENT</span>}
            emphasized
          />
        </div>

        <Button variant="primary" className="w-full" loading={claim.isPending} onClick={onClaim}>
          {claim.isPending ? t('coBuilder.claim.confirming') : t('coBuilder.claim.confirmCta')}
        </Button>
      </div>
    </BottomSheet>
  );
}

function TypeBtn({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-1 rounded-2xl border bg-white/4 px-3 py-2.5 text-xs transition-all',
        active
          ? 'border-primary-500/60 bg-primary-500/10 ring-2 ring-primary-500/30 text-primary-500'
          : 'border-white/10 text-text-secondary hover:bg-white/8',
      )}
    >
      {icon}
      <span className="font-semibold">{label}</span>
    </button>
  );
}

function Row({
  label,
  value,
  emphasized,
}: {
  label: string;
  value: React.ReactNode;
  emphasized?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-text-secondary">{label}</span>
      <span className={emphasized ? 'text-text-primary' : 'text-text-primary/90'}>{value}</span>
    </div>
  );
}
