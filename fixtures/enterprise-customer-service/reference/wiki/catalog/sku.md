---
knowledge_id: "K-CATALOG-SKU"
title: "SKU"
type: "data_object"
domain: "catalog"
sources: ["SRC-CAT-001", "SRC-CAT-002", "SRC-ARC-003"]
source_versions: ["SV-SRC-CAT-001-1", "SV-SRC-CAT-002-1", "SV-SRC-ARC-003-1"]
updated: "2026-08-03"
status: "accepted"
---

# SKU

## 摘要

商品的最小可库存和可销售单元，由规格组合唯一确定。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-CATALOG-SKU 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- 属于 [[catalog/catalog-inventory-management|商品与库存管理]]（REL-0035，证据 2 条）
- 协同支持 [[catalog/product|商品]]（REL-0051，证据 2 条）
- [商品状态](../catalog/product-status.md) 协同支持本知识（REL-0052，证据 2 条）
- [可售规则](../catalog/sellable-rule.md) 协同支持本知识（REL-0275，证据 2 条）
- 由其实现 [[system/inventory-service|库存服务]]（REL-0342，证据 2 条）

## 来源

- SRC-CAT-001：SV-SRC-CAT-001-1
- SRC-CAT-002：SV-SRC-CAT-002-1
- SRC-ARC-003：SV-SRC-ARC-003-1

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
