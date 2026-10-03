---
knowledge_id: "K-KNOWLEDGE-ANSWER-GENERATION"
title: "回答生成"
type: "process"
domain: "knowledge"
sources: ["SRC-KM-006", "SRC-KM-002", "SRC-KM-007", "SRC-ARC-006"]
source_versions: ["SV-SRC-KM-006-1", "SV-SRC-KM-002-1", "SV-SRC-KM-007-2", "SV-SRC-ARC-006-1"]
updated: "2026-08-03"
status: "accepted"
---

# 回答生成

## 摘要

基于检索证据形成回答并明确引用，不在证据不足时生成确定结论。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-KNOWLEDGE-ANSWER-GENERATION 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- 属于 [[knowledge/knowledge-model-management|知识处理与模型使用]]（REL-0179，证据 2 条）
- 协同支持 [[knowledge/suggested-question|推荐问题]]（REL-0195，证据 2 条）
- [模型配置](../knowledge/model-profile.md) 协同支持本知识（REL-0196，证据 2 条）
- 由其实现 [[system/qa-service|问答服务]]（REL-0384，证据 2 条）

## 来源

- SRC-KM-006：SV-SRC-KM-006-1
- SRC-KM-002：SV-SRC-KM-002-1
- SRC-KM-007：SV-SRC-KM-007-1、SV-SRC-KM-007-2
- SRC-ARC-006：SV-SRC-ARC-006-1

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
