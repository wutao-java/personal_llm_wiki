---
knowledge_id: "K-ORDER-CANCEL-WINDOW"
title: "取消窗口"
type: "rule"
domain: "order"
sources: ["SRC-ORD-003", "SRC-ORD-001", "SRC-ORD-004", "SRC-ORD-002"]
source_versions: ["SV-SRC-ORD-003-2", "SV-SRC-ORD-001-1", "SV-SRC-ORD-004-1", "SV-SRC-ORD-002-1"]
updated: "2026-08-03"
status: "accepted"
---

# 取消窗口

## 摘要

更新版本待支付订单可在创建后二十分钟内自助取消；支付处理中需要人工确认支付结果。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-ORDER-CANCEL-WINDOW 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- 属于 [[order/order-payment-management|订单与支付管理]]（REL-0073，证据 4 条）
- 协同支持 [[order/order-cancel|订单取消]]（REL-0089，证据 4 条）
- [支付](../order/payment.md) 协同支持本知识（REL-0090，证据 4 条）
- 协同支持 [[order/order-validation|订单校验]]（REL-0287，证据 4 条）
- [支付方式](../order/payment-method.md) 协同支持本知识（REL-0289，证据 4 条）

## 来源

- SRC-ORD-003：SV-SRC-ORD-003-1、SV-SRC-ORD-003-2
- SRC-ORD-001：SV-SRC-ORD-001-1
- SRC-ORD-004：SV-SRC-ORD-004-1
- SRC-ORD-002：SV-SRC-ORD-002-1

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
