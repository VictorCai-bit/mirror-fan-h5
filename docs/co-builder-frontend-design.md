# Mirror.fan V2 共建者计划 H5 前端设计文档

> 落地仓库：[`mirror-fan-h5/`](../)。
> 业务输入：[`design/Mirror.fun 共建者计划 .png`](../../design/Mirror.fun%20共建者计划%20.png)、[`design/docs/lark/Mirror.fan V2 共建者计划 产品需求文档（PRD） (1).md`](../../design/docs/lark/Mirror.fan%20V2%20共建者计划%20产品需求文档（PRD）%20(1).md)、[`design/docs/Mirror.fan V2 共建者计划-PRD疑问与arts-server-v1迁移对照.md`](../../design/docs/Mirror.fan%20V2%20共建者计划-PRD疑问与arts-server-v1迁移对照.md)。

## 1. 范围与目标

- **范围**：底部 Tab 中段（原 `/vip`）改造为「共建者计划 / Co-Builder」入口，覆盖 PRD 页面 1~6。
- **目标**：在不连真后端的前提下，用 MSW 走通「购买 → 会员中心 → 浮动贡献力 → 社区返佣 → ENT 提取」全流程；UI 体验贴近最终产品。
- **不做**：真实链上签名、真实价格预言机、运营后台配置可视化。

## 2. 信息架构与导航

```
BottomTab[中段]
└─ /co-builder
   ├─ /buy          页面1 共建者会员购买
   ├─ /member       页面2 我的会员
   │  └─ /float     页面3 我的浮动贡献力
   └─ /community    页面5 我的社区

弹层（BottomSheet）
├─ PurchaseSheet           页面1 购买弹窗
├─ FloatRuleSheet          页面4.1 浮动贡献力规则
├─ WorkScoreSheet          页面4.2 作品贡献分详情
├─ EntClaimSheet           页面6.1 ENT 提取
└─ ClaimSuccessSheet       页面6.2 提取成功
```

`/co-builder` 内置三段顶部 SegmentedTabs：「共建者 / 会员 / 社区」，分别对应 `/buy`、`/member`、`/community`。`/vip` 自动 301 到 `/co-builder/buy` 兼容老链接。

## 3. 视觉与组件复用

### 3.1 复用现有

| 现有 | 用途 |
| --- | --- |
| [`AppShell`](../src/components/layout/AppShell.tsx) | 375px 移动壳层 + TopBar + BottomTab |
| [`Button`](../src/components/ui/Button.tsx) | primary/secondary/ghost/danger，全部 CTA |
| [`BottomSheet`](../src/components/ui/BottomSheet.tsx) | 所有弹层 |
| [`Input`](../src/components/ui/Input.tsx) | 数量、地址输入 |
| [`Badge`](../src/components/ui/Badge.tsx) | 状态徽章（订单状态等） |
| [`Skeleton`](../src/components/ui/Skeleton.tsx) | 加载态 |
| [`CountdownBadge`](../src/components/ui/CountdownBadge.tsx) + [`useCountdown`](../src/hooks/useCountdown.ts) | 锁价倒计时 |
| [`ConnectWalletSheet`](../src/components/sheets/ConnectWalletSheet.tsx) | 钱包连接（mock） |

### 3.2 新增（仅本模块，目录 `src/components/co-builder/`）

`SegmentedTabs`、`TierCard`、`LevelBadge`、`LevelProgressCard`、`ContributionBreakdownCard`、`EntPanel`、`DynamicPriceTicker`、`PriceStepper`、`RebateRuleCard`、`InvitedWorkRow`、`TeamMemberRow`、`StatTile`、`PurchaseSheet`、`EntClaimSheet`、`ClaimSuccessSheet`、`FloatRuleSheet`、`WorkScoreSheet`。

### 3.3 设计 token 扩展

沿用 [`tailwind.config.ts`](../tailwind.config.ts) 既有 `canvas / surface / elevated / primary / accent / success / info / warning / danger / text.primary / text.secondary`。**额外**给 5 档等级一组「主题 chip」颜色，仅作为 ring/glow，不替换现有语义色：

