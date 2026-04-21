import { CreatorBand } from '@/components/layout/CreatorBand';
import { BottomTab } from '@/components/layout/BottomTab';
import { TopBar } from '@/components/layout/TopBar';
import { cn } from '@/lib/cn';
import { useLocation } from 'react-router-dom';

export function AppShell({
  children,
  hideTab,
  creatorMode,
  noScroll,
}: {
  children: React.ReactNode;
  hideTab?: boolean;
  /** When true, show Creator gradient band under top bar (Studio routes only). */
  creatorMode?: boolean;
  /** When true, <main> is overflow-hidden so the child can manage its own scroll. */
  noScroll?: boolean;
}) {
  const loc = useLocation();
  const studio = loc.pathname.startsWith('/studio');
  const showBand = creatorMode ?? studio;
  return (
    <div className="flex min-h-dvh justify-center bg-black">
      <div
        className={cn(
          'relative flex h-dvh w-full max-w-[375px] flex-col overflow-hidden bg-base text-text-primary shadow-2xl',
        )}
      >
        <TopBar />
        {showBand ? <CreatorBand /> : null}
        <main className={cn('min-h-0 flex-1', noScroll ? 'overflow-hidden' : 'overflow-y-auto')}>
          {children}
        </main>
        {hideTab ? null : <BottomTab />}
      </div>
    </div>
  );
}
