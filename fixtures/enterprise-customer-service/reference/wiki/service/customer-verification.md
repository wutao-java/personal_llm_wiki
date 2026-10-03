---
knowledge_id: "K-SERVICE-CUSTOMER-VERIFICATION"
title: "客户身份核验"
type: "process"
domain: "service"
sources: ["SRC-CS-006", "SRC-CS-001", "SRC-CS-005", "SRC-CS-004"]
source_versions: ["SV-SRC-CS-006-1", "SV-SRC-CS-001-1", "SV-SRC-CS-005-2", "SV-SRC-CS-004-1"]
updated: "2026-08-03"
status: "accepted"
---

# 客户身份核验

## 摘要

在查询敏感订单信息、修改联系方式或处理退款前确认客户权限。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-SERVICE-CUSTOMER-VERIFICATION 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- 属于 [[service/customer-service-management|客户服务管理]]（REL-0141，证据 2 条）
- 协同支持 [[service/resolution-time|解决时长]]（REL-0157，证据 2 条）
- [人工升级](../service/manual-escalation.md) 协同支持本知识（REL-0158，证据 2 条）
- 协同支持 [[service/first-response-time|首次响应时限]]（REL-0306，证据 4 条）

## 来源

- SRC-CS-006：SV-SRC-CS-006-1
- SRC-CS-001：SV-SRC-CS-001-1
- SRC-CS-005：SV-SRC-CS-005-1、SV-SRC-CS-005-2
- SRC-CS-004：SV-SRC-CS-004-1

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
