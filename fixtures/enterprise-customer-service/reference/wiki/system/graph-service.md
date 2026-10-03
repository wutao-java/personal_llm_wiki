---
knowledge_id: "K-SYSTEM-GRAPH-SERVICE"
title: "图谱服务"
type: "component"
domain: "system"
sources: ["SRC-ARC-006", "SRC-ARC-001", "SRC-ARC-002", "SRC-OPS-001"]
source_versions: ["SV-SRC-ARC-006-1", "SV-SRC-ARC-001-1", "SV-SRC-ARC-002-1", "SV-SRC-OPS-001-1"]
updated: "2026-08-03"
status: "accepted"
---

# 图谱服务

## 摘要

从当前知识版本生成节点、关系、领域、度数和稳定布局种子。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-SYSTEM-GRAPH-SERVICE 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- 属于 [[system/system-interface-architecture|系统与接口架构]]（REL-0203，证据 2 条）
- 协同支持 [[system/knowledge-service|知识服务]]（REL-0219，证据 2 条）
- [问答服务](../system/qa-service.md) 协同支持本知识（REL-0220，证据 2 条）
- 协同支持 [[system/compile-service|知识编译服务]]（REL-0318，证据 2 条）
- [订单服务](../system/order-service.md) 协同支持本知识（REL-0320，证据 2 条）
- 受其约束 [[quality/monitoring-alert|监控告警]]（REL-0426，证据 2 条）

## 来源

- SRC-ARC-006：SV-SRC-ARC-006-1
- SRC-ARC-001：SV-SRC-ARC-001-1
- SRC-ARC-002：SV-SRC-ARC-002-1
- SRC-OPS-001：SV-SRC-OPS-001-1

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
