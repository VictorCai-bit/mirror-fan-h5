import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { useUserStore, type MockWalletProfile } from '@/stores/useUserStore';
import { useUIStore } from '@/stores/useUIStore';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

export function ConnectWalletSheet() {
  const { t } = useTranslation();
  const sheet = useUIStore((s) => s.bottomSheet);
  const setSheet = useUIStore((s) => s.setBottomSheet);
  const connect = useUserStore((s) => s.connect);
  const open = sheet === 'connect';

  const mock = (p: MockWalletProfile) => {
    connect(p);
    setSheet(null);
    toast.success('Mock wallet connected');
  };

  return (
    <BottomSheet open={open} onClose={() => setSheet(null)} title={t('connect.title')}>
      <div className="flex flex-col gap-2 pb-6">
        <Button variant="secondary" onClick={() => toast.error(t('common.notAvailable'))}>
          {t('connect.phantom')}
        </Button>
        <Button variant="secondary" onClick={() => toast.error(t('common.notAvailable'))}>
          {t('connect.solflare')}
        </Button>
        <Button variant="secondary" onClick={() => toast.error(t('common.notAvailable'))}>
          {t('connect.wc')}
        </Button>
        <Button variant="primary" onClick={() => mock('rich')}>
          {t('connect.mock')} (rich)
        </Button>
        <Button variant="secondary" onClick={() => mock('poor')}>
          {t('connect.mock')} (poor)
        </Button>
        <Button variant="secondary" onClick={() => mock('new')}>
          {t('connect.mock')} (new)
        </Button>
        <p className="text-center text-xs text-text-secondary">{t('common.mockModeHint')}</p>
      </div>
    </BottomSheet>
  );
}