| Level | 主色调 | 用途 |
| --- | --- | --- |
| `base` | 冷灰 `#94A3B8` | 入门档 |
| `active` | 蓝绿 `#34D399` | 活跃档 |
| `regional` | 紫 `#A78BFA` | 区域档 |
| `ecosystem` | 琥珀 `#F59E0B` | 生态档 |
| `global` | 粉红 `#FF3D8B` | 顶级档（与品牌主色呼应） |

实现方式：在新建组件里直接以 `level` 字段返回相应 Tailwind class（不写到 `tailwind.config.ts`），保持原 token 干净。

## 4. 页面级 Spec

### 4.1 页面1：共建者会员购买（`/co-builder/buy`）

**结构（自上而下）**：

1. `Hero` 共建者计划标题 + 副文案 + 「前往开启」CTA（未连钱包置灰，触发 `ConnectWalletSheet`）。
2. `EcosystemStats`：共建矿池 60 亿 / 首年 20% / 当前总贡献力 / 三大占比进度条（基础 60% · 浮动 30% · 身份 10%）。
3. `DynamicPriceTicker`：实时 1A 单价（5s 轮询 mock，价格变化时 `framer-motion` 数字脉冲），副文案「每售出 150,000A，价格上涨 1%」+ 累计已售 progress bar。
4. `TierShowcase`：5 档卡片纵向陈列。每张卡片含：等级名 + 价值定位 + 入驻条件 + 推荐入驻分润 + 关键权益 list + 「立即购买」CTA。
5. 底部固定 `StickyCTA`：浮动「立即开启共建之旅」按钮（连了钱包后高亮）。

**核心交互**：
- 点击任意 `TierCard` 的「立即购买」→ 唤起 `PurchaseSheet`，自动选中对应档位。
- 未连钱包：`StickyCTA` 与各 `TierCard` CTA 都触发 `ConnectWalletSheet`，不会进入 `PurchaseSheet`。

**`PurchaseSheet`**：
- 三档 chip：100A / 1500A / 88500A（点击切换 + 高亮）。
- `PriceStepper`：步长 100A、最小 100A、单户上限 885,000A、支持手动输入 1A 整数倍。
- 实时单价 + 总价 + 锁价倒计时 60s（`CountdownBadge`），倒计时归零自动重新拉取。
- 下方 `Bond list`：贡献力到账时间、会员 NFT 发放说明、退款规则。
- 主 CTA「立即支付」：`pre` → `confirm` → toast → 关闭 → `invalidateQueries(['co-builder','member','my'])`。
- **价格变动二次确认**：当 `live unit_price !== quote.lock_price` 时，弹出 alert 询问是否使用新价格。

**校验**：
- 数量 < 100A 或 > 885,000A → 输入框红框 + 文案。
- 数量非 100A 整数倍 → 红框「数量需为 100A 的整数倍」（PRD 内有歧义，原型按"100A 步长 / 100A 整数倍"实现，将 PRD 笔误「请算中算力类型」修正为「请选择对应贡献力档位」）。
- 钱包未连接 → 主 CTA 禁用。
- 钱包余额不足（mock） → toast：「钱包余额不足，请充值后重试」。

**测试核心要点**（与 PRD 1.6 对齐）：正常档位购买、自定义 150A、未连钱包点击、低于 100A、支付中触发加价、单户上限 885,000A。

---

### 4.2 页面2：我的会员（`/co-builder/member`）

**结构**：

1. `LevelHeroCard`：当前等级徽章（按 level 主题色）+ 头像/钱包 + 「Assets」入口（跳 `/wallet`）。
2. `LevelProgressCard`：下一级目标 + 双进度条（直推有效人数 / 团队 KPI），总进度取**最低**完成度；顶级 Global 隐藏进度条，显示「已达最高等级」。
3. `ContributionBreakdownCard`：基础 / 浮动 / 身份 / 总（精度 0.000，`tabular-nums`），每行右侧「增」按钮跳到对应增贡献力路径：
   - 基础 → `/co-builder/buy`
   - 浮动 → `/co-builder/member/float`（仅 Active+ 可用，未达级展示「升级活跃节点开启」）
   - 身份 → 占位提示「升级区域会员开启」（仅 Regional+ 显示数值）
