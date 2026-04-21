import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ApiError, apiFetch } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatUsdtFromRaw, usdtToRaw } from '@/lib/fmt';
import { useUserStore } from '@/stores/useUserStore';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Copy } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { RequireInvestor } from '@/routes/guards';

const PRESET_AMOUNTS = ['100', '500', '1000', '5000'];
const PLATFORM_ADDR = '8aX3...9fE2';

export default function RechargePage() {
  const nav = useNavigate();
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const qc = useQueryClient();
  const usdtRaw = useUserStore((s) => s.usdt_raw);
  const patchBalances = useUserStore((s) => s.patchBalances);

  const [amt, setAmt] = useState('500');
  const [copied, setCopied] = useState(false);

  const m = useMutation({
    mutationFn: () =>
      apiFetch('/wallet/recharge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currency: 'USDT', amount_raw: usdtToRaw(amt) }),
      }),
    onSuccess: async () => {
      const added = Number(usdtToRaw(amt));
      patchBalances({ usdt_raw: String(Number(usdtRaw) + added) });
      toast.success(t('wallet2.rechargeOk'));
      await qc.invalidateQueries({ queryKey: ['wallet', 'summary'] });
      nav(-1);
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.msg : String(e)),
  });

  const amtNum = parseFloat(amt) || 0;
  const isValid = amtNum >= 1;

  function copyAddr() {
    void navigator.clipboard.writeText(PLATFORM_ADDR).then(() => {
      setCopied(true);
      toast.success(t('common.copied'));
      setTimeout(() => setCopied(false), 2000);
    });
  }

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
            <h1 className="flex-1 text-base font-semibold">{t('wallet.recharge')}</h1>
          </div>

          <div className="flex flex-col gap-4 px-3 pb-8 pt-1">
            {/* Current balance */}
            <div className="rounded-2xl bg-surface px-4 py-3">
              <p className="text-[11px] text-text-secondary">{t('wallet.usdt')}</p>
              <p className="text-xl font-bold tabular-nums">
                {formatUsdtFromRaw(usdtRaw, locale)}
              </p>
            </div>

            {/* Preset amount chips */}
            <div>
              <p className="mb-2 text-xs text-text-secondary">{t('wallet.rechargeAmount')}</p>
              <div className="grid grid-cols-4 gap-2">
                {PRESET_AMOUNTS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setAmt(p)}
                    className={cn(
                      'rounded-xl py-2 text-sm font-semibold transition',
                      amt === p
                        ? 'bg-primary-500 text-white shadow-md shadow-primary-500/30'
                        : 'bg-white/8 text-text-secondary hover:bg-white/12',
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom amount */}
            <div>
              <p className="mb-2 text-xs text-text-secondary">{t('wallet.customAmount')}</p>
              <Input
                type="number"
                value={amt}
                onChange={(e) => setAmt(e.target.value)}
                placeholder="0.00"
              />
            </div>

            {/* Platform deposit address */}
            <div className="rounded-2xl bg-surface p-4">
              <p className="mb-2 text-xs font-medium text-text-secondary">{t('wallet.rechargeAddr')}</p>
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono text-sm text-text-primary">{PLATFORM_ADDR}</p>
                <button
                  type="button"
                  onClick={copyAddr}
                  className="flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-[11px] text-text-secondary hover:bg-white/15"
                >
                  <Copy className="size-3.5" />
                  {copied ? t('common.copied') : t('common.copy')}
                </button>
              </div>
              <p className="mt-2 text-[10px] text-text-secondary/60">
                {t('wallet.rechargeNote')}
              </p>
            </div>

            <Button
              disabled={!isValid}
              loading={m.isPending}
              onClick={() => m.mutate()}
            >
              {t('wallet.confirmRecharge')} {isValid ? `$${amtNum.toFixed(2)}` : ''}
            </Button>
          </div>
        </div>
      </AppShell>
    </RequireInvestor>
  );
}
