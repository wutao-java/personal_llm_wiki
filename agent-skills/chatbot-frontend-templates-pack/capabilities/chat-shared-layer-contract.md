# 共享层契约 · 搬骨架起步（token + 骨架类名 + CT API）

## 何时使用

已经选好用哪个模板、要把这一页对话骨架搭起来时。还没选形态 → 先走 chat-template-selection；
要从零把整套八页做出来、怕方向性返工 → 走 chat-build-workflow（那个讲全流程，本能力只讲
"共享层契约本身长什么样、怎么搬"）；要接真后端换钩子 → 走 chat-backend-wiring。

## 契约三件（新项目直接搬 assets/shared.css + assets/shared.js，不重写）

**① 视觉 token（shared.css）**：全部视觉走 CSS 变量，`:root` 浅色 + `[data-theme="dark"]` 深色
两套（暗色是单独调的灰阶，不是反色）。新页只引 `shared.css`，颜色一律 `var(--x)`，**不写裸 hex**。
精确 hex 明暗两套见 references/visual-tokens.md。

**② 骨架类名（每页复用，别改名）**：
```
.app > .sidebar(.sb-head .new-chat .convs .item .sb-foot)
     | .main(.topbar .crumb .model-pill / .thread-wrap > .thread / .composer .c-box textarea .send)
     [+ .side-panel(.sp-head .sp-body)  ← 02/03/08 等右侧功能面板]
消息：.msg.user|.ai(.ava .who .prose .msg-actions) · details.think(思维链折叠)
状态：.empty(空态) · .pill.ok|warn|err|dim · .toast · .skel(骨架屏)
```
（05 画布式特殊：无会话侧栏，左窄对话列 + 右半屏画布。）

**③ 交互 API（shared.js 暴露 window.CT）**：
- `CT.init()`：主题切换 + composer 发送 + 演示按钮 toast，一键绑定。
- `CT.stream(el, html, {cps})`：流式打字，**深拷贝 DOM 按字符预算裁剪**（支持任意 HTML 逐字浮现）。
- `CT.demoReply = (text) => html`：每页注册自己的假回复；**接真后端就改这一个钩子**（见 chat-backend-wiring）。
- `CT.userMsg() / CT.aiMsg() / CT.toast(text)`：消息 DOM 工厂与提示。
- 主题存 `localStorage['ct-theme']`。

## 核心流程

1. 新页 `<head>` 引 `shared.css` + Google Fonts（Instrument Sans + IBM Plex Mono，中文回落 PingFang SC）。
2. 拷基线骨架（`.app/.sidebar/.main/.thread/.composer`），**只在选定模板的差异区**写新结构与 CSS
   （差异区样式也走 token）。
3. 页尾引 `shared.js`，调 `CT.init()`，注册本页 `CT.demoReply`，用 `CT.stream` 做入场流式。
4. 场景 mock 集中放，**换场景只改 mock 文案**，骨架与交互零改动。

## 反模式

- ❌ 每页各写一套样式与消息 DOM——八页不一致、单页远超 200 行；共享层先立才 200 行级。
- ❌ 视觉写裸 hex 不走 token——深色主题必失配，且过不了 check_template_integrity.py。
- ❌ 不用 CT.stream / CT.aiMsg 而各页自造流式与消息拼装——重复造轮子且易撕裂标签。

---

来源：赋范空间 · 对话产品模板（共享层契约 §二：token / 骨架类名 / window.CT API）。代码在 assets/shared.css、assets/shared.js，原样引用不重写。
