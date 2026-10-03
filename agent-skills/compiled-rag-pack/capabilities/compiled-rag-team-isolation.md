# 团队大脑多租户隔离（访问控制落 DB 层）

## 何时使用

要把个人 GBrain 升级成**多人共用的团队/公司知识库**，需要多人并发、多 source 切分、按权限隔离
（如"销售查客户进展时绝不能看到同事绩效/HR/法务"）时，动手前先读、全程守这条红线，并用机械核验证明零泄漏。

## 核心红线

**访问控制必须落在数据库层，不能靠大模型自觉。**
- 隔离是 SQL 检索层强制 `source_id IN (该凭证被授权的 source 集合)`，从根上让越权数据进不了结果。
- 让大模型"自己别看敏感内容"是**反模式**——它可能不听话，且没法机械验证。这是 2026 多租户 RAG 的工业共识。
- 隔离是 scale-invariant（与数据规模、存储后端无关）：PGLite 与 Postgres 上 `federated_read` 过滤逻辑完全一致；只要靶子页真实存在且真被 block，机制即成立。

## 核心流程

**环节 1 · 多 source 语料 + 建库**
- [ ] 公司 brain 用独立 `GBRAIN_HOME` 与个人库物理隔离；放本机 APFS（exFAT 上 PGLite WASM 会失败，见诊断能力）。
- [ ] 三套独立命名空间目录：`shared/`（全员可读）、`customers/<person>/`（客户范围）、`internal/`（performance/hr/legal 敏感靶子）——**敏感靶子页必须真实存在**，否则"搜不到绩效"是平凡为真、无证明力。
- [ ] `gbrain init` + `import`，验收 `embed` 100% 覆盖（Overall health 偏低是 import-only 正常基线）。
- 多人并发生产迁 Postgres：`docker run ... pgvector/pgvector:pg16` → `gbrain migrate --to supabase`（命令名里的 supabase 只表示"用 PostgresEngine"，连本地自托管 Postgres 即可，不需云账号）。

**环节 2 · 切 source + OAuth scoped 客户端**
- [ ] `gbrain sources add <ns> --path <dir>`；新 source 默认 `federated: false`（默认隔离，显式放行才可读）——这是 leak-free 的底层基础。
- [ ] source 路由必须走 `gbrain sync`（基于 git，各子目录先 `git init`+commit）；**不能用 `import --source`**（静默失效落 default，见诊断能力）。
- [ ] `gbrain serve --http --port 3131` 起 OAuth 2.1 HTTP MCP；注册客户端是写操作，**先停 serve → 注册 → 重启**（PGLite 单写者锁）。
- [ ] 每人一个 client：`--source` 定**写权限**（单 source）、`--federated-read` 定**读权限**（多 source）。核验注册数看 `gbrain doctor`（`N OAuth client(s)`）或 serve banner 的 `Clients: N`——`gbrain auth list` 只列 legacy token，看不到 OAuth client。

| 客户端 | 写(--source) | 读(--federated-read) | 角色 |
|---|---|---|---|
| alice | customers | customers, shared | 销售：碰不到内部敏感 |
| bob | internal | internal, shared | 运维：读内部，碰不到客户私有 |
| carol | shared | shared, customers, internal | 法务/HR：全 source 可读 |

**环节 3 · 验证隔离真生效（核心成果，配好≠生效）**
- [ ] 三套凭证经 MCP HTTP API 跑**同一条敏感查询**（如 `performance review`），逐行核验命中的 `source_id`。
- **核验规则（机械、不靠肉眼）**：每条命中结果的 `source_id` 必属该凭证 `federated_read` 集合，任一越界即 leak = **FAIL**。一键跑 Run `scripts/verify_source_isolation.py <results.json> --authorized customers,shared`。
- [ ] 写隔离要清楚：GBrain **不是"拒绝越权写并报错"，而是静默把写入路由到该凭证的 write_source**——Alice 想写 internal，东西落进 customers。排查核验实际落点，别等拒绝异常。
- [ ] scoped think 需 `--scopes "read write"`（think MCP 工具要 write scope，否则被拒）；调用带 `no_expand:true` 防多查询展开 bug(#1368)。

## 反模式

- ❌ 靠 prompt 让大模型"别检索敏感 source"做访问控制——它可能不听、无法机械验证；隔离必须在 SQL 层 `federated_read` 强制过滤。
- ❌ 把所有结果都检索出来再让大模型事后过滤敏感内容——工业反模式，越权数据已进了上下文。
- ❌ 用空库/无靶子库演示"搜不到绩效"当隔离成立——库里本就没 internal 是平凡为真；靶子必须真实存在且确实被 block 才有效。
- ❌ 越权写时干等一个拒绝异常——异常不会来，写被静默路由到注册的 write_source，要核验实际落点。
- ❌ 用 `import --source` 分租户——静默落 default 不报错，租户边界形同虚设；必须走基于 git 的 `gbrain sync`。

---

来源：赋范空间 大模型应用与开发实战课 - 编译式RAG第三节课：用 GBrain 搭建你的第二大脑（§7.1 团队 brain：内容与安全 · 配套《团队大脑部署指南》三环节 + 律所利益冲突墙迁移案例）。深度原理见课程知识库《多租户 RAG 访问控制》页。
