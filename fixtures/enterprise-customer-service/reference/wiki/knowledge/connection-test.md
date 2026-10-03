---
knowledge_id: "K-KNOWLEDGE-CONNECTION-TEST"
title: "连接测试"
type: "process"
domain: "knowledge"
sources: ["SRC-KM-007", "SRC-KM-002", "SRC-KM-008", "SRC-ARC-006"]
source_versions: ["SV-SRC-KM-007-2", "SV-SRC-KM-002-1", "SV-SRC-KM-008-1", "SV-SRC-ARC-006-1"]
updated: "2026-08-03"
status: "accepted"
---

# 连接测试

## 摘要

更新版本在十五秒内验证模型连接；可重试网络错误允许重试一次，并继续隐藏凭据和完整响应。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-KNOWLEDGE-CONNECTION-TEST 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- 属于 [[knowledge/knowledge-model-management|知识处理与模型使用]]（REL-0181，证据 4 条）
- 协同支持 [[knowledge/model-profile|模型配置]]（REL-0197，证据 4 条）
- [旧值防线](../knowledge/stale-answer-guard.md) 协同支持本知识（REL-0198，证据 4 条）
- 由其实现 [[system/qa-service|问答服务]]（REL-0385，证据 4 条）
- 由其衡量 [[quality/compile-success-rate|编译成功率]]（REL-0415，证据 4 条）

## 来源

- SRC-KM-007：SV-SRC-KM-007-1、SV-SRC-KM-007-2
- SRC-KM-002：SV-SRC-KM-002-1
- SRC-KM-008：SV-SRC-KM-008-1
- SRC-ARC-006：SV-SRC-ARC-006-1

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
