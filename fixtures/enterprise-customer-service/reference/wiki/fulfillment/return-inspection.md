---
knowledge_id: "K-FULFILLMENT-RETURN-INSPECTION"
title: "退货质检"
type: "process"
domain: "fulfillment"
sources: ["SRC-AFS-003", "SRC-FUL-001", "SRC-AFS-004", "SRC-ARC-003"]
source_versions: ["SV-SRC-AFS-003-1", "SV-SRC-FUL-001-1", "SV-SRC-AFS-004-1", "SV-SRC-ARC-003-1"]
updated: "2026-08-03"
status: "accepted"
---

# 退货质检

## 摘要

核对退回商品身份、完整性、使用情况和可再销售状态。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-FULFILLMENT-RETURN-INSPECTION 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- 属于 [[fulfillment/fulfillment-aftersales-management|履约与售后管理]]（REL-0115，证据 2 条）
- 协同支持 [[fulfillment/reverse-logistics|逆向物流]]（REL-0131，证据 2 条）
- [售后补偿](../fulfillment/compensation.md) 协同支持本知识（REL-0132，证据 2 条）
- 由其实现 [[system/inventory-service|库存服务]]（REL-0367，证据 2 条）
- 受其约束 [[quality/source-integrity|来源完整性]]（REL-0405，证据 2 条）

## 来源

- SRC-AFS-003：SV-SRC-AFS-003-1
- SRC-FUL-001：SV-SRC-FUL-001-1
- SRC-AFS-004：SV-SRC-AFS-004-1
- SRC-ARC-003：SV-SRC-ARC-003-1

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
