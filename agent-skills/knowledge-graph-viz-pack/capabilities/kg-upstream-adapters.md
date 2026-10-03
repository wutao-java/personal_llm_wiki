# 上游图谱产物 → data.js 适配配方

## 何时使用

用户项目里已经有图谱产物（GraphRAG 跑出的 JSON、GBrain 的 wiki 互链、通用边表），要把它接进星图馆时。识别形态 → 按映射配方生成 data.js，再回到 kg-data-contract-adaptation 套模板。

> 单向耦合原则：适配知识只存在于本包。上游包（compiled-rag-pack / rag-graphrag-pack …）对本包保持零感知，不把本包引用写回上游。

## 核心流程

先识别用户项目里图谱产物的形态，再按对应配方映射。按适配优先级（从最规整到兜底）：

1. **rag-graphrag 自建线（最规整）**：`output/kg_nodes.json` + `kg_edges.json`
   - 节点 `{id,name,type,source_doc,char_start,char_end,confidence,page}`
   - 边 `{source,target,relation:CO_OCCURS_IN,doc_id,page}`（无向共现，src<tgt 去重）
   - 映射：`type` → DOMAINS（≤8 个，超出把长尾合并为 `other`）、`name` → node.name、边直转 links。

2. **MS GraphRAG 官方 CLI**：`output/*.parquet` 五表
   - `entities` → 节点、`relationships` → 边、`communities` 可作 DOMAINS 分类来源。

3. **compiled-rag / GBrain**：`wiki/*.md`（frontmatter `title/type/sources/updated`）
   - 边 = 正则解析 `[[目录/slug]]` wikilink（有向）；或用 `gbrain graph-query` / `backlinks` 取边。
   - 映射：`type` → DOMAINS、页 → 节点、wikilink → links。

4. **通用兜底**：任意 JSON/CSV 边表 `source,target[,weight]` + 可选节点表。

5. **对账收口**：映射后 `nodes.length` / `links.length` 与源产物计数一致；补 degree 与 byId.index；DOMAINS 超 8 先合并再落 data.js。
6. **校验→修复→重试**：接入起服务看图；图例撞色/爆表→DOMAINS 未合并到 ≤8；节点大小失真→weight 全置 1 或没预计算 degree，回上一步补齐。

## 不是图谱来源（要明说）

**multimodal-ocr 的版面产物不是图谱数据源**：它是 block / bbox / 向量 chunk，没有节点-边结构。遇到这类产物直接告诉用户"这不是图谱数据，星图馆需要节点+边"，**不无中生有硬造**。

## 反模式

- ❌ 把 OCR block / 向量 chunk 硬造成"图谱"——上游没有节点-边结构就明说，不无中生有。
- ❌ DOMAINS 超过 8 个不合并——调色板只有 8 色，超出即撞色、图例爆表。
- ❌ 丢 weight / degree：边权重直接置 1、不预计算度数——节点大小失真。
- ❌ 把本包引用写回上游包——适配知识只留在本包，上游对本包零感知。

---

来源：赋范空间 · 知识图谱可视化星图馆（上游产物适配 · GraphRAG / GBrain / 通用边表映射配方）。
