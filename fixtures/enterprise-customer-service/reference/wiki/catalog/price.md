---
knowledge_id: "K-CATALOG-PRICE"
title: "商品价格"
type: "data_object"
domain: "catalog"
sources: ["SRC-CAT-006", "SRC-CAT-001", "SRC-CAT-005", "SRC-ARC-006"]
source_versions: ["SV-SRC-CAT-006-1", "SV-SRC-CAT-001-1", "SV-SRC-CAT-005-1", "SV-SRC-ARC-006-1"]
updated: "2026-08-03"
status: "accepted"
---

# 商品价格

## 摘要

用于展示和订单计算的基础金额，并在订单创建时形成不可静默改写的价格快照。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-CATALOG-PRICE 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- 属于 [[catalog/catalog-inventory-management|商品与库存管理]]（REL-0047，证据 2 条）
- 协同支持 [[catalog/substitute-product|替代商品]]（REL-0063，证据 2 条）
- [促销规则](../catalog/promotion.md) 协同支持本知识（REL-0064，证据 2 条）
- 由其实现 [[system/knowledge-service|知识服务]]（REL-0348，证据 2 条）

## 来源

- SRC-CAT-006：SV-SRC-CAT-006-1
- SRC-CAT-001：SV-SRC-CAT-001-1
- SRC-CAT-005：SV-SRC-CAT-005-1
- SRC-ARC-006：SV-SRC-ARC-006-1

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
