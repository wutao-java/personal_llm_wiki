# LlmWikiKnowledge Project Instructions

## Project Purpose

The user-facing product name is `FF - LLM Wiki知识库`. It is a product-first
LLM Wiki knowledge question-answering system.
Its default entry is cited knowledge question answering, supported by real source
management, compiled Markdown knowledge pages, an explorable knowledge graph, and
a real DeepSeek connection and a switchable OpenAI-compatible online service. The local-model settings area is a clearly labeled
frontend-only configuration state in MVP and is not a working model connection.

The current goal is a complete working MVP with real product paths and bounded scope,
not an enterprise knowledge-management platform.

## Brand Identity

- Use `FF - LLM Wiki知识库` exactly in every user-visible product-name position. Preserve
  capitalization, the single spaces around the hyphen, and no space between `Wiki` and
  `知识库`.
- `LlmWikiKnowledge` is the repository and internal engineering identifier only. Do not
  expose it or `LMVK` as the product name in navigation, browser titles, loading states,
  empty states, errors, or About content.
- The approved logo source is `docs/assets/brand/ff-llm-wiki-logo.png`. Preserve its square
  black canvas, white artwork, aspect ratio, and colors. Do not redraw, invert, recolor,
  crop, stretch, or add decorative effects. Use the same source artwork in both themes.
- Whenever a footer, copyright line, About attribution, exported artifact attribution, or
  product footnote is present, use `@2026 赋范空间 独家自研` exactly. Do not silently
  replace `@` with a copyright symbol or translate the text.
- Follow `docs/design/brand.md` for placement, accessibility text, source checksum, and
  light/dark-theme presentation. A collapsed sidebar may show only the logo; any textual
  product-name treatment must use the full approved name.

## Current Phase

- M0 Windows baseline is recorded in `docs/acceptance/m0-baseline.md`. M1 empty
  startup, first-snapshot publication, personal browser empty states, freeform topics,
  offline two-page PDF evidence, browser page navigation, legacy database migration,
  persisted review recovery, and an offline full browser journey have tests. Real
  DeepSeek compilation and cited answering remain unverified.
- The governing PRD is `docs/specs/0001-llm-wiki-knowledge-mvp/prd.md` v0.3.15,
  product Spec is v0.3.14, and technical plan is
  `docs/architecture/0001-lmvk-mvp-technical-plan.md` v1.0.14.
- Evidence ranking, persisted answer cancellation/startup recovery, and logical ZIP
  backup/restore have offline tests. Restore replaces project data only after explicit
  confirmation and preserves local model/appearance settings and immutable originals.
- M2 DOCX upload, table-row evidence, original download, and offline browser cited
  answering have tests. Legacy `.doc` is out of scope. Local high-confidence English/
  Chinese scanned PDF OCR and offline Edge citations pass; low-quality page correction
  and review-to-compile also pass isolated offline tests.
- The personal product must start empty on Windows. Bundled enterprise data is for
  explicit offline regression only, not a default source or answer path. Real DeepSeek
  and Windows credential-store acceptance remain open; see `docs/acceptance/m0-baseline.md`.

## Confirmed Technical Baseline

- Build a local-first Web application. Use Node.js 24 LTS, pnpm 11, React, TypeScript, and
  Vite for the frontend; use uv-managed Python 3.12, FastAPI, SQLAlchemy, SQLite, and
  filesystem-backed immutable sources for the backend. Do not use the macOS system Python
  for project dependencies.
- Use REST for resource operations and persisted SSE events for compilation and answer
  streaming. Do not fake progress with frontend timers.
- The current graph implementation uses `3d-force-graph` with Three.js; preserve the
  real `GraphProjection` contract. Any library switch requires a deliberate decision
  and visual regression tests.
- Support DeepSeek and one switchable OpenAI-compatible online service in MVP. Store
  their separate API credentials outside normal database responses and logs as defined
  by the technical plan.
- The local-model settings area is frontend-only: label it as not yet connected, make no
  backend request, and never show fake save, test, default, or success states.
- Do not add LangChain, LangGraph, GBrain, Celery, Redis, a vector database, or a graph
  database unless an approved technical-plan change requires it.

## Repository Layout

