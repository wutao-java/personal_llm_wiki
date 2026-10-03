---
knowledge_id: "K-CATALOG-PRODUCT"
title: "商品"
type: "data_object"
domain: "catalog"
sources: ["SRC-CAT-001", "SRC-CAT-002"]
source_versions: ["SV-SRC-CAT-001-1", "SV-SRC-CAT-002-1"]
updated: "2026-08-03"
status: "accepted"
---

# 商品

## 摘要

面向客户展示和销售的业务对象，包含标题、类目、品牌、状态和展示信息。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-CATALOG-PRODUCT 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- 属于 [[catalog/catalog-inventory-management|商品与库存管理]]（REL-0034，证据 2 条）
- [SKU](../catalog/sku.md) 协同支持本知识（REL-0051，证据 2 条）
- [商品状态](../catalog/product-status.md) 协同支持本知识（REL-0274，证据 2 条）

## 来源

- SRC-CAT-001：SV-SRC-CAT-001-1
- SRC-CAT-002：SV-SRC-CAT-002-1

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
