---
knowledge_id: "K-KNOWLEDGE-RETRIEVAL"
title: "知识检索"
type: "process"
domain: "knowledge"
sources: ["SRC-KM-006", "SRC-KM-002", "SRC-KM-005", "SRC-ARC-006"]
source_versions: ["SV-SRC-KM-006-1", "SV-SRC-KM-002-1", "SV-SRC-KM-005-2", "SV-SRC-ARC-006-1"]
updated: "2026-08-03"
status: "accepted"
---

# 知识检索

## 摘要

只在当前已接受知识版本中寻找与问题相关的知识和来源证据。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-KNOWLEDGE-RETRIEVAL 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- 属于 [[knowledge/knowledge-model-management|知识处理与模型使用]]（REL-0177，证据 2 条）
- 协同支持 [[knowledge/knowledge-snapshot|知识版本]]（REL-0193，证据 2 条）
- [推荐问题](../knowledge/suggested-question.md) 协同支持本知识（REL-0194，证据 2 条）
- 由其实现 [[system/search-index|检索索引]]（REL-0383，证据 2 条）
- 由其衡量 [[quality/graph-consistency|图谱一致性]]（REL-0414，证据 2 条）

## 来源

- SRC-KM-006：SV-SRC-KM-006-1
- SRC-KM-002：SV-SRC-KM-002-1
- SRC-KM-005：SV-SRC-KM-005-1、SV-SRC-KM-005-2
- SRC-ARC-006：SV-SRC-ARC-006-1

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
