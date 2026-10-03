---
knowledge_id: "K-CATALOG-STORE-ORDER-TRANSFER"
title: "门店缺货转单"
type: "process"
domain: "catalog"
sources: ["SRC-CAT-009", "SRC-CAT-001", "SRC-ARC-003", "SRC-CAT-005"]
source_versions: ["SV-SRC-CAT-009-1", "SV-SRC-CAT-001-1", "SV-SRC-ARC-003-1", "SV-SRC-CAT-005-1"]
updated: "2026-08-03"
status: "accepted"
---

# 门店缺货转单

## 摘要

原履约门店确认缺货后，筛选可履约门店、征得客户确认并重新锁定库存。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-CATALOG-STORE-ORDER-TRANSFER 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- 属于 [[catalog/catalog-inventory-management|商品与库存管理]]（REL-0436，证据 2 条）
- 由其实现 [[system/inventory-service|库存服务]]（REL-0437，证据 2 条）
- 依赖 [[catalog/stockout|缺货]]（REL-0438，证据 2 条）

## 来源

- SRC-CAT-009：SV-SRC-CAT-009-1
- SRC-CAT-001：SV-SRC-CAT-001-1
- SRC-ARC-003：SV-SRC-ARC-003-1
- SRC-CAT-005：SV-SRC-CAT-005-1

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
