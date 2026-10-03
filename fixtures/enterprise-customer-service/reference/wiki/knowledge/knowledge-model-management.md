---
knowledge_id: "K-KNOWLEDGE-KNOWLEDGE-MODEL-MANAGEMENT"
title: "知识处理与模型使用"
type: "domain"
domain: "knowledge"
sources: ["SRC-KM-002", "SRC-KM-001", "SRC-KM-004", "SRC-KM-003"]
source_versions: ["SV-SRC-KM-002-1", "SV-SRC-KM-001-1", "SV-SRC-KM-004-1", "SV-SRC-KM-003-1"]
updated: "2026-08-03"
status: "accepted"
---

# 知识处理与模型使用

## 摘要

负责来源版本、知识编译、关系证据、审核发布、检索回答和模型配置。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-KNOWLEDGE-KNOWLEDGE-MODEL-MANAGEMENT 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- [资料](../knowledge/source.md) 属于本知识（REL-0166，证据 2 条）
- [资料版本](../knowledge/source-version.md) 属于本知识（REL-0167，证据 2 条）
- [Markdown 解析](../knowledge/markdown-parser.md) 属于本知识（REL-0168，证据 2 条）
- [来源证据](../knowledge/evidence-fragment.md) 属于本知识（REL-0169，证据 2 条）
- [编译任务](../knowledge/compile-run.md) 属于本知识（REL-0170，证据 2 条）
- [知识项](../knowledge/knowledge-item.md) 属于本知识（REL-0171，证据 2 条）
- [知识类型](../knowledge/knowledge-type.md) 属于本知识（REL-0172，证据 2 条）
- [知识关系](../knowledge/relation.md) 属于本知识（REL-0173，证据 2 条）
- [审核问题](../knowledge/review-issue.md) 属于本知识（REL-0174，证据 2 条）
- [知识审核](../knowledge/knowledge-review.md) 属于本知识（REL-0175，证据 4 条）
- [知识版本](../knowledge/knowledge-snapshot.md) 属于本知识（REL-0176，证据 2 条）
- [知识检索](../knowledge/retrieval.md) 属于本知识（REL-0177，证据 2 条）
- [推荐问题](../knowledge/suggested-question.md) 属于本知识（REL-0178，证据 2 条）
- [回答生成](../knowledge/answer-generation.md) 属于本知识（REL-0179，证据 2 条）
- [模型配置](../knowledge/model-profile.md) 属于本知识（REL-0180，证据 2 条）
- [连接测试](../knowledge/connection-test.md) 属于本知识（REL-0181，证据 4 条）
- [旧值防线](../knowledge/stale-answer-guard.md) 属于本知识（REL-0182，证据 2 条）
- 由其实现 [[system/knowledge-service|知识服务]]（REL-0377，证据 2 条）
- 由其衡量 [[quality/answer-groundedness|回答有据性]]（REL-0411，证据 2 条）

## 来源

- SRC-KM-002：SV-SRC-KM-002-1
- SRC-KM-001：SV-SRC-KM-001-1
- SRC-KM-004：SV-SRC-KM-004-1
- SRC-KM-003：SV-SRC-KM-003-1

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
