import { useUserStore } from '@/stores/useUserStore';
import { useUIStore } from '@/stores/useUIStore';
import { useEffect, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, Outlet, useParams } from 'react-router-dom';
import { toast } from 'sonner';

export function RequireInvestor({ children }: { children: ReactNode }) {
  const ok = useUserStore((s) => s.is_logged_in());
  const setSheet = useUIStore((s) => s.setBottomSheet);
  useEffect(() => {
    if (!ok) setSheet('connect');
  }, [ok, setSheet]);
  if (!ok) return null;
  return <>{children}</>;
}

/** Same as RequireInvestor but renders nested `<Outlet />` for `/studio/*` route groups. */
export function RequireInvestorOutlet() {
  const ok = useUserStore((s) => s.is_logged_in());
  const setSheet = useUIStore((s) => s.setBottomSheet);
  useEffect(() => {
    if (!ok) setSheet('connect');
  }, [ok, setSheet]);
  if (!ok) return null;
  return <Outlet />;
}

export function RequireCreator({ children }: { children: ReactNode }) {
  const { id } = useParams();
  const pid = Number(id);
  const { t } = useTranslation();
  const uid = useUserStore((s) => s.uid);
  const creatorOf = useUserStore((s) => s.creator_of);
  if (!id || Number.isNaN(pid)) {
    toast.error(t('errors.4040'));
    return <Navigate to="/studio" replace />;
  }
  // Dynamic identification per §2.1: creator_of list OR newly created project
  // (project.creator_uid is validated server-side; MSW checks x-mock-creator-of).
  // For client-side guard we accept both explicit membership and the 'fresh draft
  // just submitted' case where creator_of may not include the id yet but the
  // project row exists with creator_uid === current uid.
  const inList = creatorOf.includes(pid);
  if (!uid) {
    toast.error(t('errors.4001'));
    return <Navigate to="/studio" replace />;
  }
  if (!inList) {
    // We don't have sync access to the project row here; let the MSW handler
    // return 4003 and rely on the per-page error state. Still redirect if the
    // user has no creator_of list at all and this pid isn't in it — for
    // authenticated users with at least one project we pass through to avoid
    // flashing errors on post-submit navigation.
    if (creatorOf.length === 0) {
      toast.error(t('errors.4003'));
      return <Navigate to="/studio" replace />;
    }
  }
  return <>{children}</>;
}

export function RequireAdminMock({ children }: { children: ReactNode }) {
  const role = useUserStore((s) => s.mockRole);
  if (role !== 'admin') return <Navigate to="/404" replace />;
  return <>{children}</>;
}
