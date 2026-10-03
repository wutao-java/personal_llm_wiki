---
knowledge_id: "K-QUALITY-RELATION-COVERAGE"
title: "关系证据覆盖率"
type: "metric"
domain: "quality"
sources: ["SRC-QA-001", "SRC-PROJ-005", "SRC-KM-004", "SRC-ARC-005"]
source_versions: ["SV-SRC-QA-001-1", "SV-SRC-PROJ-005-1", "SV-SRC-KM-004-1", "SV-SRC-ARC-005-1"]
updated: "2026-08-03"
status: "accepted"
---

# 关系证据覆盖率

## 摘要

衡量已接受关系中具备可访问证据的比例。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-QUALITY-RELATION-COVERAGE 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- 属于 [[quality/quality-security-operations|质量、安全与运营管理]]（REL-0234，证据 2 条）
- 协同支持 [[quality/citation-accuracy|引用准确率]]（REL-0250，证据 2 条）
- [图谱一致性](../quality/graph-consistency.md) 协同支持本知识（REL-0251，证据 2 条）
- 协同支持 [[quality/answer-groundedness|回答有据性]]（REL-0324，证据 2 条）
- [编译成功率](../quality/compile-success-rate.md) 协同支持本知识（REL-0326，证据 2 条）
- [服务渠道](../project/service-channel.md) 由其衡量本知识（REL-0388，证据 2 条）
- [知识关系](../knowledge/relation.md) 由其衡量本知识（REL-0413，证据 2 条）
- [工单服务](../system/ticket-service.md) 由其衡量本知识（REL-0431，证据 2 条）

## 来源

- SRC-QA-001：SV-SRC-QA-001-1
- SRC-PROJ-005：SV-SRC-PROJ-005-1
- SRC-KM-004：SV-SRC-KM-004-1
- SRC-ARC-005：SV-SRC-ARC-005-1

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
