import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

export default function ErrorPage() {
  const nav = useNavigate();
  const { t } = useTranslation();
  return (
    <AppShell hideTab>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-6xl font-bold text-primary-500">404</p>
        <p className="text-lg font-semibold">{t('errorPage.title404')}</p>
        <p className="text-sm text-text-secondary">{t('errorPage.subtitle')}</p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => nav('/')}>
            {t('errorPage.goHall')}
          </Button>
          <Button onClick={() => nav('/')}>{t('errorPage.goHome')}</Button>
        </div>
      </div>
    </AppShell>
  );
}
