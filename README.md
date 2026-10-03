# FF - LLM Wiki知识库

![FF - LLM Wiki知识库 Logo](docs/assets/brand/ff-llm-wiki-logo.png)

FF - LLM Wiki知识库是一个以知识问答为默认入口、以知识图谱为重点视觉页面的
个人知识系统。仓库内部目录名保留为 `LlmWikiKnowledge`。

项目当前不覆盖企业级知识管理的全部能力，
而是在受控范围内完成一条真实、可运行、可验证的知识生产链路，
并以高完成度的前端和精美的知识图谱呈现结果。

## 当前状态

- 阶段：M0/M1 离线旅程、M2 DOCX、高可信扫描 PDF 与低质量页人工复核已通过隔离测试；真实 DeepSeek 验收未完成
- PRD：v0.3.15；产品 Spec：v0.3.14；技术计划：v1.0.14
- 技术栈：React + TypeScript + Vite；Python 3.12 + FastAPI；SQLite + 文件存储；DeepSeek 与 OpenAI 兼容在线服务
- 默认启动建立空白个人库；仅在测试模式同时设置 `LMWK_SEED_FIXTURE=true` 才载入企业 fixture
- 企业 fixture：66 来源、72 版本、150 知识、450 关系、1112 证据，仅供显式回归；不得作为个人资料自动导入
- 目标范围：Windows 单用户，从空白库导入 Java/Python/Agent 的 Markdown、DOCX 及文本/扫描 PDF；旧 `.doc` 不使用；具体差距见 `docs/acceptance/m0-baseline.md`

## 核心产品链路

```text
进入知识问答
  → 没有知识时导入资料
  → 编译为知识页面、实体和关系
  → 轻量审核并发布当前知识版本
  → 返回问答并获得带引用的回答
  → 阅读知识、查看来源或探索知识图谱
```

知识图谱是产品的核心展示界面，
不是与知识数据分离的装饰性页面。
图中的节点、关系、详情和问答引用必须来自同一套知识对象与来源证据。

## 一级功能

- 知识问答：默认入口、推荐问题、问题相关证据排序、带引用回答、刷新重连与停止后的手动重试。
- 资料管理：上传、在线查看、实时编译、处理记录和轻量审核。
- 知识页面：知识目录、专业 Markdown 阅读和来源追溯。
- 知识图谱：节点、关系、证据和问答联动。
- 问答质量：真实回答与失败记录、引用核对和持久化人工核查。
- 设置：在线配置、连接测试与切换、本地模型未接入说明、明暗主题及完整项目备份恢复。

编译、审核、来源详情、引用详情和问题检查属于上述页面内能力，
不增加一级导航。

## 项目结构

```text
LlmWikiKnowledge/
├── frontend/   # 前端应用与视觉交互
├── backend/    # 资料、知识编译、图谱与问答能力
├── fixtures/   # 内置来源、预置知识快照、图谱投影和评测数据
├── docs/       # PRD、后续 Spec、技术方案和设计文档
├── AGENTS.md   # 项目级 Codex 协作约束
└── README.md   # 项目入口说明
```

## 文档入口

- [MVP 产品需求文档](docs/specs/0001-llm-wiki-knowledge-mvp/prd.md)
- [MVP 产品功能与交互 Spec](docs/specs/0001-llm-wiki-knowledge-mvp/spec.md)
- [企业客户服务内置知识数据 Spec](docs/specs/0002-enterprise-customer-service-built-in-data/spec.md)
- [MVP 技术架构与实施计划](docs/architecture/0001-lmvk-mvp-technical-plan.md)
- [品牌使用规范](docs/design/brand.md)
- [内置知识数据入口](fixtures/enterprise-customer-service/README.md)

## 当前范围原则

- 展示优先：视觉品质、知识图谱和核心旅程优先于功能广度。
- 视觉方向：所有用户可见工作区继承明暗双主题，采用 Apple 启发的简洁、克制设计语言。
- 效果方向：专业命名和清晰层级不等于清淡化；问答与图谱优先复用项目内模板源码，
  保留流式、引用联动、来源展开、3D 空间、节点光效、关系流动和镜头聚焦。
