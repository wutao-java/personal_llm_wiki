# 接真后端 · 只改两个钩子（CT.demoReply / CT.stream）

## 何时使用

模板骨架已搭好、要把假回复接到自己真实后端时。还在选型/搭骨架阶段 → 走 chat-template-selection
/ chat-shared-layer-contract；要写后端 API/SSE 服务本身 → 归 agent-fastapi-service-pack，不在本包。
本能力只解决"前端这一层怎么从假回复切到真后端"。

## 核心思路

模板的布局与交互都是真的，**只有回复是假的**。接真后端 = 换掉产生回复的两个点，消费端逻辑不变：

1. **`CT.demoReply`（每页的假回复钩子）** → 换成调你后端的真实回复。
   - 演示态：`CT.demoReply = (text) => '<p>...</p>'`（返回 HTML 字符串）。
   - 接后端：让它去请求你的接口拿到内容再返回；**★接真后端就改这一个钩子**。
2. **`CT.stream(el, html, {cps})`（流式打字模拟）** → 换成 **SSE 增量渲染**。
   - 演示态 `CT.stream` 是"深拷贝 DOM 按文本预算裁剪"模拟逐字浮现。
   - 接后端：把它替换成消费 SSE 分块、增量往 `el` 追加渲染；**消费端调用逻辑不变**（谁调 stream 不用改）。

## 核心流程（校验→修复→重试）

1. 定位本页的 `CT.demoReply` 与调用 `CT.stream` 的地方（通常在页尾 `<script>`）。
2. 把 `CT.demoReply` 改为请求真后端；把 `CT.stream` 换成 SSE 增量渲染实现，签名保持 `(el, chunk...)`。
3. 校验：token 不许散成 magic number；`localStorage['ct-theme']` 在 `file://` 与 `http://` 是不同
   origin 偏好不互通——**验证一律用 http 起本地服务**，别用 file:// 双击。
4. 交付前跑 chat-dual-theme-acceptance 明暗双主题闭环。

## 反模式

- ❌ 流式用 `innerHTML` 逐字符截断做打字机——会撕裂 HTML 标签；正解是**深拷贝 DOM 树按文本
  预算裁剪节点**（见 assets/shared.js 里 CT.stream 的 clip）。
- ❌ 接后端时改遍消费端逻辑——应只换 CT.demoReply / CT.stream 两个钩子，其余零改动。
- ❌ 把接口地址、颜色等 token 硬编码散落成 magic number——集中可配，视觉走 CSS 变量。

---

来源：赋范空间 · 对话产品模板（共享层契约 §二 CT.demoReply/CT.stream · 封装建议 §七-3）。钩子实现在 assets/shared.js。
