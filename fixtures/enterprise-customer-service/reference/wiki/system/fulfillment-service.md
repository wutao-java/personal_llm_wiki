---
knowledge_id: "K-SYSTEM-FULFILLMENT-SERVICE"
title: "履约服务"
type: "component"
domain: "system"
sources: ["SRC-ARC-001", "SRC-ARC-005", "SRC-FUL-001", "SRC-FUL-002"]
source_versions: ["SV-SRC-ARC-001-1", "SV-SRC-ARC-005-1", "SV-SRC-FUL-001-1", "SV-SRC-FUL-002-1"]
updated: "2026-08-03"
status: "accepted"
---

# 履约服务

## 摘要

提供配送、自提、物流状态和售后履约协同能力。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-SYSTEM-FULFILLMENT-SERVICE 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- 属于 [[system/system-interface-architecture|系统与接口架构]]（REL-0209，证据 2 条）
- 协同支持 [[system/ticket-service|工单服务]]（REL-0225，证据 2 条）
- [接口网关](../system/api-gateway.md) 协同支持本知识（REL-0226，证据 2 条）
- [履约与售后管理](../fulfillment/fulfillment-aftersales-management.md) 由其实现本知识（REL-0359，证据 2 条）
- [履约方式](../fulfillment/fulfillment-method.md) 由其实现本知识（REL-0360，证据 2 条）
- [配送范围](../fulfillment/delivery-area.md) 由其实现本知识（REL-0361，证据 2 条）
- [门店自提](../fulfillment/store-pickup.md) 由其实现本知识（REL-0362，证据 2 条）
- [物流状态](../fulfillment/logistics-status.md) 由其实现本知识（REL-0363，证据 2 条）
- [签收](../fulfillment/signoff.md) 由其实现本知识（REL-0364，证据 2 条）
- [换货申请](../fulfillment/exchange-request.md) 由其实现本知识（REL-0366，证据 2 条）
- 由其衡量 [[quality/graph-consistency|图谱一致性]]（REL-0432，证据 2 条）
- [同城即时配送](../fulfillment/instant-delivery.md) 由其实现本知识（REL-0434，证据 2 条）

## 来源

- SRC-ARC-001：SV-SRC-ARC-001-1
- SRC-ARC-005：SV-SRC-ARC-005-1
- SRC-FUL-001：SV-SRC-FUL-001-1
- SRC-FUL-002：SV-SRC-FUL-002-1

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
