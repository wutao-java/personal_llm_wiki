---
knowledge_id: "K-FULFILLMENT-LOGISTICS-EVENT"
title: "物流事件"
type: "interface"
domain: "fulfillment"
sources: ["SRC-FUL-004", "SRC-FUL-001", "SRC-FUL-005", "SRC-FUL-003"]
source_versions: ["SV-SRC-FUL-004-1", "SV-SRC-FUL-001-1", "SV-SRC-FUL-005-1", "SV-SRC-FUL-003-1"]
updated: "2026-08-03"
status: "accepted"
---

# 物流事件

## 摘要

承运方或门店发布的状态变化记录，带有事件时间、业务时间和唯一编号。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-FULFILLMENT-LOGISTICS-EVENT 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- 属于 [[fulfillment/fulfillment-aftersales-management|履约与售后管理]]（REL-0108，证据 2 条）
- 协同支持 [[fulfillment/logistics-status|物流状态]]（REL-0124，证据 2 条）
- [签收](../fulfillment/signoff.md) 协同支持本知识（REL-0125，证据 2 条）
- 协同支持 [[fulfillment/pickup-code|取货码]]（REL-0298，证据 2 条）

## 来源

- SRC-FUL-004：SV-SRC-FUL-004-1
- SRC-FUL-001：SV-SRC-FUL-001-1
- SRC-FUL-005：SV-SRC-FUL-005-1
- SRC-FUL-003：SV-SRC-FUL-003-1

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
