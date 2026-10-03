---
knowledge_id: "K-CATALOG-INVENTORY-EXCEPTION"
title: "库存异常"
type: "incident"
domain: "catalog"
sources: ["SRC-CAT-008", "SRC-CAT-001", "SRC-CAT-007"]
source_versions: ["SV-SRC-CAT-008-1", "SV-SRC-CAT-001-1", "SV-SRC-CAT-007-1"]
updated: "2026-08-03"
status: "accepted"
---

# 库存异常

## 摘要

包括负库存、长时间未同步、锁定未释放和门店账实不符等需要恢复的问题。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-CATALOG-INVENTORY-EXCEPTION 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- 属于 [[catalog/catalog-inventory-management|商品与库存管理]]（REL-0050，证据 2 条）
- 协同支持 [[catalog/product-correction|商品信息纠错]]（REL-0066，证据 2 条）

## 来源

- SRC-CAT-008：SV-SRC-CAT-008-1
- SRC-CAT-001：SV-SRC-CAT-001-1
- SRC-CAT-007：SV-SRC-CAT-007-1

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
