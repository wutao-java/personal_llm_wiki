---
knowledge_id: "K-SERVICE-FEEDBACK"
title: "客户反馈"
type: "data_object"
domain: "service"
sources: ["SRC-CS-008", "SRC-CS-001", "SRC-CS-002", "SRC-ARC-005"]
source_versions: ["SV-SRC-CS-008-1", "SV-SRC-CS-001-1", "SV-SRC-CS-002-1", "SV-SRC-ARC-005-1"]
updated: "2026-08-03"
status: "accepted"
---

# 客户反馈

## 摘要

记录客户对回答、处理过程和结果的评价、原因与补充说明。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-SERVICE-FEEDBACK 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- 属于 [[service/customer-service-management|客户服务管理]]（REL-0148，证据 2 条）
- 协同支持 [[service/customer-confirmation|客户确认]]（REL-0164，证据 2 条）
- [服务关闭](../service/service-closure.md) 协同支持本知识（REL-0165，证据 2 条）
- 由其实现 [[system/ticket-service|工单服务]]（REL-0376，证据 2 条）
- 受其约束 [[quality/recovery-runbook|恢复手册]]（REL-0410，证据 2 条）

## 来源

- SRC-CS-008：SV-SRC-CS-008-1
- SRC-CS-001：SV-SRC-CS-001-1
- SRC-CS-002：SV-SRC-CS-002-1
- SRC-ARC-005：SV-SRC-ARC-005-1

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
