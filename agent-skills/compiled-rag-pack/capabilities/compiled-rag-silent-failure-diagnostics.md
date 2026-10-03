# GBrain 静默失败排错（跑通了但结果是错的）

## 何时使用

GBrain / 编译式管线**命令都 EXIT:0、看起来跑通了，但结果不对**时：查不到该有的页、图里缺边、
隔离没生效、调度器不触发、维度报错。这类失败**多数不抛异常、静默地错**——最独家、全网检索不到，按症状定位根因。

## 症状 → 根因 → 修复（按你看到的现象查）

**A. "库里明明有这页，却查不到 / 检索不可见"**
- 根因：sync 进来的新 chunk 没回填 embedding，对检索不可见。
- 修复：链上 `gbrain embed --stale`（幂等，只补没 embedding 的 chunk）。它也是网络故障的安全网——若某轮 embed 遇 SSL 抖动 7/10 失败，下一轮 `embed --stale` 会把掉队 chunk 补回到 100%。

**B. "图里该有的边没有 / extract 返回 0 条边且不报错"**
- 根因：wikilink 写成裸 `[[名字]]`，GBrain 链接正则只匹配 `[[目录/slug]]` 且目录须在白名单（people/companies/meetings/concepts…），裸名被静默忽略。
- 修复：全改带前缀 `[[people/garry-tan]]` 并建对应实体存根页（wikilink 必须指向真实存在的页）。原则：**显式声明 > 语义推断**，它不会猜"Garry Tan 就是 people/garry-tan"。
  改完后两步收尾：`gbrain put <slug>` 触发该页写入即重连（看 `auto_links` 的 removed/新增确认边真的长出来）；
  跑 `scripts/verify_source_immutability.py <项目目录>` 批量检出残余裸 slug，防漏网。

**C. "第一次 sync 根本没增量、比全量还慢，是不是坏了"**
- 根因：`gbrain import` 不建 git 书签，第一次 `sync --repo` **必然全量扫描**建 checkpoint。这是正确过渡不是 bug。
- 修复：无需修。真 O(diff) 增量发生在**第二次** sync 起。小规模下第一次因含 embedding 甚至更慢——增量价值在"建书签后每次只扫变化量"，大规模才见数量级优势。

**D. "macOS 上脚本一启动就被杀，日志见 EXIT:143"**
- 根因：EXIT:143 = 收到 SIGTERM。macOS crontab 是 setuid root，在非交互非 TTY 环境被系统直接 SIGTERM。
- 修复：改用 launchd LaunchAgent（用户级、无需 root、无需 TTY）；`launchctl load` 返回 `EXIT:0`、`launchctl list <Label>` 可见即装好。

**E. "调度器明明触发了（日志有时间戳），但每轮写入都 Operation not permitted"**
- 根因：launchd 跑在沙箱会话，对可移动盘（exFAT 外接 SSD/U 盘）无写权限；PGLite 的 WASM 运行时也在 exFAT 上报 `PGLite failed to initialize its WASM runtime`（exFAT 不支持 mmap/POSIX 文件锁，各种 workaround 无效）。
- 修复：源仓库与 brain 都放本机 APFS（macOS `/tmp` 也是 APFS）；别放外接 exFAT 盘。

**F. "cron 里一跑就找不到 gbrain / 连不上 Key，手动跑却正常"**
- 根因：cron/launchd 没有你登录 shell 的 PATH 与环境变量。
- 修复：脚本里 gbrain 用绝对路径（或手设 PATH），`GBRAIN_HOME` 与 API Key 必须显式 `export`。

**G. "写操作（注册客户端/写页）超时 Timed out waiting for PGLite lock"**
- 根因：PGLite 单写入引擎，`gbrain serve` 进程持有写锁，写操作撞锁。
- 修复：套路是**写操作前先停 serve → 写完重启 serve**；cron 脚本开头 `pkill -f "gbrain serve"`。

**H. "doctor 报 health 25~45/100，是不是建库失败了"**
- 根因：低分常来自 opt-in 功能未启用、schema coverage 不满、或 PGLite 模式跳过 Supabase 专属检查项（oversized_pages/scraper_junk_pages）——都是正常扣分。
- 修复：**只看 embeddings 是否 100% 覆盖 + 0 stale**。100% 即检索正常，低分是"优化空间"。真正要警惕的是 embeddings coverage 某天跌破 100%（schema drift 信号）。

**I. "ChromaDB 报 Collection expecting embedding with dimension of 1024, got 384"**
- 根因：用了 `collection.query(query_texts=...)`，ChromaDB 触发内置 all-MiniLM-L6-v2（384 维），与建库的 1024 维不匹配。
- 修复：改 `collection.query(query_embeddings=[<自己算的 1024 维向量>])`，把 embedding 显式握在手里。

**J. "DashScope embedding 报 400 BadRequestError"**
- 根因：`text-embedding-v3` 走 compatible-mode/v1 时 batch_size 上限是 **10**，一批传 20+ 文档就 400。
- 修复：自定义 embedding function 的 `__call__` 里把 batch_size 设为 10（不是 25）。

**K. "路由器/LLM 分类静默不生效，总走规则兜底"**
- 根因：DeepSeek 推理模型先在 `reasoning_content` 做链式推理（约 187 token），`max_tokens` 设太小（如 10/200）→ token 全耗在推理上、`content` 为空字符串 → 静默回落兜底。
- 修复：`max_tokens` 改 1500（推理约 187 + 输出余量）、timeout 60s。

**L. "跨域 both 查询 wiki 路 0 命中 / 多词查询 No results"**
- 根因：GBrain 的 BM25 对多词查询要求所有 token 全命中；跨域查询含 wiki 语料没有的 RAG 域词（"工单/incidents"）→ 0 命中；tokenmax autocut 遇低信号词还会把结果截空。
- 修复：这是预期行为——融合降级为 `rag_only` 单路并文档化"wiki 路无命中"；核心演示用纯 wiki 域词触发 full fusion。

**M. "用 import --source 分 source，页面却全落到 default"**
- 根因：`gbrain import --source <id>` 会静默忽略 `--source`，命令不报错但路由失效。
- 修复：source 路由必须走 `gbrain sync`（基于 git）；各 corpus 子目录先 `git init` + commit，再 `gbrain sync --source <id> --no-pull`；用 `gbrain sources status` 核验页数分布。

## 反模式

- ❌ 看到命令 EXIT:0 就当成功——这类失败恰恰在退出码为 0 时静默出错，必须核验实际产物（边数、source_id、embeddings 覆盖率）。
- ❌ 看到低 health_score 或"第一次 sync 没增量"就推倒重建——先判 embeddings 是否 100%、是否第二次 sync，多半是预期现象。
- ❌ 把静默失败归咎于 macOS 版本 bug 或玄学——EXIT:143 是 SIGTERM、exFAT 是文件系统限制、0 边是前缀问题，每一条都有确定根因。
- ❌ 靠反复 `curl` 测 Key 排 import auth fail——多 brain 下 `gbrain config set` 写进默认 `~/.gbrain` 而非 `GBRAIN_HOME` 的库，要把 `provider_base_urls` 直接写进目标 brain 的 config.json。

---

来源：赋范空间 大模型应用与开发实战课 - 编译式RAG第三节课：用 GBrain 搭建你的第二大脑（配套《自动化增量管线部署指南》§8 踩坑小结 · 《混合架构实现指南》§7.3 · 《团队大脑部署指南》踩坑速查表）。速查见 references/gbrain-cli-and-pitfalls.md。
