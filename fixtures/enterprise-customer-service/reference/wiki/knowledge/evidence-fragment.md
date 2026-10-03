---
knowledge_id: "K-KNOWLEDGE-EVIDENCE-FRAGMENT"
title: "来源证据"
type: "data_object"
domain: "knowledge"
sources: ["SRC-KM-004", "SRC-KM-002", "SRC-KM-001", "SRC-KM-003"]
source_versions: ["SV-SRC-KM-004-1", "SV-SRC-KM-002-1", "SV-SRC-KM-001-1", "SV-SRC-KM-003-1"]
updated: "2026-08-03"
status: "accepted"
---

# 来源证据

## 摘要

通过来源版本和字符范围定位的原文片段，用于支持知识、关系和回答。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-KNOWLEDGE-EVIDENCE-FRAGMENT 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- 属于 [[knowledge/knowledge-model-management|知识处理与模型使用]]（REL-0169，证据 2 条）
- 协同支持 [[knowledge/markdown-parser|Markdown 解析]]（REL-0185，证据 2 条）
- [编译任务](../knowledge/compile-run.md) 协同支持本知识（REL-0186，证据 2 条）
- 协同支持 [[knowledge/source-version|资料版本]]（REL-0309，证据 2 条）
- [知识项](../knowledge/knowledge-item.md) 协同支持本知识（REL-0311，证据 2 条）
- 由其实现 [[system/knowledge-service|知识服务]]（REL-0379，证据 2 条）
- 由其衡量 [[quality/citation-accuracy|引用准确率]]（REL-0412，证据 2 条）

## 来源

- SRC-KM-004：SV-SRC-KM-004-1
- SRC-KM-002：SV-SRC-KM-002-1
- SRC-KM-001：SV-SRC-KM-001-1
- SRC-KM-003：SV-SRC-KM-003-1

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
