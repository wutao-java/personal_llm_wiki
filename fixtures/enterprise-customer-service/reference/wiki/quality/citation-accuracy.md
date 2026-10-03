---
knowledge_id: "K-QUALITY-CITATION-ACCURACY"
title: "引用准确率"
type: "metric"
domain: "quality"
sources: ["SRC-QA-001", "SRC-PROJ-003", "SRC-ORD-008", "SRC-KM-004"]
source_versions: ["SV-SRC-QA-001-1", "SV-SRC-PROJ-003-1", "SV-SRC-ORD-008-1", "SV-SRC-KM-004-1"]
updated: "2026-08-03"
status: "accepted"
---

# 引用准确率

## 摘要

衡量引用是否定位到真正支持对应结论的来源片段。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-QUALITY-CITATION-ACCURACY 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- 属于 [[quality/quality-security-operations|质量、安全与运营管理]]（REL-0233，证据 2 条）
- 协同支持 [[quality/answer-groundedness|回答有据性]]（REL-0249，证据 2 条）
- [关系证据覆盖率](../quality/relation-coverage.md) 协同支持本知识（REL-0250，证据 2 条）
- [图谱一致性](../quality/graph-consistency.md) 协同支持本知识（REL-0325，证据 2 条）
- [服务人员](../project/service-agent-role.md) 由其衡量本知识（REL-0387，证据 2 条）
- [发票](../order/invoice.md) 由其衡量本知识（REL-0400，证据 2 条）
- [来源证据](../knowledge/evidence-fragment.md) 由其衡量本知识（REL-0412，证据 2 条）
- [支付服务](../system/payment-service.md) 由其衡量本知识（REL-0430，证据 2 条）
- [引用定位偏差事故](../quality/citation-offset-incident.md) 由其衡量本知识（REL-0443，证据 2 条）

## 来源

- SRC-QA-001：SV-SRC-QA-001-1
- SRC-PROJ-003：SV-SRC-PROJ-003-1
- SRC-ORD-008：SV-SRC-ORD-008-1
- SRC-KM-004：SV-SRC-KM-004-1

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
