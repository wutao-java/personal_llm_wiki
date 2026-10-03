---
knowledge_id: "K-ORDER-DISCOUNT-ALLOCATION"
title: "优惠分摊"
type: "rule"
domain: "order"
sources: ["SRC-ORD-007", "SRC-ORD-001", "SRC-ORD-006", "SRC-ORD-008"]
source_versions: ["SV-SRC-ORD-007-1", "SV-SRC-ORD-001-1", "SV-SRC-ORD-006-1", "SV-SRC-ORD-008-1"]
updated: "2026-08-03"
status: "accepted"
---

# 优惠分摊

## 摘要

将整单优惠按可解释口径分配到订单项，用于部分退款和财务核对。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-ORDER-DISCOUNT-ALLOCATION 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- 属于 [[order/order-payment-management|订单与支付管理]]（REL-0081，证据 2 条）
- 协同支持 [[order/refund-status|退款状态]]（REL-0097，证据 2 条）
- [发票](../order/invoice.md) 协同支持本知识（REL-0098，证据 2 条）

## 来源

- SRC-ORD-007：SV-SRC-ORD-007-1
- SRC-ORD-001：SV-SRC-ORD-001-1
- SRC-ORD-006：SV-SRC-ORD-006-1
- SRC-ORD-008：SV-SRC-ORD-008-1

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
