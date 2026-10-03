---
knowledge_id: "K-SERVICE-TICKET-PRIORITY"
title: "工单优先级"
type: "rule"
domain: "service"
sources: ["SRC-CS-005", "SRC-CS-001", "SRC-CS-003", "SRC-ARC-005"]
source_versions: ["SV-SRC-CS-005-2", "SV-SRC-CS-001-1", "SV-SRC-CS-003-1", "SV-SRC-ARC-005-1"]
updated: "2026-08-03"
status: "accepted"
---

# 工单优先级

## 摘要

根据客户影响、资金风险、履约中断和问题范围确定处理优先级。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-SERVICE-TICKET-PRIORITY 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- 属于 [[service/customer-service-management|客户服务管理]]（REL-0138，证据 2 条）
- 协同支持 [[service/ticket-status|工单状态]]（REL-0154，证据 2 条）
- [首次响应时限](../service/first-response-time.md) 协同支持本知识（REL-0155，证据 4 条）
- 协同支持 [[service/ticket|工单]]（REL-0303，证据 2 条）
- [解决时长](../service/resolution-time.md) 协同支持本知识（REL-0305，证据 2 条）
- 由其实现 [[system/ticket-service|工单服务]]（REL-0371，证据 2 条）

## 来源

- SRC-CS-005：SV-SRC-CS-005-1、SV-SRC-CS-005-2
- SRC-CS-001：SV-SRC-CS-001-1
- SRC-CS-003：SV-SRC-CS-003-1
- SRC-ARC-005：SV-SRC-ARC-005-1

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
