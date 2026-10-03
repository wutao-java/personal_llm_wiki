---
knowledge_id: "K-SERVICE-TICKET"
title: "工单"
type: "data_object"
domain: "service"
sources: ["SRC-CS-003", "SRC-CS-001", "SRC-CS-002", "SRC-CS-005"]
source_versions: ["SV-SRC-CS-003-1", "SV-SRC-CS-001-1", "SV-SRC-CS-002-1", "SV-SRC-CS-005-2"]
updated: "2026-08-03"
status: "accepted"
---

# 工单

## 摘要

需要持续跟踪、人工处理或跨团队协作的服务记录。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-SERVICE-TICKET 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- 属于 [[service/customer-service-management|客户服务管理]]（REL-0136，证据 2 条）
- 协同支持 [[service/service-intent|服务意图]]（REL-0152，证据 2 条）
- [工单状态](../service/ticket-status.md) 协同支持本知识（REL-0153，证据 2 条）
- 协同支持 [[service/issue-category|问题分类]]（REL-0301，证据 2 条）
- [工单优先级](../service/ticket-priority.md) 协同支持本知识（REL-0303，证据 2 条）
- 由其实现 [[system/ticket-service|工单服务]]（REL-0370，证据 2 条）
- 受其约束 [[quality/document-sanitization|文档安全处理]]（REL-0407，证据 2 条）

## 来源

- SRC-CS-003：SV-SRC-CS-003-1
- SRC-CS-001：SV-SRC-CS-001-1
- SRC-CS-002：SV-SRC-CS-002-1
- SRC-CS-005：SV-SRC-CS-005-1、SV-SRC-CS-005-2

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
