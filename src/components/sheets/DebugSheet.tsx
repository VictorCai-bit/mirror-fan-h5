import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { resetDb } from '@/mocks/db';
import { useUserStore, type MockWalletProfile } from '@/stores/useUserStore';
import { useUIStore } from '@/stores/useUIStore';
import { cn } from '@/lib/cn';
import { toast } from 'sonner';

const WALLET_PROFILES: { key: MockWalletProfile; label: string; desc: string; color: string }[] = [
  { key: 'rich', label: '💰 有钱用户', desc: 'USDT 128,469 · ENT 丰厚', color: 'bg-success-500/15 text-success-400 ring-success-500/30' },
  { key: 'poor', label: '😅 余额紧张', desc: 'USDT 50 · 测试余额不足场景', color: 'bg-warning-500/15 text-warning-400 ring-warning-500/30' },
  { key: 'new', label: '🆕 新用户', desc: '余额为 0 · 未参与任何项目', color: 'bg-white/10 text-text-secondary ring-white/20' },
];

const ALL_PROJECTS = [1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008];

export function DebugSheet() {
  const open = useUIStore((s) => s.debugOpen);
  const setDebugOpen = useUIStore((s) => s.setDebugOpen);
  const setAlways500 = useUIStore((s) => s.setAlways500);
  const always500 = useUIStore((s) => s.always500);
  const creatorOf = useUserStore((s) => s.creator_of);
  const setCreatorOf = useUserStore((s) => s.set_creator_of);
  const connect = useUserStore((s) => s.connect);

  return (
    <BottomSheet open={open} onClose={() => setDebugOpen(false)} title="🛠 开发调试面板">
      <div className="space-y-5 pb-8">

        {/* Banner */}
        <div className="rounded-xl bg-orange-400/10 px-3 py-2.5 text-[11px] leading-relaxed text-orange-300/80">
          这是原型专用的模拟控制台，用于快速切换不同的测试场景，正式产品中不会出现。
        </div>

        {/* Section 1: Wallet identity */}
        <Section
          title="身份 / 钱包"
          desc="切换当前登录用户的资产档位，模拟不同余额的操作流程。"
        >
          <div className="flex flex-col gap-2">
            {WALLET_PROFILES.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => {
                  connect(p.key);
                  toast.success(`已切换到：${p.label}`);
                }}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-left ring-1 transition hover:opacity-90',
                  p.color,
                )}
              >
                <div className="flex-1">
                  <p className="text-sm font-semibold">{p.label}</p>
                  <p className="text-[10px] opacity-70">{p.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </Section>

        {/* Section 2: Creator projects */}
        <Section
          title="创作者权限"
          desc="勾选当前用户是哪些项目的 Creator，点亮后可进入创作者工作台管理该项目。"
        >
          <div className="flex flex-wrap gap-2">
            {ALL_PROJECTS.map((id) => {
              const on = creatorOf.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() =>
                    setCreatorOf(on ? creatorOf.filter((x) => x !== id) : [...creatorOf, id])
                  }
                  className={cn(
                    'flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ring-1 transition',
                    on
                      ? 'bg-success-500/20 text-success-400 ring-success-500/40'
                      : 'bg-white/8 text-text-secondary ring-white/15 hover:bg-white/12',
                  )}
                >
                  {on ? '✓ ' : ''}项目 {id}
                </button>
              );
            })}
          </div>
          {creatorOf.length > 0 ? (
            <p className="mt-1.5 text-[10px] text-success-400">
              当前为 Creator：{creatorOf.map((id) => `#${id}`).join(' ')}
            </p>
          ) : (
            <p className="mt-1.5 text-[10px] text-text-secondary">当前无 Creator 权限，以投资者身份浏览</p>
          )}
        </Section>

        {/* Section 3: Error simulation */}
        <Section
          title="接口错误模拟"
          desc="开启后所有 Mock API 强制返回 500，用于测试错误状态页和 toast 提示。"
        >
          <label className={cn(
            'flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 ring-1 transition',
            always500
              ? 'bg-danger-500/15 ring-danger-500/40'
              : 'bg-white/6 ring-white/15',
          )}>
            <div className="relative flex h-5 w-9 items-center">
              <input
                type="checkbox"
                className="sr-only"
                checked={always500}
                onChange={(e) => {
                  setAlways500(e.target.checked);
                  toast(e.target.checked ? '⚠️ 已开启强制 500' : '✅ 已关闭强制 500');
                }}
              />
              <div className={cn(
                'h-5 w-9 rounded-full transition-colors',
                always500 ? 'bg-danger-500' : 'bg-white/20',
              )} />
              <div className={cn(
                'absolute size-3.5 rounded-full bg-white shadow transition-all',
                always500 ? 'left-[18px]' : 'left-[2px]',
              )} />
            </div>
            <div>
              <p className={cn('text-sm font-medium', always500 ? 'text-danger-400' : 'text-text-secondary')}>
                {always500 ? '强制报错：已开启' : '强制报错：关闭'}
              </p>
              <p className="text-[10px] text-text-secondary/60">开启后所有接口返回 Internal Error</p>
            </div>
          </label>
        </Section>

        {/* Section 4: Reset */}
        <Section
          title="重置数据"
          desc="清除 localStorage 里的所有 Mock 假数据，恢复到初始种子状态（项目列表、账单等）。"
        >
          <Button
            variant="danger"
            className="w-full"
            onClick={() => {
              resetDb();
              toast.success('Mock 数据已重置，刷新页面生效');
            }}
          >
            重置 Mock 数据库
          </Button>
        </Section>

      </div>
    </BottomSheet>
  );
}

function Section({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-0.5 text-xs font-semibold text-text-primary">{title}</p>
      <p className="mb-2.5 text-[10px] leading-relaxed text-text-secondary">{desc}</p>
      {children}
    </div>
  );
}
