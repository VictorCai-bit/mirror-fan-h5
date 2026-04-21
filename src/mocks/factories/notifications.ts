import type { Notification } from '@/types/api';
import { nanoid } from 'nanoid';

export function makeNotifications(rich: boolean): Notification[] {
  const now = Math.floor(Date.now() / 1000);

  if (!rich) {
    return [
      {
        id: nanoid(),
        category: 'system',
        title: '欢迎来到 Mirror.fan',
        body: '连接钱包即可体验完整的 RWA 发射、空投与增发功能。',
        link: '/wallet',
        read: false,
        created_at: now - 30,
      },
      {
        id: nanoid(),
        category: 'system',
        title: '平台公告',
        body: 'RWA 3.0 版本已上线，新增固定价增发与赋能空投功能。',
        link: '/',
        read: true,
        created_at: now - 3600,
      },
    ];
  }

  return [
    {
      id: nanoid(),
      category: 'milestone',
      title: '里程碑②公示期结束，可领取',
      body: '《黑神话：悟空》IP 里程碑②已完成 3 日公示，USDT 可领取，请前往里程碑页面操作。',
      link: '/studio/project/1001/milestones',
      read: false,
      created_at: now - 60 * 5,
    },
    {
      id: nanoid(),
      category: 'project',
      title: 'HSHW 固定价认购即将开启',
      body: '《黑神话：悟空》IP 代币 HSHW 第三轮固定价认购将于 24 小时后开启，单价 $0.15。',
      link: '/project/1001/fixed-price',
      read: false,
      created_at: now - 60 * 30,
    },
    {
      id: nanoid(),
      category: 'airdrop',
      title: '空投积分到账 +500',
      body: '你的 Work #1001 今日签到 +5、邀请奖励 +200、组队奖励 +295，积分已到账。',
      link: '/project/1001/airdrop',
      read: false,
      created_at: now - 3600 * 2,
    },
    {
      id: nanoid(),
      category: 'wallet',
      title: '充值到账 $10,000 USDT',
      body: '你的链上 USDT 充值已确认，余额已更新，可用于认购或曲线交易。',
      link: '/wallet',
      read: false,
      created_at: now - 3600 * 5,
    },
    {
      id: nanoid(),
      category: 'milestone',
      title: '里程碑①已提交，等待审核',
      body: '《黑神话：悟空》创作者已提交里程碑①证明材料，平台审核中，预计 3 个工作日完成。',
      link: '/project/1001/milestones',
      read: true,
      created_at: now - 86400 * 1,
    },
    {
      id: nanoid(),
      category: 'project',
      title: 'Dream City 项目已上链',
      body: 'DREAM 代币已完成公募曲线，迁移至 Meteora AMM，可在 Meteora 自由交易。',
      link: '/project/1005',
      read: true,
      created_at: now - 86400 * 2,
    },
    {
      id: nanoid(),
      category: 'airdrop',
      title: '赋能空投第 2 期已解锁',
      body: 'HSHW 赋能空投第 2 期（25%）已到达解锁时间，请前往 Vesting 页面领取。',
      link: '/project/1001/vesting',
      read: true,
      created_at: now - 86400 * 3,
    },
    {
      id: nanoid(),
      category: 'system',
      title: '平台手续费调整公告',
      body: '自下月起，曲线交易手续费由 1% 调整为 0.8%，固定价认购手续费维持 0.5% 不变。',
      link: '/',
      read: true,
      created_at: now - 86400 * 5,
    },
    {
      id: nanoid(),
      category: 'wallet',
      title: '提现 $5,000 USDT 已到账',
      body: '你申请的 5,000 USDT 提现已打入链上地址 0x71C7…E420，请注意查收。',
      link: '/wallet/bills',
      read: true,
      created_at: now - 86400 * 7,
    },
  ];
}
