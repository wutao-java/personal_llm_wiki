---
knowledge_id: "K-FULFILLMENT-EXCHANGE-REQUEST"
title: "换货申请"
type: "process"
domain: "fulfillment"
sources: ["SRC-AFS-002", "SRC-FUL-001", "SRC-AFS-001", "SRC-AFS-003"]
source_versions: ["SV-SRC-AFS-002-1", "SV-SRC-FUL-001-1", "SV-SRC-AFS-001-2", "SV-SRC-AFS-003-1"]
updated: "2026-08-03"
status: "accepted"
---

# 换货申请

## 摘要

客户在资格和库存满足时提出以同商品其他合格 SKU 替换原订单项。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-FULFILLMENT-EXCHANGE-REQUEST 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- 属于 [[fulfillment/fulfillment-aftersales-management|履约与售后管理]]（REL-0113，证据 2 条）
- 协同支持 [[fulfillment/return-window|退货时限]]（REL-0129，证据 4 条）
- [逆向物流](../fulfillment/reverse-logistics.md) 协同支持本知识（REL-0130，证据 2 条）
- 由其实现 [[system/fulfillment-service|履约服务]]（REL-0366，证据 2 条）

## 来源

- SRC-AFS-002：SV-SRC-AFS-002-1
- SRC-FUL-001：SV-SRC-FUL-001-1
- SRC-AFS-001：SV-SRC-AFS-001-1、SV-SRC-AFS-001-2
- SRC-AFS-003：SV-SRC-AFS-003-1

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