4. `EntPanel`：累计 ENT、最大可提取、钱包地址（脱敏）、`Claim` 按钮（余额 0 置灰）→ 唤起 `EntClaimSheet`。
5. `EarningsTimeline`（增强细节）：横向时间线展示「今日 / 昨日 / 本月」三段 ENT 产出，给数据可视化。

**未购买会员的状态**：整页显示空态卡 + 「立即开启共建之旅」CTA → 跳 `/co-builder/buy`。

**校验**：见 PRD 2.4，加上未连钱包的 redirect 逻辑（停留显示 connect 引导）。

---

### 4.3 页面3：我的浮动贡献力（`/co-builder/member/float`）

**结构**：

1. `RuleStripe`：3 条规则文案（与 PRD 一致）+ 右上「详情规则」按钮（开 `FloatRuleSheet`）。
2. `InviteCreatorCard`：渐变背景 + 头部 emoji + 文案「分享个人链接，邀请创作者入驻」+ 双按钮「复制链接」「保存海报（mock）」。
3. `InvitedWorkList`：作品名 / 贡献分（保留 3 位小数）/ 排名（前 1% / 前 1-5% / ...）/ 浮动贡献力（A）；按贡献分降序，分页 10/页。空态文案 PRD 一致。
4. 点击单行 → `WorkScoreSheet`（页面 4.2）。

**权限可见性**：仅 Active+ 可见。Base 显示空态卡：「升级活跃会员后可邀请创作者入驻、获得浮动贡献力」+ 跳 `/co-builder/buy`。

**`FloatRuleSheet`（页面 4.1）**：3 维度权重表（按当前阶段切换 chip）+ 标准化公式 + 排名比例对照表（前 1% 40% / 前 1-5% 30% / ...）+ 关键说明。

**`WorkScoreSheet`（页面 4.2）**：标题「贡献分 X.XXX」+ 当前阶段维度权重 + 公式 + 该作品分维度计算明细（原始值 → 标准化值 → 单维度得分）+ 总贡献度。fixture 直接复用 PRD 5.1.6 案例 IP1/IP2/IP3。

---

### 4.4 页面5：我的社区（`/co-builder/community`）

**结构**：

1. `RebateRuleCard`：按当前等级展示直推/间推比例（来自 PRD 3.1）+ 升级提示。
2. `ShareActions`：「保存海报（mock）」「分享链接」+ 二维码占位图。
3. `CommissionTiles`：今日佣金 / 累计佣金 / 直推有效人数 / 团队 KPI；每个数字下方副文字「+12 vs 昨日」「累计 USDT」等。
4. `TeamList`（仅 Regional+ 可见）：列字段昵称、等级徽章、团队贡献力、直推/间推标识；分页加载。Base/Active 显示「升级到区域会员可查看团队详情」。

---

### 4.5 页面6：ENT 提取流程

**`EntClaimSheet`**：
- 提取数量输入 + 「Max」快速填入。
- 选择「平台账户」/「链上钱包」segmented；选链上钱包出现地址输入框 + 简单 Solana 地址形态校验。
- 实时显示 `to_amount = amount × 0.9`、`fee = amount × 0.1`。
- 主 CTA「确认提取」→ loading → 关闭 → 自动打开 `ClaimSuccessSheet`。
- 校验：金额 ≤ 可提取余额、≥ 0.01 ENT、地址非空且形态正确。

**`ClaimSuccessSheet`**：成功 emoji + 到账金额 + 到账账户 + 「返回会员页」按钮 + 申请单号（可复制）。

## 5. 数据契约

`apiFetch` 自动加 `/arts` 前缀。原型阶段的接口列表如下（与 PRD 6.1 对齐，路径调整为 `/arts/co-builder/*`）：

