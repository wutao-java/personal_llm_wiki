---
name: knowledge-graph-viz-pack
description: >
  知识图谱可视化、图谱美化升级、星图馆、把图谱换成酷炫可视化范式。当用户点名要优化/美化/升级
  已有知识图谱的前端展示、在十种可视化范式（GPU 星云 / 辉光 3D / 邻接矩阵 / 双曲圆盘 / 时间演化 等）
  间选型、把项目真实图谱数据适配进展厅模板、守住配色与发光红线、排查白屏/过曝/发虚等渲染故障、
  或跑截图验证闭环时使用。触发须由用户显式点名（关键词：可视化 / 美化 / 优化 / 酷炫 / 星图馆），
  不主动抢入其他工作流。不适用于：构建知识图谱、GraphRAG 索引、实体关系抽取（归 rag-graphrag-pack）；
  编译知识库、raw→wiki、GBrain 建库（归 compiled-rag-pack）；非图谱的普通图表 / 仪表盘（归前端设计类技能）。
---

# 知识图谱可视化 · 星图馆

把项目里"丑的"知识图谱前端，按十种实测范式升级成深空天文台级可视化。本文件是入口路由：判断当前任务属于哪类，读取对应能力文件执行，不要一次全读。

## 触发纪律（先读）

本包只在用户**显式点名**可视化/美化/优化/酷炫/星图馆时激活。看到"知识图谱"三个字不等于本包场景——**构建图谱**归 rag-graphrag-pack，**编译知识库/建库**归 compiled-rag-pack。任何时候都不要在别的工作流里主动推销本包，也不要替用户擅自决定审美。

## 核心工作流（顺序固定）

1. **选范式**：默认起本地服务打开画廊让用户亲选（用户已点名范式则跳过）→ 见 kg-paradigm-selection
2. **认数据源**：识别上游图谱产物形态，映射进 data.js 契约 → 见 kg-upstream-adapters + kg-data-contract-adaptation
3. **套模板 + 守红线**：套选定展厅模板，改配色/引库/调发光前先过约束 → 见 kg-visual-redlines
4. **验证闭环**：Playwright 截图 + console 查错，零 error 且视觉达标才算完 → 见 kg-verification-loop
（任一步出白屏/过曝/发虚 → kg-render-troubleshooting 按症状定位）

## 能力地图（按需读取，不要一次全读）

**选得对（决策）**
- 十范式选型（问题→五大家族→范式）+ 默认弹画廊：见 [capabilities/kg-paradigm-selection.md](capabilities/kg-paradigm-selection.md)

**把事做对（方法）**
- 上游图谱产物→data.js 适配配方（GraphRAG / GBrain / 通用边表）：见 [capabilities/kg-upstream-adapters.md](capabilities/kg-upstream-adapters.md)
- data.js 数据契约 + 套展厅模板产出可视化：见 [capabilities/kg-data-contract-adaptation.md](capabilities/kg-data-contract-adaptation.md)

**不做错事（约束）** ——改配色 / 引库 / 调发光**动手前先读**，全程遵守：
- 视觉红线（配色必机检 · CDN 源 · bloom 安全起点）：见 [capabilities/kg-visual-redlines.md](capabilities/kg-visual-redlines.md)

**出问题能查（诊断）** ——页面白屏 / 过曝 / 发虚 / 隐形 / 动画失效时按症状定位：
- 渲染故障排查（8 条实测坑 + 症状表外降级）：见 [capabilities/kg-render-troubleshooting.md](capabilities/kg-render-troubleshooting.md)

**知道做没做好（验收）** ——任务**完成后必过**：
- 截图验证闭环（零 console error + 视觉达标 + 交互点验）：见 [capabilities/kg-verification-loop.md](capabilities/kg-verification-loop.md)

## 使用原则

1. 约束红线常在：改配色/引库/调 bloom 动手前先读约束文件；新配色未过 `scripts/validate_palette.js` 机检不得交付。
2. 完成必过验收：交付前跑 Playwright 截图闭环，零 error 且非白屏/过曝才算完；不看渲染就宣布完成 = 没做完。
3. 脚本执行不阅读：Run `scripts/validate_palette.js "<hex,...>" --mode dark` 只看结论；自身可靠性可 `--selftest` 自证。
4. 数据来自真实产物：data.js 必须消费用户项目真实图谱，节点/边数与源对账；禁占位假数据、禁散写进 HTML。
5. 展厅模板在 assets/：十范式 HTML + data.js + shared.css 是可改模板，接入即复制改数据，不从零手写。
