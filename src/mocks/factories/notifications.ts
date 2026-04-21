import type { Notification } from '@/types/api';
import { nanoid } from 'nanoid';

export function makeNotifications(rich: boolean): Notification[] {
  const now = Math.floor(Date.now() / 1000);
  const base: Notification[] = rich
    ? [
        {
          id: nanoid(),
          category: 'milestone',
          title: '里程碑公示',
          body: '里程碑②公示结束，可领取',
          link: '/studio/project/1001/milestone/2',
          read: false,
          created_at: now - 100,
        },
        {
          id: nanoid(),
          category: 'project',
          title: '认购提醒',
          body: 'HSHW 即将开启认购',
          link: '/project/1001',
          read: false,
          created_at: now - 2000,
        },
        ...Array.from({ length: 6 }).map((_, i) => ({
          id: nanoid(),
          category: 'wallet',
          title: `通知 ${i + 3}`,
          body: '正文'.repeat(10).slice(0, 120),
          link: '/wallet',
          read: true,
          created_at: now - 3600 * (i + 1),
        })),
      ]
    : [
        {
          id: nanoid(),
          category: 'system',
          title: '欢迎',
          body: '欢迎使用 Mirror.fan',
          link: '/',
          read: false,
          created_at: now - 10,
        },
        {
          id: nanoid(),
          category: 'system',
          title: '提示',
          body: '连接钱包以体验完整功能',
          link: '/wallet',
          read: true,
          created_at: now - 100,
        },
      ];
  return base;
}
