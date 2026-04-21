import { AppShell } from '@/components/layout/AppShell';
import { useTranslation } from 'react-i18next';

export default function VipPage() {
  const { t } = useTranslation();
  return (
    <AppShell>
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-text-secondary">
        <p className="text-lg font-semibold">{t('nav.vip')}</p>
        <p>{t('nav.comingSoon')}</p>
      </div>
    </AppShell>
  );
}
