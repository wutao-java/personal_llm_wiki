---
knowledge_id: "K-PROJECT-KNOWLEDGE-REVIEWER-ROLE"
title: "知识审核人员"
type: "role"
domain: "project"
sources: ["SRC-PROJ-003", "SRC-PROJ-001", "SRC-PROJ-005", "SRC-ARC-006"]
source_versions: ["SV-SRC-PROJ-003-1", "SV-SRC-PROJ-001-1", "SV-SRC-PROJ-005-1", "SV-SRC-ARC-006-1"]
updated: "2026-08-03"
status: "accepted"
---

# 知识审核人员

## 摘要

审核候选知识、关系与来源证据，决定接受、保留待处理或退回。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-PROJECT-KNOWLEDGE-REVIEWER-ROLE 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- 属于 [[project/customer-service-knowledge-project|客户服务知识系统项目]]（REL-0006，证据 2 条）
- 协同支持 [[project/product-operator-role|产品运营]]（REL-0022，证据 2 条）
- [系统管理员](../project/system-admin-role.md) 协同支持本知识（REL-0023，证据 2 条）
- 协同支持 [[project/service-agent-role|服务人员]]（REL-0268，证据 2 条）
- [服务渠道](../project/service-channel.md) 协同支持本知识（REL-0270，证据 2 条）
- 由其实现 [[system/knowledge-service|知识服务]]（REL-0335，证据 2 条）

## 来源

- SRC-PROJ-003：SV-SRC-PROJ-003-1
- SRC-PROJ-001：SV-SRC-PROJ-001-1
- SRC-PROJ-005：SV-SRC-PROJ-005-1
- SRC-ARC-006：SV-SRC-ARC-006-1

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
