import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { apiFetch } from '@/lib/api';
import type { Notification } from '@/types/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

export default function NotificationsPage() {
  const nav = useNavigate();
  const { t } = useTranslation();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: () => apiFetch<Notification[]>('/notifications'),
  });

  const mark = useMutation({
    mutationFn: (ids: string[]) =>
      apiFetch('/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  return (
    <AppShell>
      <div className="flex flex-col gap-3 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button type="button" className="rounded-lg p-2 hover:bg-white/5" onClick={() => nav(-1)}>
              <ChevronLeft className="size-5" />
            </button>
            <h1 className="text-lg font-semibold">{t('notifications.title')}</h1>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => mark.mutate((data ?? []).filter((n) => !n.read).map((n) => n.id))}
          >
            {t('notifications.markRead')}
          </Button>
        </div>
        <div className="space-y-2 text-sm">
          {(data ?? []).map((n) => (
            <button
              key={n.id}
              type="button"
              className="w-full rounded-2xl bg-surface p-3 text-left"
              onClick={() => n.link && nav(n.link)}
            >
              <p className="font-medium">{n.title}</p>
              <p className="text-xs text-text-secondary">{n.body}</p>
            </button>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
