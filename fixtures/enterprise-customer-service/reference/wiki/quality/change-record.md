---
knowledge_id: "K-QUALITY-CHANGE-RECORD"
title: "变更记录"
type: "data_object"
domain: "quality"
sources: ["SRC-OPS-002", "SRC-QA-001", "SRC-OPS-001", "SRC-ORD-004"]
source_versions: ["SV-SRC-OPS-002-1", "SV-SRC-QA-001-1", "SV-SRC-OPS-001-1", "SV-SRC-ORD-004-1"]
updated: "2026-08-03"
status: "accepted"
---

# 变更记录

## 摘要

记录变更原因、范围、负责人、验证结果、发布时间和回滚条件。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-QUALITY-CHANGE-RECORD 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- 属于 [[quality/quality-security-operations|质量、安全与运营管理]]（REL-0248，证据 2 条）
- 协同支持 [[quality/recovery-runbook|恢复手册]]（REL-0264，证据 2 条）
- [支付](../order/payment.md) 受其约束本知识（REL-0398，证据 2 条）
- [订单服务](../system/order-service.md) 受其约束本知识（REL-0428，证据 2 条）
- [版本 1.1](../project/release-1-1.md) 依赖本知识（REL-0449，证据 2 条）

## 来源

- SRC-OPS-002：SV-SRC-OPS-002-1
- SRC-QA-001：SV-SRC-QA-001-1
- SRC-OPS-001：SV-SRC-OPS-001-1
- SRC-ORD-004：SV-SRC-ORD-004-1

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