| 方法 | 路径 | 用途 | 主要响应字段 |
| --- | --- | --- | --- |
| GET | `/arts/co-builder/index` | 页面1 基础数据 | `pool_total`, `first_year_release`, `total_contribution_platform`, `weights`, `tiers[]` |
| GET | `/arts/co-builder/price/live` | 页面1 价格 ticker | `unit_price`, `sold_total`, `next_threshold_at`, `step_increase_pct` |
| POST | `/arts/co-builder/order/pre` | 页面1 预下单 | `order_no`, `lock_price`, `lock_expires_at`, `total_amount` |
| POST | `/arts/co-builder/order/confirm` | 页面1 确认支付（mock 替代签名） | `order_no`, `pay_status`, `tx_hash` |
| GET | `/arts/co-builder/order/query` | 页面1 订单状态轮询 | 同上 |
| GET | `/arts/co-builder/member/my` | 页面2 | `level`, `next_level`, `progress`, `contribution`, `ent`, `wallet_address` |
| POST | `/arts/co-builder/ent/claim` | 页面6 提取 | `claim_no`, `actual_amount`, `service_fee`, `to_account` |
| GET | `/arts/co-builder/float/list` | 页面3 列表 | `total`, `items[]` |
| GET | `/arts/co-builder/float/rule` | 页面4.1 | `stage`, `weights[]`, `rank_buckets[]`, `formula` |
| GET | `/arts/co-builder/float/work-detail` | 页面4.2 | 单作品计算明细 |
| GET | `/arts/co-builder/community/my` | 页面5 | `rebate`, `commission`, `team_list[]` |
| POST | `/arts/co-builder/invite/generate` | 邀请物料 | `link`, `qr_url`, `slogan` |

接口信封统一 `{ code: 0, msg, data }`，错误用 `code !== 0`，与 [`apiFetch`](../src/lib/api.ts) 一致。

## 6. 类型与 Mock

- 类型：`src/types/coBuilder.ts`，与 PRD §7 数据结构对齐。
- Mock 内存 db：`src/mocks/db/coBuilder.ts`，初始化时从 `localStorage` 读取累计已售 `sold_total`，每次「购买成功」累加并落盘，从而让动态加价在多页面/刷新后保持一致。
- 5 档预置数据：等级权益、推荐入驻分润、可见性规则、PRD 5.1.6 案例 IP1/IP2/IP3 作为 `invited_works` 默认 fixture。
- 错误注入：尊重 `useUIStore.always500`，配合 [`shouldInject500`](../src/mocks/utils.ts) 强制 5000。

## 7. React Query Key 规约

```
['co-builder','index']
['co-builder','price','live']
['co-builder','order', orderNo]
['co-builder','member','my']
['co-builder','float','list', { page, page_size }]
['co-builder','float','rule']
['co-builder','float','work', workId]
['co-builder','community','my']
```

刷新策略：购买成功后 `invalidateQueries(['co-builder'])` 触发整体刷新；价格 ticker 用 `refetchInterval: 5_000`。

## 8. i18n Key 计划

新增命名空间 `coBuilder`：

```
nav.coBuilder
coBuilder.brand
coBuilder.tabs.{buy,member,community}
coBuilder.buy.{hero.title, hero.subtitle, hero.cta, ecoTitle, priceLabel, priceHint, ...}
coBuilder.tier.{base.name, base.tagline, ...}
coBuilder.purchase.{title, tier, custom, lockHint, totalLabel, payCta, priceChangedTitle, priceChangedBody, errors.minQty, errors.maxQty, errors.notMultiple, ...}
coBuilder.member.{levelLabel, nextLevelHint, contribution.{base,float,identity,total}, ent.{accumulated, claimable, claimCta, lockedHint}, ...}
coBuilder.float.{rules.0,1,2, inviteCta, listEmpty, ...}
coBuilder.community.{rebateTitle, todayCommission, totalCommission, teamLockedHint, teamEmpty, ...}
coBuilder.claim.{amount, max, fee, toPlatform, toChain, addrLabel, confirmCta, success, ...}
coBuilder.errors.{insufficient, addrInvalid, ...}
```

`nav.vip` 保留兼容字符串（指向同一翻译值），避免破坏其他 UI 引用。

## 9. 状态与权限

