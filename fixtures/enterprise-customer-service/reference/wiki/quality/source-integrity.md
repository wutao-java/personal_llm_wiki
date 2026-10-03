---
knowledge_id: "K-QUALITY-SOURCE-INTEGRITY"
title: "来源完整性"
type: "rule"
domain: "quality"
sources: ["SRC-SEC-002", "SRC-QA-001", "SRC-SEC-001", "SRC-CAT-002"]
source_versions: ["SV-SRC-SEC-002-1", "SV-SRC-QA-001-1", "SV-SRC-SEC-001-1", "SV-SRC-CAT-002-1"]
updated: "2026-08-03"
status: "accepted"
---

# 来源完整性

## 摘要

通过内容摘要、版本身份和只读存储证明来源没有被编译过程改写。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-QUALITY-SOURCE-INTEGRITY 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- 属于 [[quality/quality-security-operations|质量、安全与运营管理]]（REL-0239，证据 2 条）
- 协同支持 [[quality/model-availability|模型可用性]]（REL-0255，证据 2 条）
- [个人信息](../quality/personal-information.md) 协同支持本知识（REL-0256，证据 2 条）
- 协同支持 [[quality/retrieval-latency|检索响应时间]]（REL-0329，证据 2 条）
- [数据分类](../quality/data-classification.md) 协同支持本知识（REL-0331，证据 2 条）
- [可售规则](../catalog/sellable-rule.md) 受其约束本知识（REL-0392，证据 2 条）
- [退货质检](../fulfillment/return-inspection.md) 受其约束本知识（REL-0405，证据 2 条）
- [知识服务](../system/knowledge-service.md) 受其约束本知识（REL-0417，证据 2 条）
- [系统与接口架构](../system/system-interface-architecture.md) 受其约束本知识（REL-0421，证据 2 条）

## 来源

- SRC-SEC-002：SV-SRC-SEC-002-1
- SRC-QA-001：SV-SRC-QA-001-1
- SRC-SEC-001：SV-SRC-SEC-001-1
- SRC-CAT-002：SV-SRC-CAT-002-1

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
