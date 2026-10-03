---
knowledge_id: "K-SERVICE-ANSWER-DRAFT"
title: "回答草稿"
type: "data_object"
domain: "service"
sources: ["SRC-CS-007", "SRC-CS-001", "SRC-CS-004", "SRC-ARC-006"]
source_versions: ["SV-SRC-CS-007-1", "SV-SRC-CS-001-1", "SV-SRC-CS-004-1", "SV-SRC-ARC-006-1"]
updated: "2026-08-03"
status: "accepted"
---

# 回答草稿

## 摘要

基于当前知识版本和检索证据生成、尚待输出或确认的回答内容。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-SERVICE-ANSWER-DRAFT 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- 属于 [[service/customer-service-management|客户服务管理]]（REL-0144，证据 2 条）
- 协同支持 [[service/collaboration-task|协同任务]]（REL-0160，证据 2 条）
- [带引用回答](../service/cited-answer.md) 协同支持本知识（REL-0161，证据 2 条）
- 由其实现 [[system/qa-service|问答服务]]（REL-0374，证据 2 条）
- 受其约束 [[quality/monitoring-alert|监控告警]]（REL-0409，证据 2 条）

## 来源

- SRC-CS-007：SV-SRC-CS-007-1
- SRC-CS-001：SV-SRC-CS-001-1
- SRC-CS-004：SV-SRC-CS-004-1
- SRC-ARC-006：SV-SRC-ARC-006-1

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
