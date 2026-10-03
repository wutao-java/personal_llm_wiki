---
knowledge_id: "K-PROJECT-SERVICE-AGENT-ROLE"
title: "服务人员"
type: "role"
domain: "project"
sources: ["SRC-PROJ-003", "SRC-PROJ-001", "SRC-PROJ-002", "SRC-ARC-005"]
source_versions: ["SV-SRC-PROJ-003-1", "SV-SRC-PROJ-001-1", "SV-SRC-PROJ-002-1", "SV-SRC-ARC-005-1"]
updated: "2026-08-03"
status: "accepted"
---

# 服务人员

## 摘要

受理客户问题、核验身份、查看引用、创建工单并在证据不足时升级处理。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-PROJECT-SERVICE-AGENT-ROLE 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- 属于 [[project/customer-service-knowledge-project|客户服务知识系统项目]]（REL-0004，证据 2 条）
- 协同支持 [[project/customer-role|客户]]（REL-0020，证据 2 条）
- [产品运营](../project/product-operator-role.md) 协同支持本知识（REL-0021，证据 2 条）
- 协同支持 [[project/delivery-scope|交付范围]]（REL-0266，证据 2 条）
- [知识审核人员](../project/knowledge-reviewer-role.md) 协同支持本知识（REL-0268，证据 2 条）
- 由其实现 [[system/ticket-service|工单服务]]（REL-0334，证据 2 条）
- 由其衡量 [[quality/citation-accuracy|引用准确率]]（REL-0387，证据 2 条）

## 来源

- SRC-PROJ-003：SV-SRC-PROJ-003-1
- SRC-PROJ-001：SV-SRC-PROJ-001-1
- SRC-PROJ-002：SV-SRC-PROJ-002-1
- SRC-ARC-005：SV-SRC-ARC-005-1

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
