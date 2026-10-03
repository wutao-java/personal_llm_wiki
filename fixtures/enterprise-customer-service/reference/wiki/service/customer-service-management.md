---
knowledge_id: "K-SERVICE-CUSTOMER-SERVICE-MANAGEMENT"
title: "客户服务管理"
type: "domain"
domain: "service"
sources: ["SRC-CS-001", "SRC-CS-002", "SRC-CS-003", "SRC-CS-005"]
source_versions: ["SV-SRC-CS-001-1", "SV-SRC-CS-002-1", "SV-SRC-CS-003-1", "SV-SRC-CS-005-2"]
updated: "2026-08-03"
status: "accepted"
---

# 客户服务管理

## 摘要

负责问题分类、请求受理、工单流转、人工升级、引用回答和反馈闭环。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-SERVICE-CUSTOMER-SERVICE-MANAGEMENT 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- [服务请求](../service/service-request.md) 属于本知识（REL-0133，证据 2 条）
- [问题分类](../service/issue-category.md) 属于本知识（REL-0134，证据 2 条）
- [服务意图](../service/service-intent.md) 属于本知识（REL-0135，证据 2 条）
- [工单](../service/ticket.md) 属于本知识（REL-0136，证据 2 条）
- [工单状态](../service/ticket-status.md) 属于本知识（REL-0137，证据 2 条）
- [工单优先级](../service/ticket-priority.md) 属于本知识（REL-0138，证据 2 条）
- [首次响应时限](../service/first-response-time.md) 属于本知识（REL-0139，证据 4 条）
- [解决时长](../service/resolution-time.md) 属于本知识（REL-0140，证据 2 条）
- [客户身份核验](../service/customer-verification.md) 属于本知识（REL-0141，证据 2 条）
- [人工升级](../service/manual-escalation.md) 属于本知识（REL-0142，证据 2 条）
- [协同任务](../service/collaboration-task.md) 属于本知识（REL-0143，证据 2 条）
- [回答草稿](../service/answer-draft.md) 属于本知识（REL-0144，证据 2 条）
- [带引用回答](../service/cited-answer.md) 属于本知识（REL-0145，证据 2 条）
- [引用](../service/citation.md) 属于本知识（REL-0146，证据 2 条）
- [客户确认](../service/customer-confirmation.md) 属于本知识（REL-0147，证据 2 条）
- [客户反馈](../service/feedback.md) 属于本知识（REL-0148，证据 2 条）
- [服务关闭](../service/service-closure.md) 属于本知识（REL-0149，证据 2 条）
- 由其实现 [[system/ticket-service|工单服务]]（REL-0368，证据 2 条）
- 受其约束 [[quality/masking-policy|脱敏规则]]（REL-0406，证据 2 条）

## 来源

- SRC-CS-001：SV-SRC-CS-001-1
- SRC-CS-002：SV-SRC-CS-002-1
- SRC-CS-003：SV-SRC-CS-003-1
- SRC-CS-005：SV-SRC-CS-005-1、SV-SRC-CS-005-2

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
