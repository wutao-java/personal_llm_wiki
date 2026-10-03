---
knowledge_id: "K-FULFILLMENT-PROMISED-TIME"
title: "承诺时效"
type: "metric"
domain: "fulfillment"
sources: ["SRC-FUL-002", "SRC-FUL-001", "SRC-FUL-003"]
source_versions: ["SV-SRC-FUL-002-1", "SV-SRC-FUL-001-1", "SV-SRC-FUL-003-1"]
updated: "2026-08-03"
status: "accepted"
---

# 承诺时效

## 摘要

在下单时向客户确认的预计送达时间，并用于识别延迟。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-FULFILLMENT-PROMISED-TIME 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- 属于 [[fulfillment/fulfillment-aftersales-management|履约与售后管理]]（REL-0104，证据 2 条）
- 协同支持 [[fulfillment/delivery-area|配送范围]]（REL-0120，证据 2 条）
- [门店自提](../fulfillment/store-pickup.md) 协同支持本知识（REL-0121，证据 2 条）
- 协同支持 [[fulfillment/delivery|配送]]（REL-0294，证据 2 条）
- [取货码](../fulfillment/pickup-code.md) 协同支持本知识（REL-0296，证据 2 条）

## 来源

- SRC-FUL-002：SV-SRC-FUL-002-1
- SRC-FUL-001：SV-SRC-FUL-001-1
- SRC-FUL-003：SV-SRC-FUL-003-1

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
