import { BottomSheet } from '@/components/ui/BottomSheet';
import { useUIStore } from '@/stores/useUIStore';
import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function LanguageSheet() {
  const { i18n, t } = useTranslation();
  const sheet = useUIStore((s) => s.bottomSheet);
  const setSheet = useUIStore((s) => s.setBottomSheet);
  const open = sheet === 'language';

  const setLng = async (lng: string) => {
    await i18n.changeLanguage(lng);
    localStorage.setItem('lng', lng);
    setSheet(null);
  };

  return (
    <BottomSheet open={open} onClose={() => setSheet(null)} title={t('language.picker')}>
      <div className="flex flex-col gap-2 pb-6">
        <button
          type="button"
          className="flex items-center justify-between rounded-xl bg-surface px-4 py-3 text-left"
          onClick={() => void setLng('zh-CN')}
        >
          <span>{t('language.zh')}</span>
          <span className="flex items-center gap-2">
            <span className="font-mono text-xs text-text-secondary">zh-CN</span>
            {i18n.language === 'zh-CN' ? <Check className="size-4 text-success-500" /> : null}
          </span>
        </button>
        <button
          type="button"
          className="flex items-center justify-between rounded-xl bg-surface px-4 py-3 text-left"
          onClick={() => void setLng('en-US')}
        >
          <span>{t('language.en')}</span>
          <span className="flex items-center gap-2">
            <span className="font-mono text-xs text-text-secondary">en-US</span>
            {i18n.language === 'en-US' ? <Check className="size-4 text-success-500" /> : null}
          </span>
        </button>
      </div>
    </BottomSheet>
  );
}
