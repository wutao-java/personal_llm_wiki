---
knowledge_id: "K-ORDER-ORDER-STATUS"
title: "订单状态"
type: "concept"
domain: "order"
sources: ["SRC-ORD-001", "SRC-ORD-002"]
source_versions: ["SV-SRC-ORD-001-1", "SV-SRC-ORD-002-1"]
updated: "2026-08-03"
status: "accepted"
---

# 订单状态

## 摘要

包括待确认、待支付、处理中、已履约和已关闭，并限制允许的状态转换。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-ORDER-ORDER-STATUS 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- 属于 [[order/order-payment-management|订单与支付管理]]（REL-0069，证据 2 条）
- 协同支持 [[order/order-item|订单项]]（REL-0085，证据 2 条）
- [订单创建](../order/order-create.md) 协同支持本知识（REL-0086，证据 2 条）
- 协同支持 [[order/order|订单]]（REL-0283，证据 2 条）
- [订单校验](../order/order-validation.md) 协同支持本知识（REL-0285，证据 2 条）

## 来源

- SRC-ORD-001：SV-SRC-ORD-001-1
- SRC-ORD-002：SV-SRC-ORD-002-1

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
