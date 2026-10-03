---
knowledge_id: "K-QUALITY-RETRIEVAL-LATENCY"
title: "检索响应时间"
type: "metric"
domain: "quality"
sources: ["SRC-QA-001", "SRC-SEC-002", "SRC-FUL-004"]
source_versions: ["SV-SRC-QA-001-1", "SV-SRC-SEC-002-1", "SV-SRC-FUL-004-1"]
updated: "2026-08-03"
status: "accepted"
---

# 检索响应时间

## 摘要

衡量从提交检索到获得候选知识与证据的时间。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-QUALITY-RETRIEVAL-LATENCY 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- 属于 [[quality/quality-security-operations|质量、安全与运营管理]]（REL-0237，证据 2 条）
- 协同支持 [[quality/compile-success-rate|编译成功率]]（REL-0253，证据 2 条）
- [模型可用性](../quality/model-availability.md) 协同支持本知识（REL-0254，证据 2 条）
- 协同支持 [[quality/graph-consistency|图谱一致性]]（REL-0327，证据 2 条）
- [来源完整性](../quality/source-integrity.md) 协同支持本知识（REL-0329，证据 2 条）
- [物流状态](../fulfillment/logistics-status.md) 由其衡量本知识（REL-0403，证据 2 条）

## 来源

- SRC-QA-001：SV-SRC-QA-001-1
- SRC-SEC-002：SV-SRC-SEC-002-1
- SRC-FUL-004：SV-SRC-FUL-004-1

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