- `frontend/`: user-facing application, visual system, graph interaction, reader, and
  question-answering presentation.
- `backend/`: source management, knowledge compilation, review state, graph data,
  retrieval, and cited-answer services.
- `docs/`: product requirements, feature specs, architecture decisions, technical plans,
  design contracts, and acceptance evidence.
- `fixtures/`: versioned bundled source corpora, reproducible Codex reference
  compilation, preset snapshots, and evaluation data. Runtime product code must not live
  here.

Keep product code inside `frontend/` or `backend/`. Keep generated planning documents and
decision records inside `docs/`. Keep bundled knowledge data and its non-runtime
authoring checks inside `fixtures/`.

## Product Priorities

Apply this priority order when scope or implementation choices conflict:

1. Complete the real core product journey.
2. Deliver exceptional frontend polish and graph legibility.
3. Make the knowledge graph a first-class working surface.
4. Preserve source provenance and cited answers.
5. Keep review, quality governance, and data control lightweight but functional.
6. Add breadth only after the preceding items pass acceptance.

## Core Journey Contract

The P0 journey is:

```text
project entry
  → cited question-answering default
  → source import when knowledge is empty
  → visible compilation state
  → generated knowledge and relations
  → lightweight review
  → return to cited question answering
  → knowledge/source reading
  → graph exploration
```

For every implementation change touching this journey, account for:

- entry and exit paths;
- loading, empty, partial, success, and error states;
- affected source, page, entity, relation, and review state;
- transitions between graph, reader, source evidence, and answer;
- visible recovery when processing fails;
- the observable result used in product acceptance.

## Knowledge and Graph Boundaries

- Original sources are evidence and must not be silently rewritten.
- Compiled knowledge must retain a traceable source relationship.
- Graph nodes, edges, reader pages, and answer citations must use the same knowledge
  identities and relationship semantics.
- Do not build a separately hard-coded visual graph that can drift from compiled
  knowledge.
- Graph layout and visual effects are presentation concerns; graph meaning and evidence
  are product contracts.
- Derived search or graph indexes must be rebuildable from retained project data.

## Product and UI Rules

- Treat cited question answering as the default product entry after launch.
- Keep exactly six primary navigation modules for MVP: knowledge question answering,
  source management, knowledge pages, knowledge graph, answer quality, and settings.
- Treat the graph as the primary visual exploration experience after knowledge is available.
- Do not interpret professional naming, Apple-inspired hierarchy, or dual themes as a
  request to flatten the visual experience. Preserve purposeful streaming, citation,
  source-panel, 3D, node-lighting, relation-flow, and camera-focus effects.
- When implementing the question-answering and graph pages, prefer adapting the selected
  source assets and shared layers in the two project-local frontend Skills. Replace their
  sample data, gallery copy, and non-production hooks with the project's real contracts; do not discard
  mature visual or interaction code without a documented incompatibility.
- A bundled baseline dataset is allowed for repeatable acceptance, but it must pass through the same
  import and compilation contracts as user-provided material.
- Bundled enterprise fixture data is retained only for explicit offline regression.
  The personal product starts empty, including after restart or clear. Any regression
  seed must use the same source/evidence/knowledge contract and never become the
  default source or answer path. Later uploads use the current verified online model
  configuration for the real compilation journey.
- Except for the explicitly frontend-only local-model area, every P0 action and visible
  state must use a real backend path and be tested. Do not accept frontend-generated business results,
  hard-coded graph data, fixed answers, fake progress, or hidden fixture-only page paths.
- Do not leave dead buttons, decorative controls, fake progress, or success states that
  bypass the real journey.
- Never use `演示`, `模拟`, `虚构`, `Demo`, or `Mock` in user-visible product copy, bundled
  Markdown, knowledge pages, source excerpts, browser titles, loading/empty/error states,
  or README product descriptions. Internal test identifiers may remain technical, but they
  must never be returned as product copy. Describe the bundled corpus as `内置知识数据`.
- Cover loading, empty, partial, selected, focused, and error states in the visual design.
- Prefer depth within the core journey over adding disconnected top-level pages.

## Product Language and Naming

- Treat naming as a product contract. Derive every user-visible name from the user's
  real task, a real business object, an available action, or an observable system
  state.
