import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { resetDb } from '@/mocks/db';
import { setLevelOverride } from '@/mocks/db/coBuilder';
import { useUserStore, type MockWalletProfile } from '@/stores/useUserStore';
import { useUIStore } from '@/stores/useUIStore';
import { cn } from '@/lib/cn';
import type { MemberLevel } from '@/types/coBuilder';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

const WALLET_PROFILES: { key: MockWalletProfile; i18n: 'wRich' | 'wPoor' | 'wNew'; color: string }[] = [
  { key: 'rich', i18n: 'wRich', color: 'bg-success-500/15 text-success-400 ring-success-500/30' },
  { key: 'poor', i18n: 'wPoor', color: 'bg-warning-500/15 text-warning-400 ring-warning-500/30' },
  { key: 'new', i18n: 'wNew', color: 'bg-white/10 text-text-secondary ring-white/20' },
];

const ALL_PROJECTS = [1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008];

const CO_BUILDER_LEVELS: { key: MemberLevel | 'auto'; i18n: string; tone: string }[] = [
  { key: 'auto', i18n: 'lAuto', tone: 'bg-white/8 text-text-secondary ring-white/15' },
  { key: 'none', i18n: 'lNone', tone: 'bg-white/10 text-text-secondary ring-white/20' },
  { key: 'base', i18n: 'lBase', tone: 'bg-success-500/15 text-success-400 ring-success-500/30' },
  { key: 'active', i18n: 'lActive', tone: 'bg-warning-500/15 text-warning-400 ring-warning-500/30' },
  { key: 'regional', i18n: 'lRegional', tone: 'bg-info-500/15 text-info-400 ring-info-500/30' },
  { key: 'ecosystem', i18n: 'lEcosystem', tone: 'bg-accent-500/15 text-accent-400 ring-accent-500/30' },
  { key: 'global', i18n: 'lGlobal', tone: 'bg-primary-500/15 text-primary-500 ring-primary-500/30' },
];

