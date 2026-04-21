import { apiFetch } from '@/lib/api';
import type { MilestoneTemplateNode, WorkType } from '@/types/api';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

export interface MilestonePreviewPanelProps {
  workType: WorkType;
}

const REQ_LABEL_KEYS: Record<'image' | 'video' | 'pdf', string> = {
  image: 'studioWizard.step4ReqImage',
  video: 'studioWizard.step4ReqVideo',
  pdf: 'studioWizard.step4ReqPdf',
};

export function MilestonePreviewPanel({ workType }: MilestonePreviewPanelProps) {
  const { t } = useTranslation();
  const { data: tpl } = useQuery({
    queryKey: ['milestone', 'templates', workType],
    queryFn: () =>
      apiFetch<MilestoneTemplateNode[]>(
        `/rwa/milestone/templates?work_type=${encodeURIComponent(workType)}`,
      ),
  });

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[10px] text-text-secondary">
        {t('studio.wizard.step4Subtitle', { type: workType })}
      </p>
      <div className="grid grid-cols-1 gap-2">
        {(tpl ?? []).map((n) => (
          <div key={n.node_index} className="rounded-xl bg-surface px-3 py-2 ring-1 ring-white/10">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-text-primary">
                #{n.node_index} · {n.title}
              </p>
              <span className="font-mono text-[10px] text-accent-500">{n.bps} bps</span>
            </div>
            <p className="mt-1 text-[10px] text-text-secondary">
              {t('studioWizard.step4Required')}:{' '}
              {n.required_attachments.map((r) => t(REQ_LABEL_KEYS[r])).join(' · ')}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
