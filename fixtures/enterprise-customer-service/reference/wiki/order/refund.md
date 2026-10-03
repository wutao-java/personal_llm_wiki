---
knowledge_id: "K-ORDER-REFUND"
title: "退款"
type: "process"
domain: "order"
sources: ["SRC-ORD-006", "SRC-ORD-001", "SRC-ORD-005"]
source_versions: ["SV-SRC-ORD-006-1", "SV-SRC-ORD-001-1", "SV-SRC-ORD-005-1"]
updated: "2026-08-03"
status: "accepted"
---

# 退款

## 摘要

把符合条件的已支付金额原路退回，并记录申请、处理和到账状态。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-ORDER-REFUND 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- 属于 [[order/order-payment-management|订单与支付管理]]（REL-0079，证据 2 条）
- 协同支持 [[order/idempotency-key|幂等键]]（REL-0095，证据 2 条）
- [退款状态](../order/refund-status.md) 协同支持本知识（REL-0096，证据 2 条）

## 来源

- SRC-ORD-006：SV-SRC-ORD-006-1
- SRC-ORD-001：SV-SRC-ORD-001-1
- SRC-ORD-005：SV-SRC-ORD-005-1

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