export function DebugSheet() {
  const { t } = useTranslation();
  const open = useUIStore((s) => s.debugOpen);
  const setDebugOpen = useUIStore((s) => s.setDebugOpen);
  const setAlways500 = useUIStore((s) => s.setAlways500);
  const always500 = useUIStore((s) => s.always500);
  const creatorOf = useUserStore((s) => s.creator_of);
  const setCreatorOf = useUserStore((s) => s.set_creator_of);
  const connect = useUserStore((s) => s.connect);
  const qc = useQueryClient();
  const [coBuilderLevel, setCoBuilderLevel] = useState<MemberLevel | 'auto'>(() => {
    try {
      const raw = localStorage.getItem('mirror-co-builder-db-v1');
      if (!raw) return 'auto';
      const parsed = JSON.parse(raw) as { level_override?: MemberLevel | null };
      if (parsed.level_override == null) return 'auto';
      return parsed.level_override;
    } catch {
      return 'auto';
    }
  });

  const switchCoBuilderLevel = (key: MemberLevel | 'auto') => {
    setLevelOverride(key === 'auto' ? null : key);
    setCoBuilderLevel(key);
    void qc.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).includes('co-builder') });
    if (key === 'auto') {
      toast.success(t('appDebug.coToAuto'));
      return;
    }
    const row = CO_BUILDER_LEVELS.find((l) => l.key === key);
    const name = row ? t(`appDebug.${row.i18n}` as 'appDebug.lAuto') : '';
    toast.success(t('appDebug.coToLevel', { name }));
  };

  return (
    <BottomSheet open={open} onClose={() => setDebugOpen(false)} title={t('appDebug.title')}>
      <div className="space-y-5 pb-8">
        <div className="rounded-xl bg-orange-400/10 px-3 py-2.5 text-[11px] leading-relaxed text-orange-300/80">
          {t('appDebug.protoBanner')}
        </div>

        <Section title={t('appDebug.secWallet')} desc={t('appDebug.secWalletDesc')}>
          <div className="flex flex-col gap-2">
            {WALLET_PROFILES.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => {
                  connect(p.key);
                  const label = t(`appDebug.${p.i18n}` as 'appDebug.wRich');
                  toast.success(t('appDebug.switched', { name: label }));
                }}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-left ring-1 transition hover:opacity-90',
                  p.color,
                )}
              >
                <div className="flex-1">
                  <p className="text-sm font-semibold">{t(`appDebug.${p.i18n}` as 'appDebug.wRich')}</p>
                  <p className="text-[10px] opacity-70">{t(`appDebug.${p.i18n}Desc` as 'appDebug.wRichDesc')}</p>
                </div>
              </button>
            ))}
          </div>
        </Section>

        <Section title={t('appDebug.secCoBuilder')} desc={t('appDebug.secCoBuilderDesc')}>
          <div className="grid grid-cols-2 gap-2">
            {CO_BUILDER_LEVELS.map((l) => {
              const active = coBuilderLevel === l.key;
              return (
                <button
                  key={l.key}
                  type="button"
                  onClick={() => switchCoBuilderLevel(l.key)}
                  className={cn(
                    'flex flex-col items-start gap-0.5 rounded-xl px-3 py-2 text-left ring-1 transition hover:opacity-90',
                    l.tone,
                    active && 'ring-2',
                  )}
                >
                  <span className="text-xs font-semibold">{t(`appDebug.${l.i18n}` as 'appDebug.lAuto')}</span>
                  <span className="text-[10px] leading-snug opacity-70">
                    {t(`appDebug.${l.i18n}Desc` as 'appDebug.lAutoDesc')}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-[10px] text-text-secondary">{t('appDebug.coBuilderHint')}</p>
        </Section>

        <Section title={t('appDebug.secCreator')} desc={t('appDebug.secCreatorDesc')}>
          <div className="flex flex-wrap gap-2">
            {ALL_PROJECTS.map((id) => {
              const on = creatorOf.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setCreatorOf(on ? creatorOf.filter((x) => x !== id) : [...creatorOf, id])}
                  className={cn(
                    'flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ring-1 transition',
                    on
                      ? 'bg-success-500/20 text-success-400 ring-success-500/40'
                      : 'bg-white/8 text-text-secondary ring-white/15 hover:bg-white/12',
                  )}
                >
                  {on ? '✓ ' : ''}
                  {t('appDebug.project', { id })}
                </button>
              );
            })}
          </div>
          {creatorOf.length > 0 ? (
            <p className="mt-1.5 text-[10px] text-success-400">
              {t('appDebug.creatorOn', { list: creatorOf.map((id) => `#${id}`).join(' ') })}
            </p>
          ) : (
            <p className="mt-1.5 text-[10px] text-text-secondary">{t('appDebug.creatorOff')}</p>
          )}
        </Section>

        <Section title={t('appDebug.secError')} desc={t('appDebug.secErrorDesc')}>
          <label
            className={cn(
              'flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 ring-1 transition',
              always500 ? 'bg-danger-500/15 ring-danger-500/40' : 'bg-white/6 ring-white/15',
            )}
          >
            <div className="relative flex h-5 w-9 items-center">
              <input
                type="checkbox"
                className="sr-only"
                checked={always500}
                onChange={(e) => {
                  setAlways500(e.target.checked);
                  toast(e.target.checked ? t('appDebug.toast500On') : t('appDebug.toast500Off'));
                }}
              />
              <div
                className={cn('h-5 w-9 rounded-full transition-colors', always500 ? 'bg-danger-500' : 'bg-white/20')}
              />
              <div
                className={cn(
                  'absolute size-3.5 rounded-full bg-white shadow transition-all',
                  always500 ? 'left-[18px]' : 'left-[2px]',
                )}
              />
            </div>
            <div>
              <p className={cn('text-sm font-medium', always500 ? 'text-danger-400' : 'text-text-secondary')}>
                {always500 ? t('appDebug.errOnLabel') : t('appDebug.errOffLabel')}
              </p>
              <p className="text-[10px] text-text-secondary/60">{t('appDebug.errDetail')}</p>
            </div>
          </label>
        </Section>

        <Section title={t('appDebug.secReset')} desc={t('appDebug.secResetDesc')}>
          <Button
            variant="danger"
            className="w-full"
            onClick={() => {
              resetDb();
              toast.success(t('appDebug.resetToast'));
            }}
          >
            {t('appDebug.resetBtn')}
          </Button>
        </Section>
      </div>
    </BottomSheet>
  );
}

function Section({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-0.5 text-xs font-semibold text-text-primary">{title}</p>
      <p className="mb-2.5 text-[10px] leading-relaxed text-text-secondary">{desc}</p>
      {children}
    </div>
  );
}
