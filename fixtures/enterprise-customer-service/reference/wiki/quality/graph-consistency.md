---
knowledge_id: "K-QUALITY-GRAPH-CONSISTENCY"
title: "图谱一致性"
type: "metric"
domain: "quality"
sources: ["SRC-QA-001", "SRC-PROJ-004", "SRC-FUL-001", "SRC-KM-006"]
source_versions: ["SV-SRC-QA-001-1", "SV-SRC-PROJ-004-1", "SV-SRC-FUL-001-1", "SV-SRC-KM-006-1"]
updated: "2026-08-03"
status: "accepted"
---

# 图谱一致性

## 摘要

核对图谱节点和边与当前知识版本中的知识项和关系是否一致。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-QUALITY-GRAPH-CONSISTENCY 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- 属于 [[quality/quality-security-operations|质量、安全与运营管理]]（REL-0235，证据 2 条）
- 协同支持 [[quality/relation-coverage|关系证据覆盖率]]（REL-0251，证据 2 条）
- [编译成功率](../quality/compile-success-rate.md) 协同支持本知识（REL-0252，证据 2 条）
- 协同支持 [[quality/citation-accuracy|引用准确率]]（REL-0325，证据 2 条）
- [检索响应时间](../quality/retrieval-latency.md) 协同支持本知识（REL-0327，证据 2 条）
- [项目术语](../project/project-glossary.md) 由其衡量本知识（REL-0389，证据 2 条）
- [履约与售后管理](../fulfillment/fulfillment-aftersales-management.md) 由其衡量本知识（REL-0401，证据 2 条）
- [知识检索](../knowledge/retrieval.md) 由其衡量本知识（REL-0414，证据 2 条）
- [履约服务](../system/fulfillment-service.md) 由其衡量本知识（REL-0432，证据 2 条）

## 来源

- SRC-QA-001：SV-SRC-QA-001-1
- SRC-PROJ-004：SV-SRC-PROJ-004-1
- SRC-FUL-001：SV-SRC-FUL-001-1
- SRC-KM-006：SV-SRC-KM-006-1

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