- 钱包未连接：`/co-builder/member` 与 `/co-builder/community` 显示「连接钱包并开启共建」，CTA 触发 `ConnectWalletSheet`。
- 已连接但未购买：`/member`、`/community` 显示「立即开启共建之旅」CTA → `/co-builder/buy`；`/member/float` 显示「升级活跃会员开启」。
- 等级权限矩阵（页面级可见性）：

| 页面 | Base | Active | Regional | Ecosystem | Global |
| --- | --- | --- | --- | --- | --- |
| `/buy` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/member` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/member/float` | 占位 | ✓ | ✓ | ✓ | ✓ |
| `/community` 团队列表 | 隐藏 | 隐藏 | ✓ | ✓ | ✓ |

## 10. 原型期假设（必须由产品最终确认）

均源自 [`design/docs/Mirror.fan V2 共建者计划-PRD疑问与arts-server-v1迁移对照.md`](../../design/docs/Mirror.fan%20V2%20共建者计划-PRD疑问与arts-server-v1迁移对照.md)。原型一栏只是为了演示能跑通，**不代表产品/技术最终决策**。

| # | 议题 | 原型当前实现 |
| --- | --- | --- |
| 1 | 总贡献力公式 | 直接相加：`base + floating + identity` |
| 2 | 身份贡献力公式 | 取 PRD §5.3：`季度平均月度总贡献力 × 等级加权（1%/3%/6%）` |
| 3 | 活跃会员升级条件优先级 | `(直推 3 + 团队 KPI ≥ 10000)` 或 `社区贡献值 ≥ 500` |
| 4 | 购买档位 vs 等级 | 完全独立。购买 = 基础贡献力，等级 = 升级条件判定 |
| 5 | 自定义数量步长 | 100A 步长 / 100A 整数倍 / 单户上限 885,000A |
| 6 | 校验文案 | PRD「请算中算力类型」修正为「请选择对应贡献力档位」 |
| 7 | 跨阈值锁价 | 整单按下单时单价；锁价 60s |
| 8 | ENT 结算粒度 | 展示按秒滚动，账务按日定算（前端模拟） |
| 9 | 挖矿年限起点 | 从 1 开始（首年系数 = 1） |
| 10 | 浮动/身份生效日 | 浮动次月 5 日 00:00 生效；身份次季度首月 5 日 00:00 生效 |
| 11 | 会员 NFT 是否上链 | 原型阶段视为站内凭证，UI 标注「站内凭证」 |
| 12 | 浮动池语义 | 当月生效值，每月覆盖 |
| 13 | 30%-70% 区间 | 显式标注「无奖励」 |
| 14 | 阶段 2/3 边界 | 阶段 2 = 101–500，阶段 3 = 501+ |
| 15 | PRD 5.1 案例 | 直接采用 IP1/IP2/IP3 真实数值作为 fixture |
| 16 | 标准化分母为 0 | 单维度得分按 0 处理 |
| 17 | 邀请归因对象 | 按「创作者」归因；同一创作者多作品累加 |
| 21 | 1%/3%/6% 含义 | 加权乘数（与术语 1.1 的 10% 总池占比并存，文案分别表述） |
| 22 | 季度中途升级 | 按季度末等级，不分段加权 |
| 23 | 返佣基数 | 实付支付金额（USDT） |
| 24 | 邀请体系 | 创作者邀请与会员邀请共用同一邀请码 |

## 11. 落地切片

- **Phase A**（已完成）：本文档。
- **Phase B**（编码）：路由替换 → 类型 + Mock → 共享组件 → 页面 1 → 页面 2 → 页面 6 → 页面 3 + 4 → 页面 5 → DebugSheet 等级切换。
- **Phase C**：空/错/禁用态打磨、骨架屏 + 失败重试、回归 6 类用户视角。

## 12. 回归视角

通过 `DebugSheet` 增加「共建者等级」切换，覆盖：

- 未连钱包
- 已连钱包未购买
- Base
- Active
- Regional
- Ecosystem
- Global

确保各等级下页面文案、可见性、CTA、空态全都符合本文档约束。
