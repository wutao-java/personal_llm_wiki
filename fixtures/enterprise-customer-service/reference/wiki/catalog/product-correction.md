---
knowledge_id: "K-CATALOG-PRODUCT-CORRECTION"
title: "商品信息纠错"
type: "process"
domain: "catalog"
sources: ["SRC-CAT-007", "SRC-CAT-001", "SRC-CAT-006", "SRC-CAT-008"]
source_versions: ["SV-SRC-CAT-007-1", "SV-SRC-CAT-001-1", "SV-SRC-CAT-006-1", "SV-SRC-CAT-008-1"]
updated: "2026-08-03"
status: "accepted"
---

# 商品信息纠错

## 摘要

对客户反馈的标题、规格、图片或属性错误执行核验、修正、复核和知识更新。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-CATALOG-PRODUCT-CORRECTION 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- 属于 [[catalog/catalog-inventory-management|商品与库存管理]]（REL-0049，证据 2 条）
- 协同支持 [[catalog/promotion|促销规则]]（REL-0065，证据 2 条）
- [库存异常](../catalog/inventory-exception.md) 协同支持本知识（REL-0066，证据 2 条）
- 由其实现 [[system/order-service|订单服务]]（REL-0349，证据 2 条）
- 受其约束 [[quality/document-sanitization|文档安全处理]]（REL-0395，证据 2 条）

## 来源

- SRC-CAT-007：SV-SRC-CAT-007-1
- SRC-CAT-001：SV-SRC-CAT-001-1
- SRC-CAT-006：SV-SRC-CAT-006-1
- SRC-CAT-008：SV-SRC-CAT-008-1

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
