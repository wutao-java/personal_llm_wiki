---
knowledge_id: "K-SYSTEM-CUSTOMER-SERVICE-UI"
title: "客户服务界面"
type: "component"
domain: "system"
sources: ["SRC-ARC-001", "SRC-ARC-006", "SRC-PROJ-001", "SRC-PROJ-005"]
source_versions: ["SV-SRC-ARC-001-1", "SV-SRC-ARC-006-1", "SV-SRC-PROJ-001-1", "SV-SRC-PROJ-005-1"]
updated: "2026-08-03"
status: "accepted"
---

# 客户服务界面

## 摘要

承载知识问答、资料管理、知识页面、知识图谱和设置五个一级模块。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-SYSTEM-CUSTOMER-SERVICE-UI 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- 属于 [[system/system-interface-architecture|系统与接口架构]]（REL-0199，证据 2 条）
- [资料服务](../system/source-service.md) 协同支持本知识（REL-0216，证据 2 条）
- [知识编译服务](../system/compile-service.md) 协同支持本知识（REL-0316，证据 2 条）
- [客户服务知识系统项目](../project/customer-service-knowledge-project.md) 由其实现本知识（REL-0332，证据 2 条）
- [服务渠道](../project/service-channel.md) 由其实现本知识（REL-0336，证据 2 条）
- 受其约束 [[quality/data-classification|数据分类]]（REL-0422，证据 2 条）

## 来源

- SRC-ARC-001：SV-SRC-ARC-001-1
- SRC-ARC-006：SV-SRC-ARC-006-1
- SRC-PROJ-001：SV-SRC-PROJ-001-1
- SRC-PROJ-005：SV-SRC-PROJ-005-1

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
