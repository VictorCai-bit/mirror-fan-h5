import { Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function CreatorBand() {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2 px-4 pt-1">
      <div className="h-[3px] flex-1 rounded-full bg-creator-band" />
      <span className="flex items-center gap-1 rounded-full bg-success-500/20 px-2 py-0.5 text-[10px] font-bold text-success-500">
        <Sparkles className="size-3" />
        {t('creator.badge')}
      </span>
    </div>
  );
}
