---
knowledge_id: "K-QUALITY-MASKING-POLICY"
title: "脱敏规则"
type: "rule"
domain: "quality"
sources: ["SRC-SEC-001", "SRC-QA-001", "SRC-SEC-002", "SRC-CAT-005"]
source_versions: ["SV-SRC-SEC-001-1", "SV-SRC-QA-001-1", "SV-SRC-SEC-002-1", "SV-SRC-CAT-005-1"]
updated: "2026-08-03"
status: "accepted"
---

# 脱敏规则

## 摘要

在界面、日志和模型上下文中按最小必要原则隐藏敏感字段。

## 核心说明

本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 K-QUALITY-MASKING-POLICY 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 KS-RETAIL-SERVICE-1.1。

## 关系

- 属于 [[quality/quality-security-operations|质量、安全与运营管理]]（REL-0242，证据 2 条）
- 协同支持 [[quality/data-classification|数据分类]]（REL-0258，证据 2 条）
- [提示注入](../quality/prompt-injection.md) 协同支持本知识（REL-0259，证据 2 条）
- [缺货](../catalog/stockout.md) 受其约束本知识（REL-0394，证据 2 条）
- [客户服务管理](../service/customer-service-management.md) 受其约束本知识（REL-0406，证据 2 条）
- [接口网关](../system/api-gateway.md) 受其约束本知识（REL-0419，证据 2 条）
- [资料服务](../system/source-service.md) 受其约束本知识（REL-0423，证据 2 条）
- [会员敏感信息](../quality/member-sensitive-data.md) 受其约束本知识（REL-0446，证据 2 条）

## 来源

- SRC-SEC-001：SV-SRC-SEC-001-1
- SRC-QA-001：SV-SRC-QA-001-1
- SRC-SEC-002：SV-SRC-SEC-002-1
- SRC-CAT-005：SV-SRC-CAT-005-1

## 使用说明

知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。
