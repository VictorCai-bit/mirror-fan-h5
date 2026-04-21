import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { apiFetch } from '@/lib/api';
import { RequireAdminMock } from '@/routes/guards';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

export default function AdminHub() {
  const { t } = useTranslation();

  const migrate = useMutation({
    mutationFn: (pid: number) =>
      apiFetch(`/admin/launch/project/${pid}/migrate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }),
  });

  return (
    <RequireAdminMock>
      <AppShell hideTab>
        <div className="flex flex-col gap-3 p-4">
          <h1 className="text-lg font-semibold">Admin</h1>
          <Button loading={migrate.isPending} onClick={() => migrate.mutate(1003)}>
            Migrate 1003
          </Button>
          <p className="text-xs text-text-secondary">{t('common.debug')}</p>
        </div>
      </AppShell>
    </RequireAdminMock>
  );
}
