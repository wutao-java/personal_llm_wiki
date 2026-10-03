---
knowledge_id: "K-CATALOG-STOCKOUT"
title: "缺货"
type: "concept"
domain: "catalog"
sources: ["SRC-CAT-005", "SRC-CAT-001", "SRC-CAT-003", "SRC-ARC-007"]
source_versions: ["SV-SRC-CAT-005-1", "SV-SRC-CAT-001-1", "SV-SRC-CAT-003-1", "SV-SRC-ARC-007-1"]
updated: "2026-08-03"
status: "accepted"
---

# 缺货

## 摘要

客户所需数量超过可用库存或履约门店无法确认实物时形成缺货状态。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-CATALOG-STOCKOUT 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- 属于 [[catalog/catalog-inventory-management|商品与库存管理]]（REL-0045，证据 2 条）
- 协同支持 [[catalog/inventory-sync|库存同步]]（REL-0061，证据 2 条）
- [替代商品](../catalog/substitute-product.md) 协同支持本知识（REL-0062，证据 2 条）
- 由其实现 [[system/event-bus|事件总线]]（REL-0347，证据 2 条）
- 受其约束 [[quality/masking-policy|脱敏规则]]（REL-0394，证据 2 条）
- [门店缺货转单](../catalog/store-order-transfer.md) 依赖本知识（REL-0438，证据 2 条）

## 来源

- SRC-CAT-005：SV-SRC-CAT-005-1
- SRC-CAT-001：SV-SRC-CAT-001-1
- SRC-CAT-003：SV-SRC-CAT-003-1
- SRC-ARC-007：SV-SRC-ARC-007-1

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
