# 搭多源自动化增量编译管线（cron / launchd）

## 何时使用

知识源**持续在变、来自多个地方、想无人值守地被吸收进库**（笔记每天写、工单每天来、会议每天开）时，
把「多源进场 → 增量编译 → 定时调度 → 健康巡检」固化成一条自己运转的流水线。库若基本一次性建好、偶尔手动 `gbrain import` 就够——**不要上这条管线**（过度工程）。

## 核心流程

一条完整管线是把已会的零件串成一台能持续运转的机器，四个环节强依赖、顺序不能乱：

```
多个数据源 → 一个 git 源仓库 → 增量 sync → embed --stale → self-wiring extract → doctor 自检
(笔记/邮件/会议)   (源真相·APFS)   (只编译变化页)  (回填向量·安全网)  (零 LLM 建图)      (健康巡检)
                        ↑ 调度器 launchd(mac)/cron(linux) 定时触发
```

**环节 1 · 多源进场**
- [ ] 专用 brain 与日常库隔离：`GBRAIN_HOME=~/.gbrain-pipeline`（**必须本机 APFS 路径**，不放外接 exFAT 盘，见诊断能力）。
- [ ] init 时**显式指定 embedding 维度**：`reinit-pglite --embedding-model dashscope:text-embedding-v3 --embedding-dimensions 1024 --yes`——否则会默认检测 `OPENAI_API_KEY` 用 1536 维，维度对不上后续 embed 报错。
- [ ] 每个连接器把一类源转成带 frontmatter 的 markdown 写进 git 源仓库子目录；留 `--start-idx` 增量接口避免重名。
- [ ] wikilink 全写带目录前缀 `[[people/garry-tan]]` 并建对应实体存根页——裸 `[[名字]]` 会静默 0 边（前缀红线见约束能力）。
- [ ] 建 baseline：`gbrain import <repo> --no-embed` → `gbrain embed --stale` → `gbrain extract all` → `gbrain doctor --json > doctor-baseline.json`。

**环节 2 · 增量编译（每轮的核心链，一步不能省）**
```bash
git -C "$REPO" add --all && git -C "$REPO" commit -m "cycle $(date +%s)" || true  # 没 commit 的文件不会被 sync
gbrain sync --repo "$REPO" --no-pull --retry-failed --yes   # 增量：git diff 只编译变化页
gbrain embed --stale       # 链式必须：新 chunk 不回填 embedding 对检索就不可见
gbrain extract --stale     # self-wiring 自动建图
```
- `sync --repo` 靠 git commit 为锚点判断"哪些文件变了"；**第一次 sync 必然全量扫描建 checkpoint，第二次起才真 O(diff) 增量**（不是 bug，见诊断能力）。
- 幂等：源无变化时 sync 返回 "Already up to date"（O(1) git HEAD 比较），可放心让调度器反复触发。

**环节 3 · 定时调度**
- [ ] 写一个 cron 包装脚本（骨架见 `assets/cron-pipeline.sh.template`）：开头 `pkill -f "gbrain serve"`（PGLite 单写入防写锁）、**显式 export** `GBRAIN_HOME`/Key/PATH（cron 无 shell 上下文）、路径含空格加引号。
- [ ] **macOS 用 launchd LaunchAgent，不用 crontab**（crontab 在非 TTY 被 SIGTERM 杀掉，见诊断能力）；plist 模板见 `assets/launchd-pipeline.plist.template`。
- [ ] `StartInterval` 生产改 900（15 分钟）以上，演示用的 120 秒不要上生产。
- [ ] `launchctl load` 返回 `EXIT:0` 且 `launchctl list <Label>` 可见 = 调度器装好。

**环节 4 · 健康巡检**
- [ ] 每轮 `gbrain doctor --json 2>/dev/null > doctor-$(date +%s).json`（`2>/dev/null` 保证纯 JSON，否则 jq 解析被 phase 日志污染）。
- [ ] 判读核心指标：**只看 embeddings 是否 100% 覆盖**——100% 即检索正常，低 health_score 是"优化空间"不是"损坏"（见诊断能力）。

**校验环（部署后必过，证明闭环没断）**：写一篇含独特关键词的探针文档 → 跑一轮管线 → `gbrain query "独特关键词" --no-expand` 命中即闭环成立。让它连跑 ≥3 轮，看页数/边数单调净增 = 持续生长的字面证据。一键跑 Run `scripts/check_pipeline_health.py doctor-latest.json`（断言 embeddings 100% 且 0 stale，红项先修）。

## 反模式

- ❌ 把源仓库放外接 exFAT SSD/U 盘——launchd 沙箱对可移动盘无写权限，每轮静默 `Operation not permitted`。源仓库与 brain 都放本机 APFS（`~/` 下）。
- ❌ cron 脚本里省掉 `embed --stale`——sync 进来的新 chunk 不回填 embedding 就"库里有页查不到"，它还是网络故障时的幂等安全网。
- ❌ 连接器写了文件却没 `git commit` 就指望被 sync——增量 sync 以 git commit 为锚点，没 commit 的文件对 sync 根本不存在。
- ❌ 把这条管线当"配一次永久不管"——它能无人值守地**运转**，但不能无人值守地**保持健康**；低入库成本是用持续的 schema 纪律与格式维护换来的，set-and-forget 是神话。

---

来源：赋范空间 大模型应用与开发实战课 - 编译式RAG第三节课：用 GBrain 搭建你的第二大脑（§7.3 cron 自动化编译管线 · 配套《自动化增量管线部署指南》四环节）。深度原理见课程知识库《编译式 RAG 自动化管线》页。
