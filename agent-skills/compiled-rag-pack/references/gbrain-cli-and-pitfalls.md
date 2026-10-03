# GBrain CLI 与踩坑速查表

> 编译式 RAG / GBrain 进阶部署（自动化管线 · 混合架构 · 团队隔离）的命令与静默失败查表。
> 用途：查命令 flag、查症状根因、查配置默认值。不讲原理——原理见各能力文件与课程知识库。

## 目录

- [1. 常用命令速查](#1-常用命令速查)
- [2. sync flag 速查](#2-sync-flag-速查)
- [3. 静默失败症状 → 根因 → 修复](#3-静默失败症状--根因--修复)
- [4. 配置与默认值（易踩）](#4-配置与默认值易踩)
- [5. 维度与 embedding 对照](#5-维度与-embedding-对照)
- [6. OAuth 隔离权限映射模板](#6-oauth-隔离权限映射模板)
- [7. 实测量化数字（价值锚点弹药）](#7-实测量化数字价值锚点弹药)
- [8. 环境前提硬约束](#8-环境前提硬约束)

---

## 1. 常用命令速查

| 命令 | 作用 | 备注 |
|------|------|------|
| `gbrain init --pglite --embedding-model <m> --embedding-dimensions <d>` | 建库 | 必显式给维度，否则默认检测 OPENAI_API_KEY 用 1536 |
| `gbrain reinit-pglite --embedding-model <m> --embedding-dimensions <d> --yes` | 重建专用库 | 管线专用 brain 用它显式覆盖维度 |
| `gbrain import <repo> [--no-embed]` | 全量编译 O(n) | `--source` 参数在 import 上**静默失效**，勿用 |
| `gbrain sync --repo <path>` | 增量编译 O(diff) | 基于 git；第一次必全量建 checkpoint |
| `gbrain sync --source <ns> --no-pull` | 按 source 路由同步 | 目录须先 git init+commit |
| `gbrain embed --stale` | 回填缺失 embedding | 幂等安全网，cron 必链 |
| `gbrain extract all` / `extract --stale` | self-wiring 建图 | 零 LLM，纯正则解析 wikilink |
| `gbrain doctor [--json]` | 健康巡检 | `--json` 配 `2>/dev/null` 保证纯 JSON |
| `gbrain stats` / `list [--limit N]` | 页数/列表 | list 默认只显 50，看全加 `--limit 100` |
| `gbrain query <q> --no-expand` | 检索 | 必加 `--no-expand` 防多查询跑挂 CPU |
| `gbrain sources add <ns> --path <dir>` | 注册 named source | 默认 `federated: false`（默认隔离） |
| `gbrain sources status` | source 页数分布看板 | 唯一能发现 source 路由失效的核验 |
| `gbrain serve --http --port 3131` | 起 OAuth HTTP MCP | 持写锁，写操作前须停它 |
| `gbrain auth register-client <c> --source <w> --federated-read <r1,r2>` | 注册 scoped 客户端 | `--source`=写权限，`--federated-read`=读权限 |
| `gbrain migrate --to supabase` | 迁 Postgres | 连本地自托管 Postgres，不需云账号 |
| `gbrain connect <mcp-url> --token <t>` | 生成 AI 助手接入命令 | teammate 真实使用路径走 MCP HTTP |

## 2. sync flag 速查

| flag | 作用 |
|------|------|
| `--repo <路径>` | 指定 git 仓库路径（增量的核心） |
| `--full` | 强制全量重 sync（对照基准用） |
| `--no-embed` | 跳过 embedding 步骤 |
| `--no-pull` | 不 git pull（本地源仓库常用） |
| `--retry-failed` | 重试上轮失败页 |
| `--watch --interval N` | 轮询模式（自带简易定时） |
| `--json` | 结构化输出（jq 解析） |
| `--yes` | 非交互（cron 脚本必用，否则卡确认提示） |

> `sync --help` 末尾提示：**PGLite 单写入，大批量 sync 前先停 `gbrain serve`。**

## 3. 静默失败症状 → 根因 → 修复

| 症状 | 根因 | 修复 |
|------|------|------|
| 库有页却查不到 | 新 chunk 没回填 embedding | `gbrain embed --stale`（幂等） |
| extract 返回 0 边不报错 | 裸 `[[名字]]` 无目录前缀，不在白名单被静默忽略 | 改 `[[目录/slug]]` + 建实体存根页 |
| 第一次 sync 没增量/更慢 | import 不建 git 书签，首次 sync 必全量建 checkpoint | 无需修，第二次起真 O(diff) |
| macOS 脚本启动即被杀 EXIT:143 | crontab setuid root 非 TTY 被 SIGTERM | 改用 launchd LaunchAgent |
| 调度触发但每轮写入 Operation not permitted | launchd 沙箱对 exFAT 可移动盘无写权限 | 源仓库+brain 放本机 APFS |
| PGLite failed to initialize WASM runtime | exFAT 不支持 mmap/POSIX 文件锁 | brain 放 APFS，别放外接 exFAT |
| cron 里找不到 gbrain/连不上 Key | cron 无 shell PATH/环境 | 绝对路径 + 显式 export GBRAIN_HOME/Key |
| 写操作 Timed out waiting for PGLite lock | serve 持写锁，PGLite 单写者 | 停 serve→写→重启 serve |
| doctor 25~45/100 | opt-in 未启用/schema coverage/PGLite 跳过 Supabase 检查 | 只看 embeddings 100%，低分是优化空间 |
| ChromaDB dimension 1024 got 384 | `query_texts` 触发内置 384 维 MiniLM | 用 `query_embeddings=[1024 维]` |
| DashScope 400 BadRequestError | compatible-mode/v1 batch_size 上限 10 | batch_size 设 10（不是 25） |
| LLM 路由静默走兜底 | 推理模型 token 全耗在 reasoning，content='' | `max_tokens`≥1500、timeout 60s |
| 跨域 both 查询 wiki 路 0 命中 | BM25 要求全 token 命中，wiki 无 RAG 域词 | 降级 rag_only + 文档化（预期分支） |
| import --source 页面全落 default | `import --source` 静默忽略参数 | 走 `gbrain sync`（基于 git） |
| 多 brain import 全 auth fail | `config set` 写进默认 ~/.gbrain 非 GBRAIN_HOME 库 | python3 直接写 provider_base_urls 进目标 config.json |
| 越权写不报错 | 写隔离是"路由到 write_source"非"拒绝" | 核验实际落点，别等异常 |
| auth list 看不到 OAuth client | 只列 legacy bearer token | 看 `doctor` 的 client 数或 serve banner `Clients: N` |
| MCP HTTP 无法 json.loads | 返回 SSE `data: {...}` 含控制字符 | 取 `data: ` 偏移后再解析 |

## 4. 配置与默认值（易踩）

| 配置项 | 默认/陷阱 | 正确做法 |
|--------|-----------|----------|
| embedding 维度 | init 检测 OPENAI_API_KEY → 默认 1536 | 显式 `--embedding-dimensions 1024` |
| `provider_base_urls.dashscope` | init 重建后 config 缺此字段 | `gbrain config set provider_base_urls.dashscope https://dashscope.aliyuncs.com/compatible-mode/v1` |
| DashScope batch_size | compatible-mode/v1 上限 10 | embedding function 内设 10 |
| source `federated` | 新 source 默认 false（默认隔离） | 显式 `--federated-read` 才放行 |
| think MCP 工具 | 需 write scope，仅 read 会被拒 | 注册给 `--scopes "read write"` |
| `StartInterval`(launchd) | 演示用 120 秒 | 生产改 900（15 分钟）以上 |
| RRF `k_const` | 架构级融合 | 60（Cormack & Clarke 2009） |
| ChromaDB 持久化目录 | 放 /tmp 重启被清 | 生产放稳定 APFS 路径 |

## 5. 维度与 embedding 对照

| 模型 | 维度 | 场景 |
|------|------|------|
| dashscope:text-embedding-v3 | 1024 | 本课主用；多语言，跨语言可比（distance 偏高一点） |
| OpenAI（init 默认检测） | 1536 | 未显式指定时被自动选中的坑 |
| ChromaDB 内置 all-MiniLM-L6-v2 | 384 | `query_texts` 误触发的维度不匹配来源 |

> 混合架构铁律：双源必须用**同一个 embedding 模型 + 同一产品域**，否则向量不在同一几何空间、分数不可比。

## 6. OAuth 隔离权限映射模板

| 客户端 | 写(--source) | 读(--federated-read) | 角色语义 |
|--------|--------------|----------------------|----------|
| alice | customers | customers, shared | 销售：碰不到内部敏感 |
| bob | internal | internal, shared | 运维：读内部，碰不到客户私有 |
| carol | shared | shared, customers, internal | 法务/HR：全 source 可读 |
| lawyer-on-acme | matters-acme | matters-acme, shared-precedent | 律所利益冲突墙：搜 Zenith 案零命中 |
| compliance-officer | shared-precedent | 全 source | 合规官全卷可读 |

核验规则：每条命中 `source_id` ∈ 该凭证 `federated_read` 集，任一越界即 leak = FAIL。

## 7. 实测量化数字（价值锚点弹药）

| 数字 | 含义 | 出处 |
|------|------|------|
| 约 21 倍 token | 编译式查询 ≈165 万 vs 向量 RAG ≈7.9 万 | arxiv 2605.18490 |
| 入库 token ≈ 0 | self-wiring 零 LLM，增量只算 embedding | 自动化管线三笔账 |
| 增量 sync ≈ 一秒级 | 只扫变化页；全量随规模到分钟量级 | 快约一个数量级 |
| 60 页 / 67 chunk | 混合架构 wiki 侧稳定核心 | 混合架构实测 |
| 105 文档 / 1172 chunk | 混合架构 RAG 侧易变长尾 | 工单414/changelog391/事故292/会议75 |
| 路由 11/11=100% vs 6/9=66% | zero-shot 路由准确率依赖措辞分布 | both 型措辞偏 wiki 时全误判 |
| 三形态命中 0.11/1.00/0.44 | 纯 wiki/纯 RAG/混合——混合非"总召回最高" | 混合价值在跨界质量非召回数 |
| 100 页 / 3 source | 团队 brain 隔离靶子规模 | ≥5 敏感 internal 页 |
| 合成耗时约 7.0s | 端到端混合问答带来源标注 | 混合架构环节 4 |

## 8. 环境前提硬约束

- **brain 与源仓库放本机 APFS**（macOS `/tmp` 也是 APFS），绝不放外接 exFAT SSD/U 盘（WASM + launchd 双重失败）。
- **macOS 调度用 launchd LaunchAgent**，不用 crontab（EXIT:143 SIGTERM）。
- **PGLite 单写者**：任何写操作前停 `gbrain serve`。
- **多人并发才迁 Postgres**：`pgvector/pgvector:pg16` + `migrate --to supabase`（本地自托管，不需云账号）；隔离逻辑与后端无关。
- **访问控制在 SQL 层**：`federated_read` 强制过滤 source_id，不靠大模型自觉。

---

来源：赋范空间 大模型应用与开发实战课 - 编译式RAG第三节课：用 GBrain 搭建你的第二大脑（§7.1/7.2/7.3 及配套《自动化增量管线部署指南》《混合架构实现指南》《团队大脑部署指南》）。
