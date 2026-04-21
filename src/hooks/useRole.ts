import { useUserStore } from '@/stores/useUserStore';
import { useUIStore } from '@/stores/useUIStore';

export function useRole() {
  const uid = useUserStore((s) => s.uid);
  const mockRole = useUserStore((s) => s.mockRole);
  const is_creator_of = useUserStore((s) => s.is_creator_of);
  const always500 = useUIStore((s) => s.always500);

  return {
    is_logged_in: !!uid,
    is_admin: mockRole === 'admin',
    is_creator_of,
    always500,
  };
}
