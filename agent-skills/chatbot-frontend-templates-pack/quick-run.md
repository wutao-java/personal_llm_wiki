# Quick Run · 30 秒见效

## 演示任务

复制给你的 Agent：

```
我要做带溯源引用的 RAG 产品前端，该用哪个模板？
```

## 你应该看到

- Agent 用一句选型判句回答：**这个产品的信任来自"出处可查" → 选 02 RAG 溯源（Perplexity 式）**，
  差异区是右侧来源面板、引用角标点击定位原文高亮。
- 它给出**搬共享层起步三步**：引 `assets/shared.css`（token）+ `assets/shared.js`（window.CT）→
  套 02 骨架（`.app/.sidebar/.main/.thread/.composer` + 右侧 `.side-panel`）→ 只写差异区（来源面板）
  与场景 mock。
- 它提醒你：接真后端时**只改 CT.demoReply 一个钩子**（流式换 CT.stream 为 SSE），视觉全走 token
  不散裸 hex；交付前跑明暗双主题验收。

## 对照（没装包时的典型表现）

不装包时，Agent 直接手写一个对话页：要么套个渐变炫酷的"演示馆"皮，要么随手给个基线布局，
**不问"这个产品的信任来自哪"**，裸 hex 散落、按钮点了没反应、流式用 innerHTML 逐字截断撕裂标签。
你拿到的是一张一眼 demo 的页面，而不是从八种实测形态里按信任诉求选出的那一种产品级骨架。

## 没生效？

1. 确认包目录在 `.claude/skills/` 或 `agent-skills/` 下且含 SKILL.md。
2. Codex 用户可显式调用：`$chatbot-frontend-templates-pack`。
3. 仍有问题 → 课程平台「FuFan Agent 控制台」提交反馈。
