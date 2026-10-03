---
knowledge_id: "K-QUALITY-ANSWER-GROUNDEDNESS"
title: "回答有据性"
type: "metric"
domain: "quality"
sources: ["SRC-QA-001", "SRC-PROJ-001", "SRC-ORD-005", "SRC-KM-002"]
source_versions: ["SV-SRC-QA-001-1", "SV-SRC-PROJ-001-1", "SV-SRC-ORD-005-1", "SV-SRC-KM-002-1"]
updated: "2026-08-03"
status: "accepted"
---

# 回答有据性

## 摘要

衡量回答中的可验证结论是否由采用的来源证据支持。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-QUALITY-ANSWER-GROUNDEDNESS 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- 属于 [[quality/quality-security-operations|质量、安全与运营管理]]（REL-0232，证据 2 条）
- [引用准确率](../quality/citation-accuracy.md) 协同支持本知识（REL-0249，证据 2 条）
- [关系证据覆盖率](../quality/relation-coverage.md) 协同支持本知识（REL-0324，证据 2 条）
- [客户服务知识系统项目](../project/customer-service-knowledge-project.md) 由其衡量本知识（REL-0386，证据 2 条）
- [幂等键](../order/idempotency-key.md) 由其衡量本知识（REL-0399，证据 2 条）
- [知识处理与模型使用](../knowledge/knowledge-model-management.md) 由其衡量本知识（REL-0411，证据 2 条）
- [库存服务](../system/inventory-service.md) 由其衡量本知识（REL-0429，证据 2 条）

## 来源

- SRC-QA-001：SV-SRC-QA-001-1
- SRC-PROJ-001：SV-SRC-PROJ-001-1
- SRC-ORD-005：SV-SRC-ORD-005-1
- SRC-KM-002：SV-SRC-KM-002-1

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
