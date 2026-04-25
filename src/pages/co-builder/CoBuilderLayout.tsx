import { AppShell } from '@/components/layout/AppShell';
import { SegmentedTabs } from '@/components/co-builder/SegmentedTabs';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

const TABS = [
  { key: 'buy', path: '/co-builder/buy' },
  { key: 'member', path: '/co-builder/member' },
  { key: 'community', path: '/co-builder/community' },
];

export function CoBuilderLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const loc = useLocation();
  const nav = useNavigate();

  // /member/float keeps the "member" tab active
  const active = (() => {
    if (loc.pathname.startsWith('/co-builder/member')) return 'member';
    if (loc.pathname.startsWith('/co-builder/community')) return 'community';
    return 'buy';
  })();

  return (
    <AppShell>
      <div className="flex flex-col">
        <SegmentedTabs
          tabs={[
            { key: 'buy', label: t('coBuilder.tabs.buy') },
            { key: 'member', label: t('coBuilder.tabs.member') },
            { key: 'community', label: t('coBuilder.tabs.community') },
          ]}
          active={active}
          onChange={(k) => {
            const target = TABS.find((x) => x.key === k);
            if (target) nav(target.path);
          }}
        />
        <div className="flex-1">{children}</div>
      </div>
    </AppShell>
  );
}
