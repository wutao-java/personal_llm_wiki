---
knowledge_id: "K-QUALITY-AUDIT-LOG"
title: "操作记录"
type: "data_object"
domain: "quality"
sources: ["SRC-OPS-002", "SRC-QA-001", "SRC-SEC-002", "SRC-OPS-001"]
source_versions: ["SV-SRC-OPS-002-1", "SV-SRC-QA-001-1", "SV-SRC-SEC-002-1", "SV-SRC-OPS-001-1"]
updated: "2026-08-03"
status: "accepted"
---

# 操作记录

## 摘要

记录关键配置、编译、审核、发布、恢复和数据控制动作，但不记录明文密钥。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-QUALITY-AUDIT-LOG 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- 属于 [[quality/quality-security-operations|质量、安全与运营管理]]（REL-0245，证据 2 条）
- 协同支持 [[quality/document-sanitization|文档安全处理]]（REL-0261，证据 2 条）
- [监控告警](../quality/monitoring-alert.md) 协同支持本知识（REL-0262，证据 2 条）
- [解决时长](../service/resolution-time.md) 受其约束本知识（REL-0408，证据 2 条）
- [知识服务](../system/knowledge-service.md) 受其约束本知识（REL-0425，证据 2 条）

## 来源

- SRC-OPS-002：SV-SRC-OPS-002-1
- SRC-QA-001：SV-SRC-QA-001-1
- SRC-SEC-002：SV-SRC-SEC-002-1
- SRC-OPS-001：SV-SRC-OPS-001-1

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
