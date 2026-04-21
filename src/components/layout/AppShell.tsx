import { CreatorBand } from '@/components/layout/CreatorBand';
import { BottomTab } from '@/components/layout/BottomTab';
import { TopBar } from '@/components/layout/TopBar';
import { cn } from '@/lib/cn';
import { useLocation } from 'react-router-dom';

export function AppShell({
  children,
  hideTab,
  creatorMode,
  footer,
}: {
  children: React.ReactNode;
  hideTab?: boolean;
  /** When true, show Creator gradient band under top bar (Studio routes only). */
  creatorMode?: boolean;
  /** Rendered below <main> but above the bottom tab bar — ideal for sticky action bars. */
  footer?: React.ReactNode;
}) {
  const loc = useLocation();
  const studio = loc.pathname.startsWith('/studio');
  const showBand = creatorMode ?? studio;
  return (
    <div className="app-shell-root flex h-screen justify-center bg-black">
      <div
        className={cn(
          'app-shell-frame relative flex h-full w-full max-w-[375px] flex-col overflow-hidden bg-canvas text-text-primary shadow-2xl',
        )}
      >
        <TopBar />
        {showBand ? <CreatorBand /> : null}
        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
        {footer ?? null}
        {hideTab ? null : <BottomTab />}
      </div>
    </div>
  );
}
