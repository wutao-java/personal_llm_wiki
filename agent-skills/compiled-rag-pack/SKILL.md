---
name: compiled-rag-pack
description: >
  编译式 RAG、LLM Wiki、GBrain、第二大脑、知识图谱建库与运维。把零散资料编译成可读可互链可治理的
  wiki / 知识图谱的开发能力包（区别于把资料塞进向量库当机器索引）。当用户要把笔记文档编译成
  第二大脑、搭 cron/launchd 自动化增量编译管线、做编译 wiki + 向量 RAG 混合架构、部署多人团队大脑
  按 OAuth source 隔离、排查"改了源却答旧值 / wikilink 少边 / sync 不增量 / 调度器被杀 / 隔离泄漏"、
  或在传统向量 RAG、编译式 wiki、GBrain 图谱之间选型时使用。不适用于：图文混排 PDF 解析与 OCR 表格抽取、
  Text-to-SQL 结构化查询优化（属其他 RAG 场景包）。
---

# 编译式 RAG 包

把资料"编译"成可读知识网络的能力包。本文件是入口路由：判断当前任务属于哪类，读取对应能力文件执行，不要一次全读。

## 能力地图（按需读取）

**把事做对（方法）**
- 搭三层编译闭环 + self-wiring 建图：见 [capabilities/compiled-rag-wiki-compilation.md](capabilities/compiled-rag-wiki-compilation.md)
- 搭多源自动化增量编译管线（cron/launchd）：见 [capabilities/compiled-rag-incremental-pipeline.md](capabilities/compiled-rag-incremental-pipeline.md)

**不做错事（约束）** ——本场景任何编译/查询/团队部署任务动手前先读，全程遵守：
- 源不可变 + 源变必重编译 + wikilink 前缀红线：见 [capabilities/compiled-rag-source-immutability.md](capabilities/compiled-rag-source-immutability.md)
- 团队大脑多租户隔离（访问控制落 DB 层，不靠大模型自觉）：见 [capabilities/compiled-rag-team-isolation.md](capabilities/compiled-rag-team-isolation.md)

**排查故障（诊断）** ——命令 EXIT:0 却结果不对时按症状定位：
- GBrain 静默失败排错（查不到 / 缺边 / sync 不增量 / 被杀 / 维度不匹配 / 隔离失效）：见 [capabilities/compiled-rag-silent-failure-diagnostics.md](capabilities/compiled-rag-silent-failure-diagnostics.md)

**知道做没做好（验收）** ——任务完成后必过：
- 源不可变自检：Run `scripts/verify_source_immutability.py <wiki 项目目录>`（校验 raw/ 相对基线零改动 + wikilink 前缀齐全，红项先修再交付）
- 管线健康判读：Run `scripts/check_pipeline_health.py <doctor.json>`（断言 embeddings 100% + 0 stale，区分"优化空间"与"真故障"）
- 隔离零泄漏核验：Run `scripts/verify_source_isolation.py <results.json> --authorized <source 集>`（每条命中 source_id 必属授权集，越界即 FAIL）

**选得对（决策）**
- 传统 RAG / 编译式 wiki / GBrain 三元选型：见 [capabilities/compiled-rag-paradigm-selection.md](capabilities/compiled-rag-paradigm-selection.md)
- 混合架构选型与落地（编译 wiki + 向量 RAG 并用）：见 [capabilities/compiled-rag-hybrid-architecture.md](capabilities/compiled-rag-hybrid-architecture.md)

**速查（渐进披露）**
- GBrain CLI 命令 · 静默失败症状表 · 配置默认值 · 实测数字：见 [references/gbrain-cli-and-pitfalls.md](references/gbrain-cli-and-pitfalls.md)
- 配置模板：cron 脚本 / launchd plist / thin-client config，见 `assets/`

## 使用原则

1. 约束红线常在：编译/查询/团队部署动手前先读约束文件，源层 raw/ 永远只读，访问控制永远落 DB 层。
2. 完成必过验收：交付前 Run 对应验收脚本（源不可变 / 管线健康 / 隔离零泄漏），红项先修再交付。
3. 脚本执行不阅读：Run 验收脚本只看输出结论；命令 EXIT:0 不等于成功，核验实际产物（边数 / source_id / 覆盖率）。
4. 症状不对先查诊断：这类失败多静默不报错，按诊断能力的"症状→根因→修复"表定位，别归咎玄学或版本 bug。
5. 深度原理不在本包：需要"为什么"时引导用户查课程知识库对应页（见各能力文件尾部标注）。
