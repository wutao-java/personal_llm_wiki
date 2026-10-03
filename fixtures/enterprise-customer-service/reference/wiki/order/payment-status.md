---
knowledge_id: "K-ORDER-PAYMENT-STATUS"
title: "支付状态"
type: "concept"
domain: "order"
sources: ["SRC-ORD-004", "SRC-ORD-001", "SRC-ORD-005", "SRC-ARC-004"]
source_versions: ["SV-SRC-ORD-004-1", "SV-SRC-ORD-001-1", "SV-SRC-ORD-005-1", "SV-SRC-ARC-004-1"]
updated: "2026-08-03"
status: "accepted"
---

# 支付状态

## 摘要

包括待支付、处理中、成功、失败和已退款，并与订单状态分开记录。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-ORDER-PAYMENT-STATUS 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- 属于 [[order/order-payment-management|订单与支付管理]]（REL-0076，证据 2 条）
- 协同支持 [[order/payment-method|支付方式]]（REL-0092，证据 2 条）
- [支付回调](../order/payment-callback.md) 协同支持本知识（REL-0093，证据 2 条）
- 协同支持 [[order/payment|支付]]（REL-0290，证据 2 条）
- 由其实现 [[system/payment-service|支付服务]]（REL-0355，证据 2 条）

## 来源

- SRC-ORD-004：SV-SRC-ORD-004-1
- SRC-ORD-001：SV-SRC-ORD-001-1
- SRC-ORD-005：SV-SRC-ORD-005-1
- SRC-ARC-004：SV-SRC-ARC-004-1

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
