---
knowledge_id: "K-CATALOG-CATALOG-INVENTORY-MANAGEMENT"
title: "商品与库存管理"
type: "domain"
domain: "catalog"
sources: ["SRC-CAT-001", "SRC-CAT-002", "SRC-CAT-003", "SRC-CAT-004"]
source_versions: ["SV-SRC-CAT-001-1", "SV-SRC-CAT-002-1", "SV-SRC-CAT-003-1", "SV-SRC-CAT-004-2"]
updated: "2026-08-03"
status: "accepted"
---

# 商品与库存管理

## 摘要

负责商品主数据、可售判断、库存同步、锁定释放和库存异常恢复。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-CATALOG-CATALOG-INVENTORY-MANAGEMENT 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- [商品](../catalog/product.md) 属于本知识（REL-0034，证据 2 条）
- [SKU](../catalog/sku.md) 属于本知识（REL-0035，证据 2 条）
- [商品状态](../catalog/product-status.md) 属于本知识（REL-0036，证据 2 条）
- [可售规则](../catalog/sellable-rule.md) 属于本知识（REL-0037，证据 2 条）
- [门店](../catalog/store.md) 属于本知识（REL-0038，证据 2 条）
- [库存](../catalog/inventory.md) 属于本知识（REL-0039，证据 2 条）
- [可用库存](../catalog/available-inventory.md) 属于本知识（REL-0040，证据 2 条）
- [锁定库存](../catalog/reserved-inventory.md) 属于本知识（REL-0041，证据 2 条）
- [库存锁定](../catalog/inventory-lock.md) 属于本知识（REL-0042，证据 4 条）
- [库存释放](../catalog/inventory-release.md) 属于本知识（REL-0043，证据 2 条）
- [库存同步](../catalog/inventory-sync.md) 属于本知识（REL-0044，证据 2 条）
- [缺货](../catalog/stockout.md) 属于本知识（REL-0045，证据 2 条）
- [替代商品](../catalog/substitute-product.md) 属于本知识（REL-0046，证据 2 条）
- [商品价格](../catalog/price.md) 属于本知识（REL-0047，证据 2 条）
- [促销规则](../catalog/promotion.md) 属于本知识（REL-0048，证据 2 条）
- [商品信息纠错](../catalog/product-correction.md) 属于本知识（REL-0049，证据 2 条）
- [库存异常](../catalog/inventory-exception.md) 属于本知识（REL-0050，证据 2 条）
- 由其实现 [[system/inventory-service|库存服务]]（REL-0341，证据 2 条）
- 由其衡量 [[quality/model-availability|模型可用性]]（REL-0391，证据 2 条）
- [门店缺货转单](../catalog/store-order-transfer.md) 属于本知识（REL-0436，证据 2 条）

## 来源

- SRC-CAT-001：SV-SRC-CAT-001-1
- SRC-CAT-002：SV-SRC-CAT-002-1
- SRC-CAT-003：SV-SRC-CAT-003-1
- SRC-CAT-004：SV-SRC-CAT-004-1、SV-SRC-CAT-004-2

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
