---
knowledge_id: "K-SYSTEM-INVENTORY-SERVICE"
title: "库存服务"
type: "component"
domain: "system"
sources: ["SRC-ARC-003", "SRC-ARC-001", "SRC-ARC-002", "SRC-ARC-004"]
source_versions: ["SV-SRC-ARC-003-1", "SV-SRC-ARC-001-1", "SV-SRC-ARC-002-1", "SV-SRC-ARC-004-1"]
updated: "2026-08-03"
status: "accepted"
---

# 库存服务

## 摘要

提供库存查询、锁定、释放、同步和异常核对接口。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-SYSTEM-INVENTORY-SERVICE 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- 属于 [[system/system-interface-architecture|系统与接口架构]]（REL-0206，证据 2 条）
- 协同支持 [[system/order-service|订单服务]]（REL-0222，证据 2 条）
- [支付服务](../system/payment-service.md) 协同支持本知识（REL-0223，证据 2 条）
- 协同支持 [[system/qa-service|问答服务]]（REL-0321，证据 2 条）
- [工单服务](../system/ticket-service.md) 协同支持本知识（REL-0323，证据 2 条）
- [商品与库存管理](../catalog/catalog-inventory-management.md) 由其实现本知识（REL-0341，证据 2 条）
- [SKU](../catalog/sku.md) 由其实现本知识（REL-0342，证据 2 条）
- [可售规则](../catalog/sellable-rule.md) 由其实现本知识（REL-0343，证据 2 条）
- [库存](../catalog/inventory.md) 由其实现本知识（REL-0344，证据 2 条）
- [锁定库存](../catalog/reserved-inventory.md) 由其实现本知识（REL-0345，证据 2 条）
- [库存释放](../catalog/inventory-release.md) 由其实现本知识（REL-0346，证据 2 条）
- [退货质检](../fulfillment/return-inspection.md) 由其实现本知识（REL-0367，证据 2 条）
- 受其约束 [[quality/data-classification|数据分类]]（REL-0418，证据 2 条）
- 由其衡量 [[quality/answer-groundedness|回答有据性]]（REL-0429，证据 2 条）
- [门店缺货转单](../catalog/store-order-transfer.md) 由其实现本知识（REL-0437，证据 2 条）

## 来源

- SRC-ARC-003：SV-SRC-ARC-003-1
- SRC-ARC-001：SV-SRC-ARC-001-1
- SRC-ARC-002：SV-SRC-ARC-002-1
- SRC-ARC-004：SV-SRC-ARC-004-1

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