- Apply this rule to navigation, pages, modules, panels, dialogs, forms, buttons,
  fields, statuses, prompts, empty and error messages, graph legends, node and relation
  types, and the corresponding business components, routes, states, and events in code.
- Prefer established, literal terms such as “资料”, “知识”, “知识图谱”, “来源”,
  “引用”, “审核” and “知识问答”, and verb-object actions such as “导入资料”,
  “重新编译” and “查看来源”. A name should state what the object is, what the action
  does, or what has happened.
- Do not invent metaphorical, promotional, mysterious, or model-generated terminology
  to package ordinary functionality. Names such as “驾驶舱”, “XX 舱”, “星空”,
  “深空”, “宇宙”, “中枢”, “大脑” or “魔法” must not be used as product modules,
  components, modes, actions, or statuses.
- Keep implementation terminology such as RAG, embedding, token, model, index, and
  snapshot inside technical documentation, diagnostics, or explicitly technical user
  contexts. Translate it into clear task language in the normal product interface.
- Skill names, template names, and gallery labels are internal source references only.
  Never copy them into product navigation, headings, controls, or user-facing copy.
- Use one stable name for one product concept across PRD, Spec, UI, data contracts, and
  acceptance evidence. When a name changes, align only the directly governed journey
  and do not leave competing aliases.
- Reject a name during review if a target user must understand an implementation detail,
  decode a metaphor, or learn invented vocabulary before knowing what it does.

## Documentation Boundaries

- PRDs define user value, behavior, scope, and acceptance; they do not select frameworks,
  libraries, databases, or deployment topology.
- Record technical choices and changes in
  `docs/architecture/0001-lmvk-mvp-technical-plan.md` or a later architecture decision.
- When a product decision changes, update the governing document before or with the
  implementation.
- Preserve requirement IDs from PRD through Spec, implementation tasks, and acceptance
  evidence.

## Commands

- Root: `node fixtures/enterprise-customer-service/tools/validate-fixture.mjs`.
- `backend/`: `uv sync --locked`, `uv run pytest -q`, `uv run ruff check app tests`.
- `frontend/`: `pnpm install --frozen-lockfile`, `pnpm run typecheck`,
  `pnpm run test`, `pnpm run build`.
- Run under Python 3.12, Node.js 24 and pnpm 11.9.0. Real DeepSeek requests are not
  part of M0 tests. See `docs/acceptance/m0-baseline.md` for actual results.

## Definition of Done

A feature is done only when:

- its behavior traces to an approved requirement and acceptance criterion;
- the relevant normal, loading, empty, and error states are implemented;
- affected graph, reader, source, and answer representations stay consistent;
- the narrowest relevant automated checks pass;
- the affected core journey is exercised without manual data edits or hidden shortcuts;
- visual work is reviewed at the project's target desktop viewport;
- documentation is updated when behavior or project commands change.

## Project Skills

### compiled-rag-pack

凡是把资料编译成可读、可互链的 Wiki、知识图谱或个人知识库，
搭建增量编译管线，排查“改了源还答旧值”等问题，
或进行传统 RAG、编译式 Wiki、知识图谱范式选型时，
使用 `compiled-rag-pack`。

技能入口：`agent-skills/compiled-rag-pack/SKILL.md`

### chatbot-frontend-templates-pack

凡是我点名要做对话产品前端（Chatbot / RAG 溯源 / Agent 链路 / 生成式 UI /
画布 / 深研 / 分支 / 多智能体）、按“信任来自哪”选模板、搬共享层骨架起步、
接真后端换钩子，或排查对话前端渲染故障时，
使用 `chatbot-frontend-templates-pack`。

技能入口：`agent-skills/chatbot-frontend-templates-pack/SKILL.md`

### knowledge-graph-viz-pack

凡是我点名要优化 / 美化 / 升级已有知识图谱的前端展示、在十种可视化范式间选型、
把项目真实图谱数据适配进展厅模板，或排查图谱页白屏 / 过曝 / 发虚这类任务时，
使用 `knowledge-graph-viz-pack`。

技能入口：`agent-skills/knowledge-graph-viz-pack/SKILL.md`
