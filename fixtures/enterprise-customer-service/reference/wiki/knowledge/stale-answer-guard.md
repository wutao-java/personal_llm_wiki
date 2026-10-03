---
knowledge_id: "K-KNOWLEDGE-STALE-ANSWER-GUARD"
title: "旧值防线"
type: "rule"
domain: "knowledge"
sources: ["SRC-KM-008", "SRC-KM-002", "SRC-KM-007"]
source_versions: ["SV-SRC-KM-008-1", "SV-SRC-KM-002-1", "SV-SRC-KM-007-2"]
updated: "2026-08-03"
status: "accepted"
---

# 旧值防线

## 摘要

来源发生变化后标记待编译；新知识版本发布前不得把旧结果伪装为当前答案。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-KNOWLEDGE-STALE-ANSWER-GUARD 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- 属于 [[knowledge/knowledge-model-management|知识处理与模型使用]]（REL-0182，证据 2 条）
- 协同支持 [[knowledge/connection-test|连接测试]]（REL-0198，证据 4 条）

## 来源

- SRC-KM-008：SV-SRC-KM-008-1
- SRC-KM-002：SV-SRC-KM-002-1
- SRC-KM-007：SV-SRC-KM-007-1、SV-SRC-KM-007-2

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
