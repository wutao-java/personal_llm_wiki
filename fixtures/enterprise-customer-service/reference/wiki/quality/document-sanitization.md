---
knowledge_id: "K-QUALITY-DOCUMENT-SANITIZATION"
title: "文档安全处理"
type: "process"
domain: "quality"
sources: ["SRC-SEC-002", "SRC-QA-001", "SRC-OPS-002", "SRC-CAT-007"]
source_versions: ["SV-SRC-SEC-002-1", "SV-SRC-QA-001-1", "SV-SRC-OPS-002-1", "SV-SRC-CAT-007-1"]
updated: "2026-08-03"
status: "accepted"
---

# 文档安全处理

## 摘要

解析导入内容时移除脚本、危险 URL 和主动内容，同时保留可引用文本。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-QUALITY-DOCUMENT-SANITIZATION 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- 属于 [[quality/quality-security-operations|质量、安全与运营管理]]（REL-0244，证据 2 条）
- 协同支持 [[quality/prompt-injection|提示注入]]（REL-0260，证据 2 条）
- [操作记录](../quality/audit-log.md) 协同支持本知识（REL-0261，证据 2 条）
- [商品信息纠错](../catalog/product-correction.md) 受其约束本知识（REL-0395，证据 2 条）
- [工单](../service/ticket.md) 受其约束本知识（REL-0407，证据 2 条）
- [文件存储](../system/object-storage.md) 受其约束本知识（REL-0420，证据 2 条）
- [知识编译服务](../system/compile-service.md) 受其约束本知识（REL-0424，证据 2 条）

## 来源

- SRC-SEC-002：SV-SRC-SEC-002-1
- SRC-QA-001：SV-SRC-QA-001-1
- SRC-OPS-002：SV-SRC-OPS-002-1
- SRC-CAT-007：SV-SRC-CAT-007-1

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
