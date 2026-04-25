import type { MemberLevel } from '@/types/coBuilder';

export interface LevelToken {
  /** 文字色 */
  text: string;
  /** chip / 描边色 */
  ring: string;
  /** 半透背景 */
  surface: string;
  /** 卡片渐变（dim 头部用） */
  gradient: string;
  /** Tailwind 等级渐变（用于光晕） */
  glow: string;
}

const TOKENS: Record<Exclude<MemberLevel, 'none'>, LevelToken> = {
  base: {
    text: 'text-slate-200',
    ring: 'ring-slate-400/30',
    surface: 'bg-slate-400/10',
    gradient: 'from-slate-400/20 via-slate-400/5 to-transparent',
    glow: 'shadow-[0_0_24px_-12px_rgba(148,163,184,0.6)]',
  },
  active: {
    text: 'text-emerald-300',
    ring: 'ring-emerald-400/40',
    surface: 'bg-emerald-400/10',
    gradient: 'from-emerald-400/30 via-emerald-400/8 to-transparent',
    glow: 'shadow-[0_0_24px_-10px_rgba(52,211,153,0.55)]',
  },
  regional: {
    text: 'text-violet-300',
    ring: 'ring-violet-400/40',
    surface: 'bg-violet-400/10',
    gradient: 'from-violet-400/30 via-violet-400/8 to-transparent',
    glow: 'shadow-[0_0_24px_-10px_rgba(167,139,250,0.6)]',
  },
  ecosystem: {
    text: 'text-amber-300',
    ring: 'ring-amber-400/40',
    surface: 'bg-amber-400/10',
    gradient: 'from-amber-400/30 via-amber-400/8 to-transparent',
    glow: 'shadow-[0_0_24px_-10px_rgba(245,158,11,0.55)]',
  },
  global: {
    text: 'text-pink-300',
    ring: 'ring-pink-400/45',
    surface: 'bg-pink-400/10',
    gradient: 'from-pink-400/35 via-fuchsia-400/10 to-transparent',
    glow: 'shadow-[0_0_28px_-10px_rgba(255,61,139,0.7)]',
  },
};

export function levelToken(level: MemberLevel): LevelToken {
  if (level === 'none') return TOKENS.base;
  return TOKENS[level];
}

export function levelOrder(level: MemberLevel): number {
  return ['none', 'base', 'active', 'regional', 'ecosystem', 'global'].indexOf(level);
}
