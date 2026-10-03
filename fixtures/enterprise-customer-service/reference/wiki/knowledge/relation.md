---
knowledge_id: "K-KNOWLEDGE-RELATION"
title: "知识关系"
type: "data_object"
domain: "knowledge"
sources: ["SRC-KM-004", "SRC-KM-002", "SRC-KM-003", "SRC-KM-005"]
source_versions: ["SV-SRC-KM-004-1", "SV-SRC-KM-002-1", "SV-SRC-KM-003-1", "SV-SRC-KM-005-2"]
updated: "2026-08-03"
status: "accepted"
---

# 知识关系

## 摘要

连接两个知识项并记录明确语义、方向、权重和证据的对象。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-KNOWLEDGE-RELATION 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- 属于 [[knowledge/knowledge-model-management|知识处理与模型使用]]（REL-0173，证据 2 条）
- 协同支持 [[knowledge/knowledge-type|知识类型]]（REL-0189，证据 2 条）
- [审核问题](../knowledge/review-issue.md) 协同支持本知识（REL-0190，证据 2 条）
- 协同支持 [[knowledge/knowledge-item|知识项]]（REL-0313，证据 2 条）
- [知识审核](../knowledge/knowledge-review.md) 协同支持本知识（REL-0315，证据 4 条）
- 由其实现 [[system/knowledge-service|知识服务]]（REL-0381，证据 2 条）
- 由其衡量 [[quality/relation-coverage|关系证据覆盖率]]（REL-0413，证据 2 条）

## 来源

- SRC-KM-004：SV-SRC-KM-004-1
- SRC-KM-002：SV-SRC-KM-002-1
- SRC-KM-003：SV-SRC-KM-003-1
- SRC-KM-005：SV-SRC-KM-005-1、SV-SRC-KM-005-2

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
