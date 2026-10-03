---
knowledge_id: "K-SERVICE-SERVICE-REQUEST"
title: "服务请求"
type: "data_object"
domain: "service"
sources: ["SRC-CS-002", "SRC-CS-001"]
source_versions: ["SV-SRC-CS-002-1", "SV-SRC-CS-001-1"]
updated: "2026-08-03"
status: "accepted"
---

# 服务请求

## 摘要

记录客户提出的问题、渠道、相关业务对象、身份核验和当前处理状态。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-SERVICE-SERVICE-REQUEST 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- 属于 [[service/customer-service-management|客户服务管理]]（REL-0133，证据 2 条）
- [问题分类](../service/issue-category.md) 协同支持本知识（REL-0150，证据 2 条）
- [服务意图](../service/service-intent.md) 协同支持本知识（REL-0300，证据 2 条）

## 来源

- SRC-CS-002：SV-SRC-CS-002-1
- SRC-CS-001：SV-SRC-CS-001-1

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
