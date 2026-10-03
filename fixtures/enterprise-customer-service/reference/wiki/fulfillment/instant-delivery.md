---
knowledge_id: "K-FULFILLMENT-INSTANT-DELIVERY"
title: "同城即时配送"
type: "process"
domain: "fulfillment"
sources: ["SRC-FUL-010", "SRC-FUL-001", "SRC-ARC-001", "SRC-FUL-002"]
source_versions: ["SV-SRC-FUL-010-1", "SV-SRC-FUL-001-1", "SV-SRC-ARC-001-1", "SV-SRC-FUL-002-1"]
updated: "2026-08-03"
status: "accepted"
---

# 同城即时配送

## 摘要

在覆盖门店和可用库存满足条件时提供较短承诺时效；无法履约时降级为普通配送并通知客户。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-FULFILLMENT-INSTANT-DELIVERY 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- 属于 [[fulfillment/fulfillment-aftersales-management|履约与售后管理]]（REL-0433，证据 2 条）
- 由其实现 [[system/fulfillment-service|履约服务]]（REL-0434，证据 2 条）
- 依赖 [[fulfillment/delivery-area|配送范围]]（REL-0435，证据 2 条）

## 来源

- SRC-FUL-010：SV-SRC-FUL-010-1
- SRC-FUL-001：SV-SRC-FUL-001-1
- SRC-ARC-001：SV-SRC-ARC-001-1
- SRC-FUL-002：SV-SRC-FUL-002-1

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
