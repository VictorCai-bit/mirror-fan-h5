import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { apiFetch } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

export default function MeteoraPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { t } = useTranslation();

  const { data } = useQuery({
    queryKey: ['launch', 'on-chain', 'detail', id],
    queryFn: () => apiFetch<{ meteora_pool: string | null; status: string }>(
      `/launch/on-chain/detail?project_id=${id}`,
    ),
    enabled: !!id,
  });

  return (
    <AppShell>
      <div className="flex flex-col gap-3 p-3">
        <div className="flex items-center gap-2">
          <button type="button" className="rounded-lg p-2 hover:bg-white/5" onClick={() => nav(-1)}>
            <ChevronLeft className="size-5" />
          </button>
          <h1 className="text-lg font-semibold">{t('project.meteora')}</h1>
        </div>
        <p className="text-sm text-text-secondary">{data?.meteora_pool ?? '—'}</p>
        <Button
          variant="primary"
          disabled={!data?.meteora_pool}
          onClick={() => window.open('https://app.meteora.ag/', '_blank', 'noopener,noreferrer')}
        >
          <ExternalLink className="size-4" />
          {t('common.openMeteora')}
        </Button>
      </div>
    </AppShell>
  );
}
