---
name: chatbot-frontend-templates-pack
description: >
  对话产品前端、Chatbot 界面、RAG 溯源界面、Agent 执行链路界面、生成式 UI / 画布 / 深度研究 /
  分支 / 多智能体八形态基线模板。注意：知识图谱可视化归 knowledge-graph-viz-pack、前端产品形态
  定位与存量整改归 product-form-design-pack，均不在本包。当用户点名做对话产品前端、按"信任来自哪"
  选模板、从零搭一套对话前端、搬共享层骨架起步、接真后端换 CT.demoReply 钩子、守"基线模板≠演示馆"
  红线、跑明暗双主题验收、或排查对话前端渲染故障（弯引号截断/流式撕裂标签/泳道错位）时使用。
  须由用户显式点名激活，不主动抢入其他前端工作流。不适用于：知识图谱可视化（knowledge-graph-viz-pack）、
  前端产品形态体检（product-form-design-pack）、纯组件配色美化（前端设计类技能）、
  Chat 后端 API/SSE 服务开发（agent-fastapi-service-pack）。
---

# 对话产品模板 · 八形态基线画廊

把一个对话产品需求，按"这个产品的信任来自哪"选定八模板之一作基线，搬共享层契约起步，改差异区与 mock 即得产品级骨架。本文件是入口路由：判断当前任务属于哪类，读取对应能力文件执行，不要一次全读。

## 首要教训（置顶，先读）

**基线模板 ≠ 演示馆。** 这套模板的第一版做成了星图馆式炫酷展览馆，被推翻重做——"产品模板"和"效果演示"是两种东西。模板要**克制中性、像真产品**（对标 ChatGPT / Perplexity 的质感），渐变霓虹 / 粒子背景 / 装饰堆砌只适合展示场景，不属于这里。本包与 knowledge-graph-viz-pack（星图馆，炫酷展示可视化）视觉定位**相对**：那个越炫越好，这个越像真产品越好。任何"做炫酷点"的诉求，先读 chat-product-redlines 再动手。

## 触发纪律（先读）

本包只在用户**显式点名**做对话产品前端 / Chatbot 界面 / RAG 溯源界面 / Agent 链路界面 / 对话产品模板时激活。看到"前端""可视化"三个字不等于本包场景——**知识图谱可视化**归 knowledge-graph-viz-pack，**前端产品形态定位 / 存量前端体检**归 product-form-design-pack，**后端 API/SSE 服务**归 agent-fastapi-service-pack。任何时候都不要在别的工作流里主动推销本包。

## 核心工作流（顺序固定）

1. **选形态**：按"这个产品的信任来自哪"给选型判句；用户显式点名"用对话产品模板选型"则弹 assets/index.html 画廊让用户亲挑 → 见 chat-template-selection
2. **搬共享层起步**：引 shared.css（token）+ 骨架类名 + shared.js（window.CT），每页只写差异区 → 见 chat-shared-layer-contract
3. **逐页建**（从零一整套时）：三决策先锁 → index 先行 → 共享层先立 → 逐页建 + 专业密度 mock → 见 chat-build-workflow
4. **接真后端**：只改 CT.demoReply / CT.stream 两个钩子，消费端逻辑不变 → 见 chat-backend-wiring
5. **守红线 + 验收**：改动全程守 chat-product-redlines；交付前跑 chat-dual-theme-acceptance 明暗双主题闭环
（渲染/交互出坑 → chat-gallery-troubleshooting 按症状定位）

## 能力地图（按需读取，不要一次全读）

**选得对（决策）**
- 八形态选型（"信任来自哪"判句 + 显式点名弹画廊让用户挑）：见 [capabilities/chat-template-selection.md](capabilities/chat-template-selection.md)

**把事做对（方法）** ——三个方法能力话术级分流，别选错门：
- **搬骨架起步**（已选好模板，要把这一页骨架搭起来）：shared.css token + 骨架类名 + shared.js CT 契约 → 见 [capabilities/chat-shared-layer-contract.md](capabilities/chat-shared-layer-contract.md)
- **从零一整套的全流程**（三决策 → index 先行 → 逐页建，怕方向性返工）：见 [capabilities/chat-build-workflow.md](capabilities/chat-build-workflow.md)
- **接真后端换钩子**（模板搭好了要接自己的后端 SSE）：只改 CT.demoReply / CT.stream → 见 [capabilities/chat-backend-wiring.md](capabilities/chat-backend-wiring.md)

**不做错事（约束）** ——改视觉 / 加交互**动手前先读**，全程遵守：
- 产品红线（基线模板≠演示馆 · 禁含糊词/裸 hex · 按钮地板 · craft 底线）：见 [capabilities/chat-product-redlines.md](capabilities/chat-product-redlines.md)

**出问题能查（诊断）** ——弯引号截断 / 流式撕裂标签 / 泳道错位 / 主题按钮误判时按症状定位：
- 8 坑排查表 + 表外症状通用降级：见 [capabilities/chat-gallery-troubleshooting.md](capabilities/chat-gallery-troubleshooting.md)

**知道做没做好（验收）** ——任务**完成后必过**：
- 明暗双主题 Playwright 验收闭环（长模拟等跑完再截图）：见 [capabilities/chat-dual-theme-acceptance.md](capabilities/chat-dual-theme-acceptance.md)

## 使用原则

1. 首要教训常在：任何"炫酷化"诉求先读约束——基线模板要像真产品，不做演示馆。
2. 共享层先立：每页只写差异区与 mock，视觉全走 CSS 变量 token，单页 200 行级；裸 hex 散落不得交付。
3. 完成必过验收：交付前跑明暗双主题 Playwright 闭环，零 console 报错、交互真响应、长模拟等跑完再截图才算完。
4. 脚本执行不阅读：Run `python3 scripts/check_template_integrity.py <页面或目录>` 只看结论；自身可靠性可 `--selftest` 自证。
5. 模板在 assets/：八模板 HTML + shared.css/shared.js + index 选型画廊是可改模板，接入即复制改差异区与 mock，不从零手写。
