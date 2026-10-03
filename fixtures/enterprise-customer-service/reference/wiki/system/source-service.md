---
knowledge_id: "K-SYSTEM-SOURCE-SERVICE"
title: "资料服务"
type: "component"
domain: "system"
sources: ["SRC-ARC-006", "SRC-ARC-001", "SRC-KM-001", "SRC-SEC-001"]
source_versions: ["SV-SRC-ARC-006-1", "SV-SRC-ARC-001-1", "SV-SRC-KM-001-1", "SV-SRC-SEC-001-1"]
updated: "2026-08-03"
status: "accepted"
---

# 资料服务

## 摘要

负责资料身份、来源版本、文件读取状态、只读预览和移除影响分析。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-SYSTEM-SOURCE-SERVICE 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- 属于 [[system/system-interface-architecture|系统与接口架构]]（REL-0200，证据 2 条）
- 协同支持 [[system/customer-service-ui|客户服务界面]]（REL-0216，证据 2 条）
- [知识编译服务](../system/compile-service.md) 协同支持本知识（REL-0217，证据 2 条）
- [知识服务](../system/knowledge-service.md) 协同支持本知识（REL-0317，证据 2 条）
- [资料版本](../knowledge/source-version.md) 由其实现本知识（REL-0378，证据 2 条）
- 受其约束 [[quality/masking-policy|脱敏规则]]（REL-0423，证据 2 条）

## 来源

- SRC-ARC-006：SV-SRC-ARC-006-1
- SRC-ARC-001：SV-SRC-ARC-001-1
- SRC-KM-001：SV-SRC-KM-001-1
- SRC-SEC-001：SV-SRC-SEC-001-1

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
