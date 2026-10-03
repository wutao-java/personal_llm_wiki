---
knowledge_id: "K-SERVICE-FIRST-RESPONSE-TIME"
title: "首次响应时限"
type: "metric"
domain: "service"
sources: ["SRC-CS-005", "SRC-CS-001", "SRC-CS-003", "SRC-CS-006"]
source_versions: ["SV-SRC-CS-005-2", "SV-SRC-CS-001-1", "SV-SRC-CS-003-1", "SV-SRC-CS-006-1"]
updated: "2026-08-03"
status: "accepted"
---

# 首次响应时限

## 摘要

更新版本最高优先级工单应在五分钟内首次响应，超时自动升级。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-SERVICE-FIRST-RESPONSE-TIME 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- 属于 [[service/customer-service-management|客户服务管理]]（REL-0139，证据 4 条）
- 协同支持 [[service/ticket-priority|工单优先级]]（REL-0155，证据 4 条）
- [解决时长](../service/resolution-time.md) 协同支持本知识（REL-0156，证据 4 条）
- 协同支持 [[service/ticket-status|工单状态]]（REL-0304，证据 4 条）
- [客户身份核验](../service/customer-verification.md) 协同支持本知识（REL-0306，证据 4 条）

## 来源

- SRC-CS-005：SV-SRC-CS-005-1、SV-SRC-CS-005-2
- SRC-CS-001：SV-SRC-CS-001-1
- SRC-CS-003：SV-SRC-CS-003-1
- SRC-CS-006：SV-SRC-CS-006-1

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
