import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ApiError, apiFetch } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatUsdtFromRaw, usdtToRaw } from '@/lib/fmt';
import { useUserStore } from '@/stores/useUserStore';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { RequireInvestor } from '@/routes/guards';

type Target = 'exchange' | 'wallet';

export default function WithdrawPage() {
  const nav = useNavigate();
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const qc = useQueryClient();
  const usdtRaw = useUserStore((s) => s.usdt_raw);
  const walletAddr = useUserStore((s) => s.wallet_address) ?? '';

  const [amt, setAmt] = useState('');
  const [target, setTarget] = useState<Target>('wallet');
  const [addr, setAddr] = useState(walletAddr);

  const balance = Number(usdtRaw) / 1e6;
  const amtNum = parseFloat(amt) || 0;
  const insufficient = amtNum > balance;
  const isValid = amtNum >= 1 && addr.trim().length > 0 && !insufficient;

  const m = useMutation({
    mutationFn: () =>
      apiFetch('/wallet/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currency: 'USDT',
          amount_raw: usdtToRaw(amt),
          target_type: target === 'exchange' ? 'cex' : 'external',
          target_addr_or_uid: addr.trim(),
        }),
      }),
    onSuccess: async () => {
      toast.success(t('wallet2.withdrawOk'));
      await qc.invalidateQueries({ queryKey: ['wallet', 'summary'] });
      nav(-1);
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.msg : String(e)),
  });

  return (
    <RequireInvestor>
      <AppShell hideTab>
        <div className="flex flex-1 flex-col overflow-y-auto">
          <div className="flex h-12 shrink-0 items-center gap-2 px-2">
            <button
              type="button"
              className="rounded-lg p-2 text-text-secondary hover:bg-white/5"
              onClick={() => nav(-1)}
            >
              <ChevronLeft className="size-5" />
            </button>
            <h1 className="flex-1 text-base font-semibold">{t('wallet.withdraw')}</h1>
          </div>

          <div className="flex flex-col gap-4 px-3 pb-8 pt-1">
            {/* Available balance */}
            <div className="rounded-2xl bg-surface px-4 py-3">
              <p className="text-[11px] text-text-secondary">{t('wallet.available')}</p>
              <p className="text-xl font-bold tabular-nums">
                {formatUsdtFromRaw(usdtRaw, locale)}
              </p>
            </div>

            {/* Target type */}
            <div>
              <p className="mb-2 text-xs text-text-secondary">{t('wallet.withdrawTarget')}</p>
              <div className="grid grid-cols-2 gap-2">
                {(['exchange', 'wallet'] as const).map((tp) => (
                  <button
                    key={tp}
                    type="button"
                    onClick={() => {
                      setTarget(tp);
                      setAddr(tp === 'wallet' ? walletAddr : '');
                    }}
                    className={cn(
                      'rounded-xl border py-2.5 text-sm font-medium transition',
                      target === tp
                        ? 'border-primary-500/60 bg-primary-500/15 text-text-primary'
                        : 'border-white/10 bg-elevated text-text-secondary hover:border-white/20',
                    )}
                  >
                    {tp === 'exchange' ? t('wallet.targetExchange') : t('wallet.targetWallet')}
                  </button>
                ))}
              </div>
            </div>

            {/* Address / UID */}
            <div>
              <p className="mb-2 text-xs text-text-secondary">
                {target === 'exchange' ? t('wallet.cexUid') : t('wallet.chainAddr')}
              </p>
              <Input
                value={addr}
                onChange={(e) => setAddr(e.target.value)}
                placeholder={target === 'exchange' ? 'UID / address' : '0x...'}
              />
            </div>

            {/* Amount */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs text-text-secondary">{t('wallet.withdrawAmount')}</p>
                <button
                  type="button"
                  className="text-[11px] text-accent-500"
                  onClick={() => setAmt(balance.toFixed(2))}
                >
                  MAX
                </button>
              </div>
              <Input
                type="number"
                value={amt}
                onChange={(e) => setAmt(e.target.value)}
                placeholder="0.00"
              />
              {insufficient ? (
                <p className="mt-1 text-[11px] text-danger-500">{t('wallet.insufficient')}</p>
              ) : null}
            </div>

            <Button disabled={!isValid} loading={m.isPending} onClick={() => m.mutate()}>
              {t('wallet.confirmWithdraw')} {isValid ? `$${amtNum.toFixed(2)}` : ''}
            </Button>
          </div>
        </div>
      </AppShell>
    </RequireInvestor>
  );
}
