---
knowledge_id: "K-KNOWLEDGE-MODEL-PROFILE"
title: "模型配置"
type: "data_object"
domain: "knowledge"
sources: ["SRC-KM-007", "SRC-KM-002", "SRC-KM-006"]
source_versions: ["SV-SRC-KM-007-2", "SV-SRC-KM-002-1", "SV-SRC-KM-006-1"]
updated: "2026-08-03"
status: "accepted"
---

# 模型配置

## 摘要

保存连接类型、服务地址、模型标识、凭据引用和测试状态，不保存可回显密钥。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-KNOWLEDGE-MODEL-PROFILE 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- 属于 [[knowledge/knowledge-model-management|知识处理与模型使用]]（REL-0180，证据 2 条）
- 协同支持 [[knowledge/answer-generation|回答生成]]（REL-0196，证据 2 条）
- [连接测试](../knowledge/connection-test.md) 协同支持本知识（REL-0197，证据 4 条）

## 来源

- SRC-KM-007：SV-SRC-KM-007-1、SV-SRC-KM-007-2
- SRC-KM-002：SV-SRC-KM-002-1
- SRC-KM-006：SV-SRC-KM-006-1

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
