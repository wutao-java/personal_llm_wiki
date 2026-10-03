---
knowledge_id: "K-KNOWLEDGE-SOURCE-VERSION"
title: "资料版本"
type: "data_object"
domain: "knowledge"
sources: ["SRC-KM-001", "SRC-KM-002", "SRC-KM-004", "SRC-ARC-006"]
source_versions: ["SV-SRC-KM-001-1", "SV-SRC-KM-002-1", "SV-SRC-KM-004-1", "SV-SRC-ARC-006-1"]
updated: "2026-08-03"
status: "accepted"
---

# 资料版本

## 摘要

某份资料在特定时间的只读内容版本，具有摘要和稳定定位信息。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-KNOWLEDGE-SOURCE-VERSION 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- 属于 [[knowledge/knowledge-model-management|知识处理与模型使用]]（REL-0167，证据 2 条）
- 协同支持 [[knowledge/source|资料]]（REL-0183，证据 2 条）
- [Markdown 解析](../knowledge/markdown-parser.md) 协同支持本知识（REL-0184，证据 2 条）
- [来源证据](../knowledge/evidence-fragment.md) 协同支持本知识（REL-0309，证据 2 条）
- 由其实现 [[system/source-service|资料服务]]（REL-0378，证据 2 条）
- [引用定位偏差事故](../quality/citation-offset-incident.md) 依赖本知识（REL-0444，证据 2 条）

## 来源

- SRC-KM-001：SV-SRC-KM-001-1
- SRC-KM-002：SV-SRC-KM-002-1
- SRC-KM-004：SV-SRC-KM-004-1
- SRC-ARC-006：SV-SRC-ARC-006-1

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
