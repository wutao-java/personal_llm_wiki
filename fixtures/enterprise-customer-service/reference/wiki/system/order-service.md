---
knowledge_id: "K-SYSTEM-ORDER-SERVICE"
title: "订单服务"
type: "component"
domain: "system"
sources: ["SRC-ARC-002", "SRC-ARC-001", "SRC-ARC-006", "SRC-ARC-003"]
source_versions: ["SV-SRC-ARC-002-1", "SV-SRC-ARC-001-1", "SV-SRC-ARC-006-1", "SV-SRC-ARC-003-1"]
updated: "2026-08-03"
status: "accepted"
---

# 订单服务

## 摘要

提供订单创建、查询、取消和状态管理接口。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-SYSTEM-ORDER-SERVICE 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- 属于 [[system/system-interface-architecture|系统与接口架构]]（REL-0205，证据 2 条）
- 协同支持 [[system/qa-service|问答服务]]（REL-0221，证据 2 条）
- [库存服务](../system/inventory-service.md) 协同支持本知识（REL-0222，证据 2 条）
- 协同支持 [[system/graph-service|图谱服务]]（REL-0320，证据 2 条）
- [支付服务](../system/payment-service.md) 协同支持本知识（REL-0322，证据 2 条）
- [商品信息纠错](../catalog/product-correction.md) 由其实现本知识（REL-0349，证据 2 条）
- [订单与支付管理](../order/order-payment-management.md) 由其实现本知识（REL-0350，证据 2 条）
- [订单项](../order/order-item.md) 由其实现本知识（REL-0351，证据 2 条）
- [订单创建](../order/order-create.md) 由其实现本知识（REL-0352，证据 2 条）
- [订单取消](../order/order-cancel.md) 由其实现本知识（REL-0353，证据 2 条）
- [发票](../order/invoice.md) 由其实现本知识（REL-0358，证据 2 条）
- 受其约束 [[quality/change-record|变更记录]]（REL-0428，证据 2 条）

## 来源

- SRC-ARC-002：SV-SRC-ARC-002-1
- SRC-ARC-001：SV-SRC-ARC-001-1
- SRC-ARC-006：SV-SRC-ARC-006-1
- SRC-ARC-003：SV-SRC-ARC-003-1

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
