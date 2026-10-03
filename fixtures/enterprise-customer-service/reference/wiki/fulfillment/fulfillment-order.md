---
knowledge_id: "K-FULFILLMENT-FULFILLMENT-ORDER"
title: "履约单"
type: "data_object"
domain: "fulfillment"
sources: ["SRC-FUL-001", "SRC-FUL-002"]
source_versions: ["SV-SRC-FUL-001-1", "SV-SRC-FUL-002-1"]
updated: "2026-08-03"
status: "accepted"
---

# 履约单

## 摘要

从订单拆分出的履约执行对象，记录门店或仓库、方式、状态和承诺时间。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-FULFILLMENT-FULFILLMENT-ORDER 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- 属于 [[fulfillment/fulfillment-aftersales-management|履约与售后管理]]（REL-0100，证据 2 条）
- [履约方式](../fulfillment/fulfillment-method.md) 协同支持本知识（REL-0117，证据 2 条）
- [配送](../fulfillment/delivery.md) 协同支持本知识（REL-0292，证据 2 条）

## 来源

- SRC-FUL-001：SV-SRC-FUL-001-1
- SRC-FUL-002：SV-SRC-FUL-002-1

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
