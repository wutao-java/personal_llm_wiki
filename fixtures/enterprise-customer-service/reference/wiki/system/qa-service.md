---
knowledge_id: "K-SYSTEM-QA-SERVICE"
title: "问答服务"
type: "component"
domain: "system"
sources: ["SRC-ARC-006", "SRC-ARC-001", "SRC-ARC-002", "SRC-ARC-003"]
source_versions: ["SV-SRC-ARC-006-1", "SV-SRC-ARC-001-1", "SV-SRC-ARC-002-1", "SV-SRC-ARC-003-1"]
updated: "2026-08-03"
status: "accepted"
---

# 问答服务

## 摘要

协调问题、检索、证据筛选、模型生成、引用和历史回答保存。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-SYSTEM-QA-SERVICE 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- 属于 [[system/system-interface-architecture|系统与接口架构]]（REL-0204，证据 2 条）
- 协同支持 [[system/graph-service|图谱服务]]（REL-0220，证据 2 条）
- [订单服务](../system/order-service.md) 协同支持本知识（REL-0221，证据 2 条）
- 协同支持 [[system/knowledge-service|知识服务]]（REL-0319，证据 2 条）
- [库存服务](../system/inventory-service.md) 协同支持本知识（REL-0321，证据 2 条）
- [服务目标](../project/service-level-objective.md) 由其实现本知识（REL-0337，证据 2 条）
- [回答草稿](../service/answer-draft.md) 由其实现本知识（REL-0374，证据 2 条）
- [回答生成](../knowledge/answer-generation.md) 由其实现本知识（REL-0384，证据 2 条）
- [连接测试](../knowledge/connection-test.md) 由其实现本知识（REL-0385，证据 4 条）
- 受其约束 [[quality/recovery-runbook|恢复手册]]（REL-0427，证据 2 条）

## 来源

- SRC-ARC-006：SV-SRC-ARC-006-1
- SRC-ARC-001：SV-SRC-ARC-001-1
- SRC-ARC-002：SV-SRC-ARC-002-1
- SRC-ARC-003：SV-SRC-ARC-003-1

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
