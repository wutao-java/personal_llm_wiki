---
knowledge_id: "K-FULFILLMENT-DELIVERY-AREA"
title: "配送范围"
type: "rule"
domain: "fulfillment"
sources: ["SRC-FUL-002", "SRC-FUL-001", "SRC-FUL-003", "SRC-ARC-001"]
source_versions: ["SV-SRC-FUL-002-1", "SV-SRC-FUL-001-1", "SV-SRC-FUL-003-1", "SV-SRC-ARC-001-1"]
updated: "2026-08-03"
status: "accepted"
---

# 配送范围

## 摘要

根据地址、门店服务能力、商品限制和承运能力判断是否可配送。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-FULFILLMENT-DELIVERY-AREA 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- 属于 [[fulfillment/fulfillment-aftersales-management|履约与售后管理]]（REL-0103，证据 2 条）
- 协同支持 [[fulfillment/delivery|配送]]（REL-0119，证据 2 条）
- [承诺时效](../fulfillment/promised-time.md) 协同支持本知识（REL-0120，证据 2 条）
- 协同支持 [[fulfillment/fulfillment-method|履约方式]]（REL-0293，证据 2 条）
- [门店自提](../fulfillment/store-pickup.md) 协同支持本知识（REL-0295，证据 2 条）
- 由其实现 [[system/fulfillment-service|履约服务]]（REL-0361，证据 2 条）
- 由其衡量 [[quality/compile-success-rate|编译成功率]]（REL-0402，证据 2 条）
- [同城即时配送](../fulfillment/instant-delivery.md) 依赖本知识（REL-0435，证据 2 条）

## 来源

- SRC-FUL-002：SV-SRC-FUL-002-1
- SRC-FUL-001：SV-SRC-FUL-001-1
- SRC-FUL-003：SV-SRC-FUL-003-1
- SRC-ARC-001：SV-SRC-ARC-001-1

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
