# 视觉 token 表 · 正经产品级（与星图馆炫酷系相对）

> 目录：明暗两套精确 hex · 字体 · craft 底线 · 用法纪律。
> 事实源 = assets/shared.css 的 `:root`（浅色）与 `[data-theme="dark"]`（深色）。
> 新页视觉一律走 `var(--x)`，不写裸 hex；深色是**单独调的灰阶，不是反色**。

## 明暗两套精确 hex

| token | 浅色 `:root` | 深色 `[data-theme="dark"]` | 用途 |
|---|---|---|---|
| `--bg` | `#f7f7f8` | `#131316` | 页面底 |
| `--surface` | `#ffffff` | `#1b1b1f` | 卡片/面板面 |
| `--surface-2` | `#f1f1f3` | `#232328` | 次级面（用户气泡/代码块底） |
| `--surface-3` | `#ececee` | `#2b2b31` | 三级面（hover/选中） |
| `--border` | `#e4e4e8` | `#2a2a31` | 常规描边 |
| `--border-hi` | `#d0d0d6` | `#3a3a42` | 强描边/hover |
| `--ink` | `#18181b` | `#ececf1` | 主文字 |
| `--dim` | `#6e6e78` | `#9d9da8` | 次要文字 |
| `--faint` | `#a5a5af` | `#5e5e68` | 最弱文字/占位 |
| `--accent` | `#0d9488`（teal） | `#2dd4bf` | **唯一强调色**：发送键/引用/高亮 |
| `--accent-ink` | `#ffffff` | `#06211d` | 强调色上的文字 |
| `--warn` | `#d97706` | `#fbbf24` | 警告 pill |
| `--err` | `#dc2626` | `#f87171` | 错误 pill |
| `--ok` | `#16a34a` | `#4ade80` | 成功 pill/在线点 |

透明衍生色用 `--accent-soft` / `--accent-line` / `--warn-soft` 等（shared.css 已定义），
或 `color-mix(in srgb, var(--x) N%, transparent)`——别用 `rgba` 硬编码（换主题会失配，见坑 4）。

## 字体

- 界面：`Instrument Sans`（避免 Inter / Roboto 的均值脸）。
- 数据 / 时间戳 / 角标：`IBM Plex Mono`——**数字与时间戳一律 mono**。
- 中文回落：`PingFang SC` / `Microsoft YaHei`。
- CSS 变量：`--sans` / `--mono`（shared.css 已定义）。

## 强调色纪律

**强调色只给一个（`--accent`），只用在"最该点的东西"上**：发送键、引用角标、高亮、当前项左条。
不到处撒——撒了就从"产品级"滑向"演示馆"。

## craft 底线（每页交付前过一遍）

1. 空态有引导不留白屏（用 `.empty` 给引导 + 建议芯片）。
2. hover 全部有态变（`.item` / 按钮 / 卡片都有 hover 反馈）。
3. 操作有即时反馈（toast / 流式 / 状态翻转，无死按钮）。
4. 数字与时间戳一律 mono。
5. **区块间距 > 区块内间距**（`.thread` gap 26px 之类，让结构一眼可读）。

## 圆角与尺寸 token

`--r-lg 14px` / `--r-md 9px` / `--r-sm 5px`；`--sidebar-w 248px`；`--thread-w 780px`。

---

来源：赋范空间 · 对话产品模板（视觉系统 §五 · shared.css token）。
