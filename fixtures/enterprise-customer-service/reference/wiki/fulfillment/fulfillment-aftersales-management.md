---
knowledge_id: "K-FULFILLMENT-FULFILLMENT-AFTERSALES-MANAGEMENT"
title: "履约与售后管理"
type: "domain"
domain: "fulfillment"
sources: ["SRC-FUL-001", "SRC-FUL-002", "SRC-FUL-003", "SRC-FUL-004"]
source_versions: ["SV-SRC-FUL-001-1", "SV-SRC-FUL-002-1", "SV-SRC-FUL-003-1", "SV-SRC-FUL-004-1"]
updated: "2026-08-03"
status: "accepted"
---

# 履约与售后管理

## 摘要

负责配送、自提、物流状态、签收、退换货、逆向物流和补偿。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-FULFILLMENT-FULFILLMENT-AFTERSALES-MANAGEMENT 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- [履约单](../fulfillment/fulfillment-order.md) 属于本知识（REL-0100，证据 2 条）
- [履约方式](../fulfillment/fulfillment-method.md) 属于本知识（REL-0101，证据 2 条）
- [配送](../fulfillment/delivery.md) 属于本知识（REL-0102，证据 2 条）
- [配送范围](../fulfillment/delivery-area.md) 属于本知识（REL-0103，证据 2 条）
- [承诺时效](../fulfillment/promised-time.md) 属于本知识（REL-0104，证据 2 条）
- [门店自提](../fulfillment/store-pickup.md) 属于本知识（REL-0105，证据 2 条）
- [取货码](../fulfillment/pickup-code.md) 属于本知识（REL-0106，证据 2 条）
- [物流状态](../fulfillment/logistics-status.md) 属于本知识（REL-0107，证据 2 条）
- [物流事件](../fulfillment/logistics-event.md) 属于本知识（REL-0108，证据 2 条）
- [签收](../fulfillment/signoff.md) 属于本知识（REL-0109，证据 2 条）
- [签收异常](../fulfillment/signoff-exception.md) 属于本知识（REL-0110，证据 2 条）
- [退货申请](../fulfillment/return-request.md) 属于本知识（REL-0111，证据 2 条）
- [退货时限](../fulfillment/return-window.md) 属于本知识（REL-0112，证据 4 条）
- [换货申请](../fulfillment/exchange-request.md) 属于本知识（REL-0113，证据 2 条）
- [逆向物流](../fulfillment/reverse-logistics.md) 属于本知识（REL-0114，证据 2 条）
- [退货质检](../fulfillment/return-inspection.md) 属于本知识（REL-0115，证据 2 条）
- [售后补偿](../fulfillment/compensation.md) 属于本知识（REL-0116，证据 2 条）
- 由其实现 [[system/fulfillment-service|履约服务]]（REL-0359，证据 2 条）
- 由其衡量 [[quality/graph-consistency|图谱一致性]]（REL-0401，证据 2 条）
- [同城即时配送](../fulfillment/instant-delivery.md) 属于本知识（REL-0433，证据 2 条）

## 来源

- SRC-FUL-001：SV-SRC-FUL-001-1
- SRC-FUL-002：SV-SRC-FUL-002-1
- SRC-FUL-003：SV-SRC-FUL-003-1
- SRC-FUL-004：SV-SRC-FUL-004-1

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
