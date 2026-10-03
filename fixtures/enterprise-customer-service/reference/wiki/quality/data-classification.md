---
knowledge_id: "K-QUALITY-DATA-CLASSIFICATION"
title: "数据分类"
type: "rule"
domain: "quality"
sources: ["SRC-SEC-001", "SRC-QA-001", "SRC-SEC-002", "SRC-CAT-004"]
source_versions: ["SV-SRC-SEC-001-1", "SV-SRC-QA-001-1", "SV-SRC-SEC-002-1", "SV-SRC-CAT-004-2"]
updated: "2026-08-03"
status: "accepted"
---

# 数据分类

## 摘要

把资料和字段划分为公开、内部和敏感等级，并决定处理与展示边界。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-QUALITY-DATA-CLASSIFICATION 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- 属于 [[quality/quality-security-operations|质量、安全与运营管理]]（REL-0241，证据 2 条）
- 协同支持 [[quality/personal-information|个人信息]]（REL-0257，证据 2 条）
- [脱敏规则](../quality/masking-policy.md) 协同支持本知识（REL-0258，证据 2 条）
- 协同支持 [[quality/source-integrity|来源完整性]]（REL-0331，证据 2 条）
- [锁定库存](../catalog/reserved-inventory.md) 受其约束本知识（REL-0393，证据 2 条）
- [库存服务](../system/inventory-service.md) 受其约束本知识（REL-0418，证据 2 条）
- [客户服务界面](../system/customer-service-ui.md) 受其约束本知识（REL-0422，证据 2 条）

## 来源

- SRC-SEC-001：SV-SRC-SEC-001-1
- SRC-QA-001：SV-SRC-QA-001-1
- SRC-SEC-002：SV-SRC-SEC-002-1
- SRC-CAT-004：SV-SRC-CAT-004-1、SV-SRC-CAT-004-2

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
