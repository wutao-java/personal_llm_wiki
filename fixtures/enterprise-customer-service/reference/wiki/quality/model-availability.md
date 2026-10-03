---
knowledge_id: "K-QUALITY-MODEL-AVAILABILITY"
title: "模型可用性"
type: "metric"
domain: "quality"
sources: ["SRC-QA-001", "SRC-SEC-002", "SRC-SEC-001", "SRC-CAT-001"]
source_versions: ["SV-SRC-QA-001-1", "SV-SRC-SEC-002-1", "SV-SRC-SEC-001-1", "SV-SRC-CAT-001-1"]
updated: "2026-08-03"
status: "accepted"
---

# 模型可用性

## 摘要

衡量已配置默认模型连接测试和实际请求的成功情况。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-QUALITY-MODEL-AVAILABILITY 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- 属于 [[quality/quality-security-operations|质量、安全与运营管理]]（REL-0238，证据 2 条）
- 协同支持 [[quality/retrieval-latency|检索响应时间]]（REL-0254，证据 2 条）
- [来源完整性](../quality/source-integrity.md) 协同支持本知识（REL-0255，证据 2 条）
- 协同支持 [[quality/compile-success-rate|编译成功率]]（REL-0328，证据 2 条）
- [个人信息](../quality/personal-information.md) 协同支持本知识（REL-0330，证据 2 条）
- [商品与库存管理](../catalog/catalog-inventory-management.md) 由其衡量本知识（REL-0391，证据 2 条）
- [退货申请](../fulfillment/return-request.md) 由其衡量本知识（REL-0404，证据 2 条）
- [系统与接口架构](../system/system-interface-architecture.md) 由其衡量本知识（REL-0416，证据 2 条）

## 来源

- SRC-QA-001：SV-SRC-QA-001-1
- SRC-SEC-002：SV-SRC-SEC-002-1
- SRC-SEC-001：SV-SRC-SEC-001-1
- SRC-CAT-001：SV-SRC-CAT-001-1

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
