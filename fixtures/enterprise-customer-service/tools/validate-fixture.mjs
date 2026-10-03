import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const failures = [];
const notes = [];
const forbiddenProductPhrasing = /演示|模拟|虚构|\bDEMO\b|\bMOCK\b/i;

function fail(message) {
  failures.push(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function loadJson(relativePath) {
  return JSON.parse(readFileSync(path.join(ROOT, relativePath), "utf8"));
}

function sha256(content) {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

function walk(directory) {
  const absolute = path.join(ROOT, directory);
  if (!existsSync(absolute)) return [];
  const output = [];
  for (const entry of readdirSync(absolute, { withFileTypes: true })) {
    const relative = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...walk(relative));
    else output.push(relative.split(path.sep).join("/"));
  }
  return output.sort();
}

function validateSnapshot(snapshotPath, graphPath, expected) {
  const snapshot = loadJson(snapshotPath);
  const graph = loadJson(graphPath);
  const knowledgeIds = new Set(snapshot.knowledgeItems.map(item => item.knowledgeId));
  const relationIds = new Set(snapshot.relations.map(item => item.relationId));
  const evidenceById = Object.fromEntries(snapshot.evidenceFragments.map(item => [item.evidenceId, item]));
  const sourceVersionIds = new Set(snapshot.sourceVersions.map(item => item.sourceVersionId));
  const sourceIds = new Set(snapshot.sourceVersions.map(item => item.sourceId));

  assert(snapshot.counts.sourceVersions === expected.sources, `${snapshot.snapshotId} 来源数量不等于 ${expected.sources}`);
  assert(snapshot.counts.knowledgeItems === expected.nodes, `${snapshot.snapshotId} 知识数量不等于 ${expected.nodes}`);
  assert(snapshot.counts.relations === expected.edges, `${snapshot.snapshotId} 关系数量不等于 ${expected.edges}`);
  assert(snapshot.knowledgeItems.length === expected.nodes, `${snapshot.snapshotId} knowledgeItems 数组长度错误`);
  assert(snapshot.relations.length === expected.edges, `${snapshot.snapshotId} relations 数组长度错误`);
  assert(knowledgeIds.size === snapshot.knowledgeItems.length, `${snapshot.snapshotId} knowledgeId 不唯一`);
  assert(relationIds.size === snapshot.relations.length, `${snapshot.snapshotId} relationId 不唯一`);
  assert(Object.keys(evidenceById).length === snapshot.evidenceFragments.length, `${snapshot.snapshotId} evidenceId 不唯一`);
  assert(snapshot.compiledBy.agent === "Codex", `${snapshot.snapshotId} 未记录 Codex 预编译身份`);

  for (const item of snapshot.knowledgeItems) {
    assert(item.sourceIds.length > 0, `${item.knowledgeId} 没有来源`);
    assert(item.sourceIds.every(id => sourceIds.has(id)), `${item.knowledgeId} 引用了快照外 sourceId`);
    assert(item.sourceVersionIds.length > 0, `${item.knowledgeId} 没有来源版本`);
    assert(item.sourceVersionIds.every(id => sourceVersionIds.has(id)), `${item.knowledgeId} 引用了快照外 sourceVersionId`);
    assert(item.evidenceIds.length > 0, `${item.knowledgeId} 没有定义证据`);
    assert(item.evidenceIds.every(id => evidenceById[id]), `${item.knowledgeId} 引用了快照外 evidenceId`);
    assert(existsSync(path.join(ROOT, item.markdownPath)), `${item.knowledgeId} 的 Markdown 页面不存在`);
  }

  for (const relation of snapshot.relations) {
    assert(knowledgeIds.has(relation.sourceKnowledgeId), `${relation.relationId} 来源端点悬空`);
    assert(knowledgeIds.has(relation.targetKnowledgeId), `${relation.relationId} 目标端点悬空`);
    assert(relation.sourceKnowledgeId !== relation.targetKnowledgeId, `${relation.relationId} 是自环`);
    assert(relation.evidenceIds.length > 0, `${relation.relationId} 没有证据`);
    assert(relation.evidenceIds.every(id => evidenceById[id]), `${relation.relationId} 引用了快照外 evidenceId`);
    assert(relation.weight > 0, `${relation.relationId} 权重无效`);
  }

  for (const evidence of snapshot.evidenceFragments) {
    assert(sourceVersionIds.has(evidence.sourceVersionId), `${evidence.evidenceId} 来源版本不在快照中`);
    const absolute = path.join(ROOT, evidence.path);
    assert(existsSync(absolute), `${evidence.evidenceId} 来源文件不存在`);
    if (!existsSync(absolute)) continue;
    const content = readFileSync(absolute, "utf8");
    assert(content.slice(evidence.charStart, evidence.charEnd) === evidence.quote, `${evidence.evidenceId} 字符范围不能还原原文`);
  }

  assert(graph.snapshotId === snapshot.snapshotId, `${snapshot.snapshotId} 图谱快照身份不一致`);
  assert(graph.nodes.length === snapshot.knowledgeItems.length, `${snapshot.snapshotId} 图谱节点未与知识对账`);
  assert(graph.edges.length === snapshot.relations.length, `${snapshot.snapshotId} 图谱关系未与知识对账`);
  assert(graph.domains.length <= 8, `${snapshot.snapshotId} 图谱领域超过 8 个`);
  assert(new Set(graph.nodes.map(node => node.id)).size === graph.nodes.length, `${snapshot.snapshotId} 图谱节点 ID 不唯一`);
  assert(graph.nodes.every(node => knowledgeIds.has(node.knowledgeId)), `${snapshot.snapshotId} 图谱存在独立节点`);
  assert(graph.edges.every(edge => relationIds.has(edge.relationId)), `${snapshot.snapshotId} 图谱存在独立关系`);

  const degree = Object.fromEntries(graph.nodes.map(node => [node.id, 0]));
  let crossDomain = 0;
  for (const edge of graph.edges) {
    assert(degree[edge.source] !== undefined && degree[edge.target] !== undefined, `${edge.relationId} 图谱端点悬空`);
    degree[edge.source] += 1;
    degree[edge.target] += 1;
    if (graph.byId[edge.source].domainId !== graph.byId[edge.target].domainId) crossDomain += 1;
  }
  for (const node of graph.nodes) {
    assert(node.degree === degree[node.id], `${node.id} 的 degree 预计算错误`);
  }
  const averageDegree = graph.edges.length * 2 / graph.nodes.length;
  const crossRatio = crossDomain / graph.edges.length;
  assert(averageDegree >= 5 && averageDegree <= 7, `${snapshot.snapshotId} 平均度数 ${averageDegree.toFixed(2)} 不在 5～7`);
  assert(crossRatio >= 0.18 && crossRatio <= 0.25, `${snapshot.snapshotId} 跨领域比例 ${crossRatio.toFixed(3)} 不在 18%～25%`);
  assert(Object.values(degree).every(value => value > 0), `${snapshot.snapshotId} 存在孤立节点`);
  notes.push(`${snapshot.snapshotId}: ${graph.nodes.length} 节点 / ${graph.edges.length} 关系 / 平均度 ${averageDegree.toFixed(2)} / 跨领域 ${(crossRatio * 100).toFixed(1)}%`);
}

const manifest = loadJson("corpus-manifest.json");
assert(manifest.counts.baseSourceVersions === 60, "基础来源版本不是 60");
assert(manifest.counts.updateSourceVersions === 12, "更新来源版本不是 12");
assert(manifest.counts.totalSourceVersions === 72, "总来源版本不是 72");
assert(manifest.files.length === 72, "来源清单文件数不是 72");
assert(new Set(manifest.files.map(item => item.sourceVersionId)).size === 72, "sourceVersionId 不唯一");

const rawFiles = walk("raw").filter(file => file.endsWith(".md"));
assert(rawFiles.length === 72, `raw/ Markdown 应为 72，实际 ${rawFiles.length}`);
assert(new Set(manifest.files.map(item => item.path)).size === rawFiles.length, "清单路径不唯一或缺失");

for (const entry of manifest.files) {
  const absolute = path.join(ROOT, entry.path);
  assert(existsSync(absolute), `来源文件不存在：${entry.path}`);
  if (!existsSync(absolute)) continue;
  const content = readFileSync(absolute, "utf8");
  assert(content.length >= 800, `${entry.path} 少于 800 字符`);
  assert(content.length === entry.characters, `${entry.path} 字符数与清单不一致`);
  assert(sha256(content) === entry.sha256, `${entry.path} SHA-256 与冻结清单不一致`);
  assert(content.includes(`source_id: "${entry.sourceId}"`), `${entry.path} source_id 与清单不一致`);
  assert(content.includes(`source_version_id: "${entry.sourceVersionId}"`), `${entry.path} source_version_id 与清单不一致`);
  assert(!/\[\[[^\]]+\]\]/.test(content), `${entry.path} 原始来源不应包含编译 wikilink`);
  assert(!forbiddenProductPhrasing.test(content), `${entry.path} 包含非真实产品措辞`);
}

const wikiFiles = walk("reference/wiki").filter(file => file.endsWith(".md"));
const wikiPages = wikiFiles.filter(file => !file.endsWith("/index.md") && !file.endsWith("/log.md"));
assert(wikiPages.length === 150, `互链知识页应为 150，实际 ${wikiPages.length}`);
assert(wikiPages.length !== rawFiles.length, "知识页与来源文件错误地形成 1:1 复印关系");

const wikiTargets = new Set(wikiPages.map(file => file.replace(/^reference\/wiki\//, "").replace(/\.md$/, "")));
let semanticWikilinkCount = 0;
for (const file of wikiFiles) {
  const content = readFileSync(path.join(ROOT, file), "utf8");
  assert(!forbiddenProductPhrasing.test(content), `${file} 包含非真实产品措辞`);
  for (const match of content.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)) {
    semanticWikilinkCount += 1;
    const target = match[1].trim();
    assert(target.includes("/"), `${file} 存在裸 wikilink：${target}`);
    assert(wikiTargets.has(target), `${file} 存在悬空 wikilink：${target}`);
  }
}

const indexContent = readFileSync(path.join(ROOT, "reference/wiki/index.md"), "utf8");
for (const target of wikiTargets) {
  assert(indexContent.includes(`](${target}.md)`), `index.md 未登记 ${target}`);
}
assert(semanticWikilinkCount === 450, `语义 wikilink 应与更新快照 450 条关系一致，实际 ${semanticWikilinkCount}`);

validateSnapshot("preset/knowledge-snapshot-v1.0.json", "preset/graph-projection-v1.0.json", { sources: 60, nodes: 144, edges: 432 });
validateSnapshot("preset/knowledge-snapshot-v1.1.json", "preset/graph-projection-v1.1.json", { sources: 72, nodes: 150, edges: 450 });

for (const snapshotPath of ["preset/knowledge-snapshot-v1.0.json", "preset/knowledge-snapshot-v1.1.json"]) {
  const content = readFileSync(path.join(ROOT, snapshotPath), "utf8");
  assert(!forbiddenProductPhrasing.test(content), `${snapshotPath} 包含非真实产品措辞`);
}

const questions = loadJson("evaluation/golden-questions.json");
const latestSnapshot = loadJson("preset/knowledge-snapshot-v1.1.json");
const latestKnowledgeIds = new Set(latestSnapshot.knowledgeItems.map(item => item.knowledgeId));
const latestSourceVersions = new Set(latestSnapshot.sourceVersions.map(item => item.sourceVersionId));
assert(questions.length === 40, `标准问题应为 40，实际 ${questions.length}`);
for (const question of questions) {
  assert(question.usage === "evaluation_only_not_runtime_fixed_answer", `${question.id} 未标记为仅评测用途`);
  assert(question.knowledgeIds.every(id => latestKnowledgeIds.has(id)), `${question.id} 引用未知知识`);
  assert(question.expectedSourceVersionIds.every(id => latestSourceVersions.has(id)), `${question.id} 引用未知来源版本`);
  if (!question.insufficientEvidence) {
    assert(question.knowledgeIds.length > 0, `${question.id} 非证据不足题却没有知识目标`);
    assert(question.expectedSourceVersionIds.length > 0, `${question.id} 非证据不足题却没有来源目标`);
  }
}

const forbiddenTitles = /驾驶舱|工作舱|星空|深空|宇宙|中枢|大脑|魔法/;
assert(!latestSnapshot.knowledgeItems.some(item => forbiddenTitles.test(item.title)), "知识标题包含禁止的隐喻式产品名称");

if (failures.length) {
  console.error(`数据集校验失败（${failures.length} 项）：`);
  failures.forEach((message, index) => console.error(`${index + 1}. ${message}`));
  process.exit(1);
}

console.log("数据集校验通过");
notes.forEach(note => console.log(`- ${note}`));
console.log(`- 来源 SHA-256：72/72 匹配，raw/ 相对冻结清单零变化`);
console.log(`- Wiki：150 页，wikilink 全部带目录前缀且无悬空`);
console.log(`- 评测问题：40 条，仅用于评测，不是运行时固定答案`);
