---
knowledge_id: "K-SYSTEM-KNOWLEDGE-SERVICE"
title: "知识服务"
type: "component"
domain: "system"
sources: ["SRC-ARC-006", "SRC-ARC-001", "SRC-PROJ-002", "SRC-PROJ-003"]
source_versions: ["SV-SRC-ARC-006-1", "SV-SRC-ARC-001-1", "SV-SRC-PROJ-002-1", "SV-SRC-PROJ-003-1"]
updated: "2026-08-03"
status: "accepted"
---

# 知识服务

## 摘要

提供知识详情、来源、关系和当前知识版本读取能力。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-SYSTEM-KNOWLEDGE-SERVICE 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- 属于 [[system/system-interface-architecture|系统与接口架构]]（REL-0202，证据 2 条）
- 协同支持 [[system/compile-service|知识编译服务]]（REL-0218，证据 2 条）
- [图谱服务](../system/graph-service.md) 协同支持本知识（REL-0219，证据 2 条）
- 协同支持 [[system/source-service|资料服务]]（REL-0317，证据 2 条）
- [问答服务](../system/qa-service.md) 协同支持本知识（REL-0319，证据 2 条）
- [交付范围](../project/delivery-scope.md) 由其实现本知识（REL-0333，证据 2 条）
- [知识审核人员](../project/knowledge-reviewer-role.md) 由其实现本知识（REL-0335，证据 2 条）
- [项目术语](../project/project-glossary.md) 由其实现本知识（REL-0338，证据 2 条）
- [知识版本发布](../project/snapshot-release.md) 由其实现本知识（REL-0340，证据 2 条）
- [商品价格](../catalog/price.md) 由其实现本知识（REL-0348，证据 2 条）
- [引用](../service/citation.md) 由其实现本知识（REL-0375，证据 2 条）
- [知识处理与模型使用](../knowledge/knowledge-model-management.md) 由其实现本知识（REL-0377，证据 2 条）
- [来源证据](../knowledge/evidence-fragment.md) 由其实现本知识（REL-0379，证据 2 条）
- [知识项](../knowledge/knowledge-item.md) 由其实现本知识（REL-0380，证据 2 条）
- [知识关系](../knowledge/relation.md) 由其实现本知识（REL-0381，证据 2 条）
- 受其约束 [[quality/source-integrity|来源完整性]]（REL-0417，证据 2 条）
- 受其约束 [[quality/audit-log|操作记录]]（REL-0425，证据 2 条）

## 来源

- SRC-ARC-006：SV-SRC-ARC-006-1
- SRC-ARC-001：SV-SRC-ARC-001-1
- SRC-PROJ-002：SV-SRC-PROJ-002-1
- SRC-PROJ-003：SV-SRC-PROJ-003-1

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
