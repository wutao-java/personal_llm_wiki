---
knowledge_id: "K-ORDER-ORDER-CREATE"
title: "订单创建"
type: "process"
domain: "order"
sources: ["SRC-ORD-002", "SRC-ORD-001", "SRC-ORD-003", "SRC-ARC-002"]
source_versions: ["SV-SRC-ORD-002-1", "SV-SRC-ORD-001-1", "SV-SRC-ORD-003-2", "SV-SRC-ARC-002-1"]
updated: "2026-08-03"
status: "accepted"
---

# 订单创建

## 摘要

汇总客户选择并在业务校验通过后生成订单和订单项。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-ORDER-ORDER-CREATE 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- 属于 [[order/order-payment-management|订单与支付管理]]（REL-0070，证据 2 条）
- 协同支持 [[order/order-status|订单状态]]（REL-0086，证据 2 条）
- [订单校验](../order/order-validation.md) 协同支持本知识（REL-0087，证据 2 条）
- 协同支持 [[order/order-item|订单项]]（REL-0284，证据 2 条）
- [订单取消](../order/order-cancel.md) 协同支持本知识（REL-0286，证据 2 条）
- 由其实现 [[system/order-service|订单服务]]（REL-0352，证据 2 条）
- 受其约束 [[quality/recovery-runbook|恢复手册]]（REL-0397，证据 2 条）

## 来源

- SRC-ORD-002：SV-SRC-ORD-002-1
- SRC-ORD-001：SV-SRC-ORD-001-1
- SRC-ORD-003：SV-SRC-ORD-003-1、SV-SRC-ORD-003-2
- SRC-ARC-002：SV-SRC-ARC-002-1

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
