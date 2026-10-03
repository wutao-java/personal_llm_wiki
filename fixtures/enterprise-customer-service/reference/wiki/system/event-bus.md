---
knowledge_id: "K-SYSTEM-EVENT-BUS"
title: "事件总线"
type: "component"
domain: "system"
sources: ["SRC-ARC-007", "SRC-ARC-001", "SRC-CAT-005", "SRC-OPS-003"]
source_versions: ["SV-SRC-ARC-007-1", "SV-SRC-ARC-001-1", "SV-SRC-CAT-005-1", "SV-SRC-OPS-003-1"]
updated: "2026-08-03"
status: "accepted"
---

# 事件总线

## 摘要

传递订单、库存、支付、履约和知识发布等异步事件。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-SYSTEM-EVENT-BUS 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- 属于 [[system/system-interface-architecture|系统与接口架构]]（REL-0211，证据 2 条）
- 协同支持 [[system/api-gateway|接口网关]]（REL-0227，证据 2 条）
- [重试策略](../system/retry-policy.md) 协同支持本知识（REL-0228，证据 2 条）
- [缺货](../catalog/stockout.md) 由其实现本知识（REL-0347，证据 2 条）
- [支付回调积压事故](../quality/payment-callback-backlog.md) 依赖本知识（REL-0441，证据 2 条）

## 来源

- SRC-ARC-007：SV-SRC-ARC-007-1
- SRC-ARC-001：SV-SRC-ARC-001-1
- SRC-CAT-005：SV-SRC-CAT-005-1
- SRC-OPS-003：SV-SRC-OPS-003-1

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
