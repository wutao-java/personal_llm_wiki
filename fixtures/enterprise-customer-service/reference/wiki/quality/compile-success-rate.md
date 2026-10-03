---
knowledge_id: "K-QUALITY-COMPILE-SUCCESS-RATE"
title: "编译成功率"
type: "metric"
domain: "quality"
sources: ["SRC-QA-001", "SRC-PROJ-006", "SRC-FUL-002", "SRC-KM-007"]
source_versions: ["SV-SRC-QA-001-1", "SV-SRC-PROJ-006-1", "SV-SRC-FUL-002-1", "SV-SRC-KM-007-2"]
updated: "2026-08-03"
status: "accepted"
---

# 编译成功率

## 摘要

衡量可处理来源中成功生成并通过一致性检查的比例。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-QUALITY-COMPILE-SUCCESS-RATE 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- 属于 [[quality/quality-security-operations|质量、安全与运营管理]]（REL-0236，证据 2 条）
- 协同支持 [[quality/graph-consistency|图谱一致性]]（REL-0252，证据 2 条）
- [检索响应时间](../quality/retrieval-latency.md) 协同支持本知识（REL-0253，证据 2 条）
- 协同支持 [[quality/relation-coverage|关系证据覆盖率]]（REL-0326，证据 2 条）
- [模型可用性](../quality/model-availability.md) 协同支持本知识（REL-0328，证据 2 条）
- [知识版本发布](../project/snapshot-release.md) 由其衡量本知识（REL-0390，证据 2 条）
- [配送范围](../fulfillment/delivery-area.md) 由其衡量本知识（REL-0402，证据 2 条）
- [连接测试](../knowledge/connection-test.md) 由其衡量本知识（REL-0415，证据 4 条）

## 来源

- SRC-QA-001：SV-SRC-QA-001-1
- SRC-PROJ-006：SV-SRC-PROJ-006-1
- SRC-FUL-002：SV-SRC-FUL-002-1
- SRC-KM-007：SV-SRC-KM-007-1、SV-SRC-KM-007-2

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
