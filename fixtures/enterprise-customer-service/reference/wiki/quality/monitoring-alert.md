---
knowledge_id: "K-QUALITY-MONITORING-ALERT"
title: "监控告警"
type: "process"
domain: "quality"
sources: ["SRC-OPS-001", "SRC-QA-001", "SRC-OPS-002", "SRC-ORD-001"]
source_versions: ["SV-SRC-OPS-001-1", "SV-SRC-QA-001-1", "SV-SRC-OPS-002-1", "SV-SRC-ORD-001-1"]
updated: "2026-08-03"
status: "accepted"
---

# 监控告警

## 摘要

对模型不可用、编译失败、接口错误、检索延迟和事件积压产生可恢复告警。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-QUALITY-MONITORING-ALERT 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- 属于 [[quality/quality-security-operations|质量、安全与运营管理]]（REL-0246，证据 2 条）
- 协同支持 [[quality/audit-log|操作记录]]（REL-0262，证据 2 条）
- [恢复手册](../quality/recovery-runbook.md) 协同支持本知识（REL-0263，证据 2 条）
- [订单与支付管理](../order/order-payment-management.md) 受其约束本知识（REL-0396，证据 2 条）
- [回答草稿](../service/answer-draft.md) 受其约束本知识（REL-0409，证据 2 条）
- [图谱服务](../system/graph-service.md) 受其约束本知识（REL-0426，证据 2 条）
- [支付回调积压事故](../quality/payment-callback-backlog.md) 触发本知识（REL-0440，证据 2 条）

## 来源

- SRC-OPS-001：SV-SRC-OPS-001-1
- SRC-QA-001：SV-SRC-QA-001-1
- SRC-OPS-002：SV-SRC-OPS-002-1
- SRC-ORD-001：SV-SRC-ORD-001-1

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
