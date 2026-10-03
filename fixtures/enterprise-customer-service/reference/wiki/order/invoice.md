---
knowledge_id: "K-ORDER-INVOICE"
title: "发票"
type: "data_object"
domain: "order"
sources: ["SRC-ORD-008", "SRC-ORD-001", "SRC-ORD-007", "SRC-ORD-009"]
source_versions: ["SV-SRC-ORD-008-1", "SV-SRC-ORD-001-1", "SV-SRC-ORD-007-1", "SV-SRC-ORD-009-1"]
updated: "2026-08-03"
status: "accepted"
---

# 发票

## 摘要

记录开票抬头、税号、金额、状态以及红冲和重新开具关系。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-ORDER-INVOICE 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- 属于 [[order/order-payment-management|订单与支付管理]]（REL-0082，证据 2 条）
- 协同支持 [[order/discount-allocation|优惠分摊]]（REL-0098，证据 2 条）
- [订单异常](../order/order-exception.md) 协同支持本知识（REL-0099，证据 2 条）
- 由其实现 [[system/order-service|订单服务]]（REL-0358，证据 2 条）
- 由其衡量 [[quality/citation-accuracy|引用准确率]]（REL-0400，证据 2 条）

## 来源

- SRC-ORD-008：SV-SRC-ORD-008-1
- SRC-ORD-001：SV-SRC-ORD-001-1
- SRC-ORD-007：SV-SRC-ORD-007-1
- SRC-ORD-009：SV-SRC-ORD-009-1

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
