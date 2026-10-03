---
knowledge_id: "K-ORDER-ORDER-PAYMENT-MANAGEMENT"
title: "订单与支付管理"
type: "domain"
domain: "order"
sources: ["SRC-ORD-001", "SRC-ORD-002", "SRC-ORD-003", "SRC-ORD-004"]
source_versions: ["SV-SRC-ORD-001-1", "SV-SRC-ORD-002-1", "SV-SRC-ORD-003-2", "SV-SRC-ORD-004-1"]
updated: "2026-08-03"
status: "accepted"
---

# 订单与支付管理

## 摘要

负责订单创建、状态转换、取消、支付、退款、优惠和发票规则。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-ORDER-ORDER-PAYMENT-MANAGEMENT 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- [订单](../order/order.md) 属于本知识（REL-0067，证据 2 条）
- [订单项](../order/order-item.md) 属于本知识（REL-0068，证据 2 条）
- [订单状态](../order/order-status.md) 属于本知识（REL-0069，证据 2 条）
- [订单创建](../order/order-create.md) 属于本知识（REL-0070，证据 2 条）
- [订单校验](../order/order-validation.md) 属于本知识（REL-0071，证据 2 条）
- [订单取消](../order/order-cancel.md) 属于本知识（REL-0072，证据 2 条）
- [取消窗口](../order/cancel-window.md) 属于本知识（REL-0073，证据 4 条）
- [支付](../order/payment.md) 属于本知识（REL-0074，证据 2 条）
- [支付方式](../order/payment-method.md) 属于本知识（REL-0075，证据 2 条）
- [支付状态](../order/payment-status.md) 属于本知识（REL-0076，证据 2 条）
- [支付回调](../order/payment-callback.md) 属于本知识（REL-0077，证据 2 条）
- [幂等键](../order/idempotency-key.md) 属于本知识（REL-0078，证据 2 条）
- [退款](../order/refund.md) 属于本知识（REL-0079，证据 2 条）
- [退款状态](../order/refund-status.md) 属于本知识（REL-0080，证据 2 条）
- [优惠分摊](../order/discount-allocation.md) 属于本知识（REL-0081，证据 2 条）
- [发票](../order/invoice.md) 属于本知识（REL-0082，证据 2 条）
- [订单异常](../order/order-exception.md) 属于本知识（REL-0083，证据 2 条）
- 由其实现 [[system/order-service|订单服务]]（REL-0350，证据 2 条）
- 受其约束 [[quality/monitoring-alert|监控告警]]（REL-0396，证据 2 条）

## 来源

- SRC-ORD-001：SV-SRC-ORD-001-1
- SRC-ORD-002：SV-SRC-ORD-002-1
- SRC-ORD-003：SV-SRC-ORD-003-1、SV-SRC-ORD-003-2
- SRC-ORD-004：SV-SRC-ORD-004-1

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
