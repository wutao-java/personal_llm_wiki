---
knowledge_id: "K-CATALOG-INVENTORY-LOCK"
title: "库存锁定"
type: "process"
domain: "catalog"
sources: ["SRC-CAT-004", "SRC-CAT-001", "SRC-CAT-003"]
source_versions: ["SV-SRC-CAT-004-2", "SV-SRC-CAT-001-1", "SV-SRC-CAT-003-1"]
updated: "2026-08-03"
status: "accepted"
---

# 库存锁定

## 摘要

订单校验通过后锁定所需 SKU；更新版本普通订单锁定十分钟，支付处理中订单执行补偿检查。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-CATALOG-INVENTORY-LOCK 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- 属于 [[catalog/catalog-inventory-management|商品与库存管理]]（REL-0042，证据 4 条）
- 协同支持 [[catalog/reserved-inventory|锁定库存]]（REL-0058，证据 4 条）
- [库存释放](../catalog/inventory-release.md) 协同支持本知识（REL-0059，证据 4 条）
- 协同支持 [[catalog/available-inventory|可用库存]]（REL-0280，证据 4 条）
- [库存同步](../catalog/inventory-sync.md) 协同支持本知识（REL-0282，证据 4 条）

## 来源

- SRC-CAT-004：SV-SRC-CAT-004-1、SV-SRC-CAT-004-2
- SRC-CAT-001：SV-SRC-CAT-001-1
- SRC-CAT-003：SV-SRC-CAT-003-1

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
