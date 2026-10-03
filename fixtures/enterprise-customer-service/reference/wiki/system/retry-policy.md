---
knowledge_id: "K-SYSTEM-RETRY-POLICY"
title: "重试策略"
type: "rule"
domain: "system"
sources: ["SRC-ARC-007", "SRC-ARC-001"]
source_versions: ["SV-SRC-ARC-007-1", "SV-SRC-ARC-001-1"]
updated: "2026-08-03"
status: "accepted"
---

# 重试策略

## 摘要

只对明确可重试错误执行有限次数和退避间隔的重试，并保持幂等。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-SYSTEM-RETRY-POLICY 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- 属于 [[system/system-interface-architecture|系统与接口架构]]（REL-0212，证据 2 条）
- 协同支持 [[system/event-bus|事件总线]]（REL-0228，证据 2 条）
- [失败事件队列](../system/dead-letter-queue.md) 协同支持本知识（REL-0229，证据 2 条）

## 来源

- SRC-ARC-007：SV-SRC-ARC-007-1
- SRC-ARC-001：SV-SRC-ARC-001-1

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
