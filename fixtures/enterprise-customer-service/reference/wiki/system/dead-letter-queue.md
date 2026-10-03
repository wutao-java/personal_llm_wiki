---
knowledge_id: "K-SYSTEM-DEAD-LETTER-QUEUE"
title: "失败事件队列"
type: "component"
domain: "system"
sources: ["SRC-ARC-007", "SRC-ARC-001"]
source_versions: ["SV-SRC-ARC-007-1", "SV-SRC-ARC-001-1"]
updated: "2026-08-03"
status: "accepted"
---

# 失败事件队列

## 摘要

保存超过重试上限的事件，供诊断、修复和人工重新处理。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-SYSTEM-DEAD-LETTER-QUEUE 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- 属于 [[system/system-interface-architecture|系统与接口架构]]（REL-0213，证据 2 条）
- 协同支持 [[system/retry-policy|重试策略]]（REL-0229，证据 2 条）
- [文件存储](../system/object-storage.md) 协同支持本知识（REL-0230，证据 2 条）

## 来源

- SRC-ARC-007：SV-SRC-ARC-007-1
- SRC-ARC-001：SV-SRC-ARC-001-1

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
