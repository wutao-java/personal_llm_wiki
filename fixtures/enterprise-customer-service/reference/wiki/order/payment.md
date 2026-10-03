---
knowledge_id: "K-ORDER-PAYMENT"
title: "支付"
type: "process"
domain: "order"
sources: ["SRC-ORD-004", "SRC-ORD-001", "SRC-ORD-003", "SRC-ARC-004"]
source_versions: ["SV-SRC-ORD-004-1", "SV-SRC-ORD-001-1", "SV-SRC-ORD-003-2", "SV-SRC-ARC-004-1"]
updated: "2026-08-03"
status: "accepted"
---

# 支付

## 摘要

客户通过受支持渠道完成订单金额支付，并由支付状态驱动订单后续处理。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-ORDER-PAYMENT 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- 属于 [[order/order-payment-management|订单与支付管理]]（REL-0074，证据 2 条）
- 协同支持 [[order/cancel-window|取消窗口]]（REL-0090，证据 4 条）
- [支付方式](../order/payment-method.md) 协同支持本知识（REL-0091，证据 2 条）
- 协同支持 [[order/order-cancel|订单取消]]（REL-0288，证据 2 条）
- [支付状态](../order/payment-status.md) 协同支持本知识（REL-0290，证据 2 条）
- 由其实现 [[system/payment-service|支付服务]]（REL-0354，证据 2 条）
- 受其约束 [[quality/change-record|变更记录]]（REL-0398，证据 2 条）

## 来源

- SRC-ORD-004：SV-SRC-ORD-004-1
- SRC-ORD-001：SV-SRC-ORD-001-1
- SRC-ORD-003：SV-SRC-ORD-003-1、SV-SRC-ORD-003-2
- SRC-ARC-004：SV-SRC-ARC-004-1

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
