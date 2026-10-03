---
knowledge_id: "K-FULFILLMENT-RETURN-REQUEST"
title: "退货申请"
type: "process"
domain: "fulfillment"
sources: ["SRC-AFS-001", "SRC-FUL-001", "SRC-FUL-005", "SRC-ARC-005"]
source_versions: ["SV-SRC-AFS-001-2", "SV-SRC-FUL-001-1", "SV-SRC-FUL-005-1", "SV-SRC-ARC-005-1"]
updated: "2026-08-03"
status: "accepted"
---

# 退货申请

## 摘要

客户提交需要退回的订单项、原因、数量和必要凭证后形成的售后请求。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-FULFILLMENT-RETURN-REQUEST 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- 属于 [[fulfillment/fulfillment-aftersales-management|履约与售后管理]]（REL-0111，证据 2 条）
- 协同支持 [[fulfillment/signoff-exception|签收异常]]（REL-0127，证据 2 条）
- [退货时限](../fulfillment/return-window.md) 协同支持本知识（REL-0128，证据 4 条）
- 由其实现 [[system/ticket-service|工单服务]]（REL-0365，证据 2 条）
- 由其衡量 [[quality/model-availability|模型可用性]]（REL-0404，证据 2 条）

## 来源

- SRC-AFS-001：SV-SRC-AFS-001-1、SV-SRC-AFS-001-2
- SRC-FUL-001：SV-SRC-FUL-001-1
- SRC-FUL-005：SV-SRC-FUL-005-1
- SRC-ARC-005：SV-SRC-ARC-005-1

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
