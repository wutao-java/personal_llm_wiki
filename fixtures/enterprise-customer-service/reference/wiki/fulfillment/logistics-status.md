---
knowledge_id: "K-FULFILLMENT-LOGISTICS-STATUS"
title: "物流状态"
type: "concept"
domain: "fulfillment"
sources: ["SRC-FUL-004", "SRC-FUL-001", "SRC-FUL-003", "SRC-FUL-005"]
source_versions: ["SV-SRC-FUL-004-1", "SV-SRC-FUL-001-1", "SV-SRC-FUL-003-1", "SV-SRC-FUL-005-1"]
updated: "2026-08-03"
status: "accepted"
---

# 物流状态

## 摘要

将承运方事件映射为已揽收、运输中、派送中、已签收和异常等客户可见状态。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-FULFILLMENT-LOGISTICS-STATUS 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- 属于 [[fulfillment/fulfillment-aftersales-management|履约与售后管理]]（REL-0107，证据 2 条）
- 协同支持 [[fulfillment/pickup-code|取货码]]（REL-0123，证据 2 条）
- [物流事件](../fulfillment/logistics-event.md) 协同支持本知识（REL-0124，证据 2 条）
- 协同支持 [[fulfillment/store-pickup|门店自提]]（REL-0297，证据 2 条）
- [签收](../fulfillment/signoff.md) 协同支持本知识（REL-0299，证据 2 条）
- 由其实现 [[system/fulfillment-service|履约服务]]（REL-0363，证据 2 条）
- 由其衡量 [[quality/retrieval-latency|检索响应时间]]（REL-0403，证据 2 条）

## 来源

- SRC-FUL-004：SV-SRC-FUL-004-1
- SRC-FUL-001：SV-SRC-FUL-001-1
- SRC-FUL-003：SV-SRC-FUL-003-1
- SRC-FUL-005：SV-SRC-FUL-005-1

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