- 产品命名：使用真实任务、业务对象、动作和状态名称，不采用模板名、隐喻包装或非必要实现术语。
- 品牌名称：所有用户可见产品名统一为 `FF - LLM Wiki知识库`；脚标或研发署名统一为
  `@2026 赋范空间 独家自研`；标志使用项目内批准的原始品牌资产。
- 链路真实：内置知识数据可以预先准备，
  图谱和回答必须从正式知识对象与来源证据生成，不允许使用独立硬编码结果。
- 测试数据：企业 fixture 的预编译快照仅供显式回归，个人库启动不应加载；
  所有来源、知识、图谱和引用仍须共用正式后端数据契约。
- 模型边界：MVP 保留 DeepSeek，增加一条可切换的 OpenAI 兼容在线服务；本地模型只交付明确未接入的前端形态，
  不做后端连接、测试或假成功反馈。
- 实现边界：除本地模型连接明确不在当前范围外，上传、编译状态、审核、阅读、图谱和问答
  都必须由真实后端驱动并进入测试。
- 治理轻量：保留来源、审核、错误提示和基础数据控制，
  不建设重型治理平台。
- 技术基线：实现必须遵循已批准技术计划；如需更改框架、存储、任务或模型边界，先更新决策文档。

## Windows 基线命令

在 `frontend/` 运行 Node.js 24 与 pnpm 11.9.0 的 `pnpm install --frozen-lockfile`、
`pnpm run typecheck`、`pnpm run test`、`pnpm run build`。在项目根目录运行
`node fixtures/enterprise-customer-service/tools/validate-fixture.mjs`。
在 `backend/` 运行 Python 3.12 与 uv 的 `uv sync --locked`、`uv run pytest -q`；
完成前端构建后执行 `uv run uvicorn app.main:app --host 127.0.0.1 --port 8766`，
打开 `http://127.0.0.1:8766`。默认个人数据位于 `data/personal/`，与初始企业基线
数据库 `data/app.db` 隔离；不要清除已有目录或把测试 fixture 写入个人库。
完整结果、环境前提和未验收项见 `docs/acceptance/m0-baseline.md`。

项目备份在设置的“项目数据”中导出或恢复，包含原件和历史知识、审核、对话及引用。
恢复先校验再确认替换，不合并项目；不携带 API 凭据、在线连接及外观配置，保留本机配置。
知识或回答正在生成时需先完成或停止任务，待审核记录可备份。备份包最多 64 MiB，
展开内容最多 256 MiB；数据较多时应定期备份，恢复不调用在线模型。

不要将 API Key 粘贴到聊天、文档或提交记录。目标凭据存储为 Windows Credential Manager；
在其读写和错误处理通过验收前，不宣称产品密钥管理已经可交付。M0 不调用真实 DeepSeek API。

## Windows 本机 OCR

当前机器已在忽略的 `data/toolchain/ocr/` 验证 Tesseract 5.5.3 与 `eng`、`chi_sim`；其他机器不会随源码获得此目录。若已安装 conda，可在仓库根目录运行：

```powershell
$env:CONDA_PKGS_DIRS = "$PWD/data/toolchain/conda-pkgs"
conda create --prefix "$PWD/data/toolchain/ocr" -c conda-forge --override-channels tesseract=5.5.3 --yes
```

默认读取项目本地 `Library/bin/tesseract.exe` 和 `share/tessdata`；也可通过 `LMWK_OCR_EXECUTABLE`、`LMWK_OCR_DATA_DIR` 指定已验证的本机路径。缺引擎/语言数据、渲染或识别超时仍使导入失败。识别文字不足 40 个非空白字符或原始分数低于 65 的页面保存为待核对来源，提交全部待核对页的人工文字后才开始编译；未核对内容不会进入知识或问答。原件不变，知识/引用显示人工校对标记和原始机器分数。跨机器分发原生工具链前须核查其第三方许可证。

## 下一步

1. 核查其他 Windows 机器上的 OCR 工具链部署、语言数据和许可；旧 `.doc` 不在范围内。
2. 验证 Windows Credential Manager 的真实写入、读取、替换及不可用情况。
3. 经预算确认后验证 DeepSeek 真实编译和带引用问答，再验收六模块完整旅程。
