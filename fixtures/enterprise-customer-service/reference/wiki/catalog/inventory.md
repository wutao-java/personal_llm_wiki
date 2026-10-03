---
knowledge_id: "K-CATALOG-INVENTORY"
title: "库存"
type: "data_object"
domain: "catalog"
sources: ["SRC-CAT-003", "SRC-CAT-001", "SRC-CAT-002", "SRC-CAT-004"]
source_versions: ["SV-SRC-CAT-003-1", "SV-SRC-CAT-001-1", "SV-SRC-CAT-002-1", "SV-SRC-CAT-004-2"]
updated: "2026-08-03"
status: "accepted"
---

# 库存

## 摘要

记录门店或中心仓特定 SKU 的实物数量、锁定数量和可用数量。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-CATALOG-INVENTORY 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- 属于 [[catalog/catalog-inventory-management|商品与库存管理]]（REL-0039，证据 2 条）
- 协同支持 [[catalog/store|门店]]（REL-0055，证据 2 条）
- [可用库存](../catalog/available-inventory.md) 协同支持本知识（REL-0056，证据 2 条）
- 协同支持 [[catalog/sellable-rule|可售规则]]（REL-0277，证据 2 条）
- [锁定库存](../catalog/reserved-inventory.md) 协同支持本知识（REL-0279，证据 2 条）
- 由其实现 [[system/inventory-service|库存服务]]（REL-0344，证据 2 条）

## 来源

- SRC-CAT-003：SV-SRC-CAT-003-1
- SRC-CAT-001：SV-SRC-CAT-001-1
- SRC-CAT-002：SV-SRC-CAT-002-1
- SRC-CAT-004：SV-SRC-CAT-004-1、SV-SRC-CAT-004-2

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
