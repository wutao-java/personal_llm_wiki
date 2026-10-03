---
knowledge_id: "K-KNOWLEDGE-KNOWLEDGE-SNAPSHOT"
title: "知识版本"
type: "data_object"
domain: "knowledge"
sources: ["SRC-KM-005", "SRC-KM-002", "SRC-KM-006"]
source_versions: ["SV-SRC-KM-005-2", "SV-SRC-KM-002-1", "SV-SRC-KM-006-1"]
updated: "2026-08-03"
status: "accepted"
---

# 知识版本

## 摘要

一次原子发布的知识项、关系、证据和派生索引集合。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-KNOWLEDGE-KNOWLEDGE-SNAPSHOT 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- 属于 [[knowledge/knowledge-model-management|知识处理与模型使用]]（REL-0176，证据 2 条）
- 协同支持 [[knowledge/knowledge-review|知识审核]]（REL-0192，证据 4 条）
- [知识检索](../knowledge/retrieval.md) 协同支持本知识（REL-0193，证据 2 条）

## 来源

- SRC-KM-005：SV-SRC-KM-005-1、SV-SRC-KM-005-2
- SRC-KM-002：SV-SRC-KM-002-1
- SRC-KM-006：SV-SRC-KM-006-1

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
