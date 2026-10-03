---
knowledge_id: "K-ORDER-ORDER-EXCEPTION"
title: "订单异常"
type: "incident"
domain: "order"
sources: ["SRC-ORD-009", "SRC-ORD-001", "SRC-ORD-008"]
source_versions: ["SV-SRC-ORD-009-1", "SV-SRC-ORD-001-1", "SV-SRC-ORD-008-1"]
updated: "2026-08-03"
status: "accepted"
---

# 订单异常

## 摘要

覆盖支付成功无订单、状态不一致、退款长时间未到账和重复扣款等问题。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-ORDER-ORDER-EXCEPTION 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- 属于 [[order/order-payment-management|订单与支付管理]]（REL-0083，证据 2 条）
- 协同支持 [[order/invoice|发票]]（REL-0099，证据 2 条）

## 来源

- SRC-ORD-009：SV-SRC-ORD-009-1
- SRC-ORD-001：SV-SRC-ORD-001-1
- SRC-ORD-008：SV-SRC-ORD-008-1

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
