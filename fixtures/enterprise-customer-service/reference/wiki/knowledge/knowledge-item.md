---
knowledge_id: "K-KNOWLEDGE-KNOWLEDGE-ITEM"
title: "知识项"
type: "data_object"
domain: "knowledge"
sources: ["SRC-KM-003", "SRC-KM-002", "SRC-KM-004", "SRC-ARC-006"]
source_versions: ["SV-SRC-KM-003-1", "SV-SRC-KM-002-1", "SV-SRC-KM-004-1", "SV-SRC-ARC-006-1"]
updated: "2026-08-03"
status: "accepted"
---

# 知识项

## 摘要

按稳定知识单元重组的标题、摘要、正文、类型、状态和来源集合。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-KNOWLEDGE-KNOWLEDGE-ITEM 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- 属于 [[knowledge/knowledge-model-management|知识处理与模型使用]]（REL-0171，证据 2 条）
- 协同支持 [[knowledge/compile-run|编译任务]]（REL-0187，证据 2 条）
- [知识类型](../knowledge/knowledge-type.md) 协同支持本知识（REL-0188，证据 2 条）
- 协同支持 [[knowledge/evidence-fragment|来源证据]]（REL-0311，证据 2 条）
- [知识关系](../knowledge/relation.md) 协同支持本知识（REL-0313，证据 2 条）
- 由其实现 [[system/knowledge-service|知识服务]]（REL-0380，证据 2 条）

## 来源

- SRC-KM-003：SV-SRC-KM-003-1
- SRC-KM-002：SV-SRC-KM-002-1
- SRC-KM-004：SV-SRC-KM-004-1
- SRC-ARC-006：SV-SRC-ARC-006-1

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
