import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { apiFetch } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function RulesPage() {
  const nav = useNavigate();
  const { t, i18n } = useTranslation();
  const [sp] = useSearchParams();
  const fromWizard = sp.get('from') === 'wizard';

  const { data } = useQuery({
    queryKey: ['launch', 'rules', i18n.language],
    queryFn: () => apiFetch<{ sections: { id: string; title: string; body_md: string }[] }>(
      `/launch/rules?lang=${encodeURIComponent(i18n.language)}`,
    ),
  });

  return (
    <AppShell hideTab={fromWizard}>
      <div className="flex flex-col gap-3 p-3 pb-24">
        <div className="flex items-center gap-2">
          <button type="button" className="rounded-lg p-2 hover:bg-white/5" onClick={() => nav(-1)}>
            <ChevronLeft className="size-5" />
          </button>
          <h1 className="text-lg font-semibold">{t('rules.title')}</h1>
        </div>
        {(data?.sections ?? []).map((s) => (
          <section key={s.id} className="rounded-2xl bg-surface p-3">
            <h2 className="text-base font-semibold">{s.title}</h2>
            <pre className="mt-2 whitespace-pre-wrap text-xs text-text-secondary">{s.body_md}</pre>
          </section>
        ))}
        {fromWizard ? (
          <div className="fixed bottom-0 left-0 right-0 z-20 mx-auto flex max-w-[375px] gap-2 border-t border-white/10 bg-canvas/95 p-3 backdrop-blur">
            <Button variant="secondary" className="flex-1" onClick={() => nav(-1)}>
              {t('rules.readOk')}
            </Button>
            <Button className="flex-1" onClick={() => nav('/studio/new/step5')}>
              {t('rules.goLaunch')}
            </Button>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
