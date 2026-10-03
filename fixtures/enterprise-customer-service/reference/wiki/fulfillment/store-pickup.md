---
knowledge_id: "K-FULFILLMENT-STORE-PICKUP"
title: "门店自提"
type: "process"
domain: "fulfillment"
sources: ["SRC-FUL-003", "SRC-FUL-001", "SRC-FUL-002", "SRC-FUL-004"]
source_versions: ["SV-SRC-FUL-003-1", "SV-SRC-FUL-001-1", "SV-SRC-FUL-002-1", "SV-SRC-FUL-004-1"]
updated: "2026-08-03"
status: "accepted"
---

# 门店自提

## 摘要

门店完成备货后通知客户，客户核验身份和取货码后完成核销。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-FULFILLMENT-STORE-PICKUP 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- 属于 [[fulfillment/fulfillment-aftersales-management|履约与售后管理]]（REL-0105，证据 2 条）
- 协同支持 [[fulfillment/promised-time|承诺时效]]（REL-0121，证据 2 条）
- [取货码](../fulfillment/pickup-code.md) 协同支持本知识（REL-0122，证据 2 条）
- 协同支持 [[fulfillment/delivery-area|配送范围]]（REL-0295，证据 2 条）
- [物流状态](../fulfillment/logistics-status.md) 协同支持本知识（REL-0297，证据 2 条）
- 由其实现 [[system/fulfillment-service|履约服务]]（REL-0362，证据 2 条）

## 来源

- SRC-FUL-003：SV-SRC-FUL-003-1
- SRC-FUL-001：SV-SRC-FUL-001-1
- SRC-FUL-002：SV-SRC-FUL-002-1
- SRC-FUL-004：SV-SRC-FUL-004-1

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
