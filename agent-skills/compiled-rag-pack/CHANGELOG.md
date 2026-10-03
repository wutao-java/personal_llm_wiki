## v1.2.0 (2026-07-13) 编译质量加固：产物形态标准 + 源层"一件不增"（学员实测反馈驱动）

学员实测发现三类问题：编译产物 1:1 复刻源文件、缺互链导致检索落空、新文件误落 raw/。本次全部修复：

### 能力强化
- 搭三层编译闭环（方法）：新增**编译产物形态标准**——结构（按知识单元重组、禁与源 1:1 对应、新文件只落 wiki/）、
  内容（frontmatter + 提取综合的结论正文，禁照抄源文）、关联（互链 > 0 且可达、index.md 每页一行摘要），
  附一票否决自检项；反模式新增"1:1 平移 + 只加 frontmatter 不叫编译"。
- 源不可变红线（约束）：升级为"一字不改、**一件不增**"——明确编译的一切新文件（含实体存根页）只落 wiki/；
  校验环补 `git status --porcelain -- raw/`（git diff 看不见未跟踪新文件）。

### 工具脚本
- scripts/verify_source_immutability.py：新增校验二"源层零新增"（git ls-files --others 抓未跟踪文件），
  修复"新文件塞进 raw/ 却全绿通过"的漏检。

## v1.1.0 (2026-07-03) 深挖迭代：+4 项能力（共 7 项）

聚焦第三节课《用 GBrain 搭建你的第二大脑》三份进阶部署指南（自动化增量管线 / 混合架构 / 团队大脑），补齐首批漏挖的运维、混合、隔离与诊断维度。

### 新增能力
- 搭多源自动化增量编译管线（方法）：多源→git 源仓库→增量 sync→embed --stale→self-wiring→doctor→launchd 调度，无人值守持续生长；含部署后闭环校验。
- GBrain 静默失败排错（诊断）：13 条"命令 EXIT:0 却结果不对"症状→根因→修复（查不到/缺边/sync 不增量/EXIT:143 被杀/exFAT/维度不匹配/隔离失效/推理模型 token）。
- 混合架构选型与落地（决策）：稳定核心走编译 wiki + 易变长尾走向量 RAG + 查询路由 + 架构级 RRF 融合 + 来源标注；三降级分支校验环。
- 团队大脑多租户隔离（约束）：访问控制必须落 SQL 层 federated_read 强制过滤、不靠大模型自觉；source scope + 机械核验零泄漏（leak=FAIL）。

### 工具脚本
- scripts/check_pipeline_health.py：解析 gbrain doctor --json，断言 embeddings 100% + 0 stale，区分"低分=优化空间"与"覆盖率跌破=真故障"。
- scripts/verify_source_isolation.py：给定检索结果 JSON + 授权 source 集，逐条核验 source_id 不越界，越界即 leak=FAIL。

### references / assets
- references/gbrain-cli-and-pitfalls.md：CLI 命令 · sync flag · 静默失败症状表 · 配置默认值 · 维度对照 · 实测数字速查（带目录）。
- assets/：cron-pipeline.sh 模板 · launchd plist 模板 · thin-client config.json。

## v1.0.0 (2026-07-03) 首发：3 项能力

### 新增能力
- 搭三层编译闭环 + self-wiring 建图（方法）：规则层/源层/产物层三层结构，Ingest/Query/Lint 三操作，GBrain 零 LLM 解析 wikilink 建图。
- 源不可变 + 源变必重编译 + wikilink 前缀（约束）：三条红线 + 完成后必过的源不可变自检校验环。
- 三元选型：传统 RAG / 编译式 wiki / GBrain（决策）：按可治理性而非成本选型，约 20 倍 token 成本直觉，benchmark 不混引。

### 工具脚本
- scripts/verify_source_immutability.py：git 对照源层零改动 + wikilink 前缀齐全的确定性自检。

### 随课追加计划
- GBrain 检索层调参（RRF 四层加权 · 三档成本质量模式）随第二节课深化补入。
- schema 包自定义类型设计随第三节课补入决策能力。
