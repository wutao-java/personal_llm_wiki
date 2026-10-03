import { createHash } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { baseSources, domains, updateSources } from "../blueprints/catalog.mjs";
import { baseNodes, updateNodes } from "../blueprints/nodes.mjs";
import { goldenQuestions } from "../blueprints/questions.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const FORCE = process.argv.includes("--force");
const GENERATED_AT = "2026-08-04T12:00:00+08:00";
const LAYOUT_SEED = 20260804;
const generatedFiles = [];

function stableId(prefix, value) {
  return `${prefix}-${value.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

function knowledgeId(node) {
  return stableId("K", `${node.domain}-${node.slug}`);
}

function sourceVersionId(source) {
  return `SV-${source.id}-${source.version.split(".")[0]}`;
}

function sha256(content) {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

function writeGenerated(relativePath, content) {
  const target = path.join(ROOT, relativePath);
  if (existsSync(target) && !FORCE) {
    throw new Error(`拒绝覆盖已存在文件：${relativePath}。确认整套重建时使用 --force。`);
  }
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, content, "utf8");
  generatedFiles.push(relativePath);
}

function json(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function frontmatterValue(value) {
  return JSON.stringify(String(value));
}

const domainById = Object.fromEntries(domains.map((domain, index) => [domain.id, { ...domain, index }]));
const allNodes = [...baseNodes, ...updateNodes].map((node, index) => ({
  ...node,
  knowledgeId: knowledgeId(node),
  globalIndex: index,
}));
const nodeBySlug = Object.fromEntries(allNodes.map(node => [node.slug, node]));

for (const domain of domains) {
  const count = baseNodes.filter(node => node.domain === domain.id).length;
  if (count !== 18) throw new Error(`${domain.id} 基础知识项应为 18，实际 ${count}`);
}
if (baseSources.length !== 60 || updateSources.length !== 12 || baseNodes.length !== 144 || updateNodes.length !== 6) {
  throw new Error("蓝图规模不符合 60/12 来源与 144/6 知识项目标");
}

const relationLabels = {
  part_of: "属于",
  supports: "协同支持",
  depends_on: "依赖",
  implemented_by: "由其实现",
  produces: "产生",
  triggers: "触发",
  governed_by: "受其约束",
  measured_by: "由其衡量",
  supersedes: "替代",
  conflicts_with: "与其冲突",
};

const relationWeights = {
  part_of: 1.4,
  supports: 1.3,
  depends_on: 1.7,
  implemented_by: 2.0,
  produces: 1.8,
  triggers: 1.9,
  governed_by: 1.6,
  measured_by: 1.5,
  supersedes: 2.2,
  conflicts_with: 2.0,
};

const baseRelations = [];
const pairKeys = new Set();

function pairKey(sourceSlug, targetSlug) {
  return [sourceSlug, targetSlug].sort().join("|");
}

function addBaseRelation(sourceSlug, targetSlug, type, evidenceSourceId) {
  if (!nodeBySlug[sourceSlug] || !nodeBySlug[targetSlug]) {
    throw new Error(`关系端点不存在：${sourceSlug} -> ${targetSlug}`);
  }
  if (sourceSlug === targetSlug) throw new Error(`不允许自环：${sourceSlug}`);
  const key = pairKey(sourceSlug, targetSlug);
  if (pairKeys.has(key)) throw new Error(`基础图谱出现重复节点对：${key}`);
  pairKeys.add(key);
  baseRelations.push({
    sourceSlug,
    targetSlug,
    type,
    evidenceSourceId,
    directed: type !== "conflicts_with",
  });
}

for (const domain of domains) {
  const nodes = baseNodes.filter(node => node.domain === domain.id);
  const root = nodes[0];
  for (const node of nodes.slice(1)) {
    addBaseRelation(node.slug, root.slug, "part_of", node.primarySource);
  }
  for (let index = 2; index < nodes.length; index += 1) {
    const node = nodes[index];
    const previous = nodes[index - 1];
    addBaseRelation(node.slug, previous.slug, "supports", node.primarySource);
  }
}

for (const [domainIndex, domain] of domains.entries()) {
  const nodes = baseNodes.filter(node => node.domain === domain.id);
  const extraCount = domainIndex < 3 ? 9 : 8;
  for (let offset = 0; offset < extraCount; offset += 1) {
    const nodeIndex = 3 + offset;
    const node = nodes[nodeIndex];
    const target = nodes[nodeIndex - 2];
    addBaseRelation(node.slug, target.slug, "supports", node.primarySource);
  }
}

const systemTargets = {
  project: [
    "customer-service-ui", "qa-service", "knowledge-service", "customer-service-ui", "ticket-service", "knowledge-service",
    "knowledge-service", "source-service", "customer-service-ui", "ticket-service", "qa-service", "customer-service-ui",
    "knowledge-service", "ticket-service", "compile-service", "source-service", "knowledge-service", "qa-service",
  ],
  catalog: [
    "inventory-service", "inventory-service", "inventory-service", "search-index", "inventory-service", "order-service",
    "inventory-service", "inventory-service", "inventory-service", "inventory-service", "inventory-service", "inventory-service",
    "event-bus", "inventory-service", "knowledge-service", "order-service", "order-service", "inventory-service",
  ],
  order: [
    "order-service", "order-service", "order-service", "order-service", "order-service", "order-service",
    "order-service", "order-service", "payment-service", "payment-service", "payment-service", "payment-service",
    "payment-service", "payment-service", "payment-service", "order-service", "order-service", "ticket-service",
  ],
  fulfillment: [
    "fulfillment-service", "fulfillment-service", "fulfillment-service", "fulfillment-service", "fulfillment-service", "fulfillment-service",
    "fulfillment-service", "fulfillment-service", "fulfillment-service", "event-bus", "fulfillment-service", "ticket-service",
    "ticket-service", "fulfillment-service", "fulfillment-service", "fulfillment-service", "inventory-service", "ticket-service",
  ],
  service: [
    "ticket-service", "ticket-service", "ticket-service", "qa-service", "ticket-service", "ticket-service",
    "ticket-service", "ticket-service", "ticket-service", "customer-service-ui", "ticket-service", "ticket-service",
    "qa-service", "qa-service", "knowledge-service", "customer-service-ui", "ticket-service", "ticket-service",
  ],
  knowledge: [
    "knowledge-service", "source-service", "source-service", "source-service", "knowledge-service", "compile-service",
    "knowledge-service", "knowledge-service", "knowledge-service", "compile-service", "compile-service", "knowledge-service",
    "search-index", "qa-service", "qa-service", "qa-service", "qa-service", "knowledge-service",
  ],
};

for (const domain of domains.slice(0, 6)) {
  const nodes = baseNodes.filter(node => node.domain === domain.id);
  const targets = systemTargets[domain.id];
  if (targets.length !== nodes.length) throw new Error(`${domain.id} 系统映射长度错误`);
  nodes.forEach((node, index) => {
    if (index % 2 === 0) addBaseRelation(node.slug, targets[index], "implemented_by", node.primarySource);
  });
}

const qualityTargets = [
  "answer-groundedness", "citation-accuracy", "relation-coverage", "graph-consistency", "compile-success-rate",
  "retrieval-latency", "model-availability", "source-integrity", "data-classification", "masking-policy",
  "document-sanitization", "audit-log", "monitoring-alert", "recovery-runbook", "change-record",
];

for (const [domainIndex, domain] of domains.slice(0, 7).entries()) {
  const nodes = baseNodes.filter(node => node.domain === domain.id);
  [0, 4, 8, 12, 16].forEach((nodeIndex, localIndex) => {
    const node = nodes[nodeIndex];
    const targetSlug = qualityTargets[(domainIndex * 6 + localIndex) % qualityTargets.length];
    const target = nodeBySlug[targetSlug];
    const type = target.type === "metric" ? "measured_by" : "governed_by";
    addBaseRelation(node.slug, targetSlug, type, node.primarySource);
  });
}

const systemNodes = baseNodes.filter(node => node.domain === "system").slice(0, 12);
systemNodes.forEach((node, index) => {
  let offset = (index + 7) % qualityTargets.length;
  while (pairKeys.has(pairKey(node.slug, qualityTargets[offset]))) {
    offset = (offset + 1) % qualityTargets.length;
  }
  const targetSlug = qualityTargets[offset];
  const target = nodeBySlug[targetSlug];
  const type = target.type === "metric" ? "measured_by" : "governed_by";
  addBaseRelation(node.slug, targetSlug, type, node.primarySource);
});

if (baseRelations.length !== 432) {
  throw new Error(`基础关系应为 432，实际 ${baseRelations.length}`);
}

const updateRelationSpecs = [
  ["instant-delivery", "fulfillment-aftersales-management", "part_of"],
  ["instant-delivery", "fulfillment-service", "implemented_by"],
  ["instant-delivery", "delivery-area", "depends_on"],
  ["store-order-transfer", "catalog-inventory-management", "part_of"],
  ["store-order-transfer", "inventory-service", "implemented_by"],
  ["store-order-transfer", "stockout", "depends_on"],
  ["payment-callback-backlog", "quality-security-operations", "part_of"],
  ["payment-callback-backlog", "monitoring-alert", "triggers"],
  ["payment-callback-backlog", "event-bus", "depends_on"],
  ["citation-offset-incident", "quality-security-operations", "part_of"],
  ["citation-offset-incident", "citation-accuracy", "measured_by"],
  ["citation-offset-incident", "source-version", "depends_on"],
  ["member-sensitive-data", "quality-security-operations", "part_of"],
  ["member-sensitive-data", "masking-policy", "governed_by"],
  ["member-sensitive-data", "personal-information", "part_of"],
  ["release-1-1", "customer-service-knowledge-project", "part_of"],
  ["release-1-1", "change-record", "depends_on"],
  ["release-1-1", "snapshot-release", "supports"],
];

const updateRelations = updateRelationSpecs.map(([sourceSlug, targetSlug, type]) => {
  const key = pairKey(sourceSlug, targetSlug);
  if (pairKeys.has(key)) throw new Error(`更新关系重复：${key}`);
  pairKeys.add(key);
  return {
    sourceSlug,
    targetSlug,
    type,
    evidenceSourceId: nodeBySlug[sourceSlug].primarySource,
    directed: true,
  };
});

const allRelations = [...baseRelations, ...updateRelations].map((relation, index) => ({
  ...relation,
  relationId: `REL-${String(index + 1).padStart(4, "0")}`,
  sourceKnowledgeId: knowledgeId(nodeBySlug[relation.sourceSlug]),
  targetKnowledgeId: knowledgeId(nodeBySlug[relation.targetSlug]),
  weight: relationWeights[relation.type],
}));

if (allRelations.length !== 450) throw new Error(`更新后关系应为 450，实际 ${allRelations.length}`);

function relationFact(relation) {
  const source = nodeBySlug[relation.sourceSlug];
  const target = nodeBySlug[relation.targetSlug];
  const label = relationLabels[relation.type];
  if (relation.type === "supports") {
    const domainName = domainById[source.domain]?.name || "当前业务领域";
    return `${source.name}与${target.name}共同支撑${domainName}中的处理与判断。两者在同一知识链路中保留明确交接和来源证据。`;
  }
  const suffix = {
    part_of: "该归属用于目录、筛选和上下文恢复。",
    depends_on: "目标不可用或条件不满足时，来源流程不能按正常路径完成。",
    implemented_by: "业务规则通过该正式组件读取或执行，前端只呈现服务返回的真实状态。",
    produces: "产出必须保留业务身份和处理记录。",
    triggers: "触发过程必须具备幂等和可恢复状态。",
    governed_by: "违反该约束时不得静默进入成功状态。",
    measured_by: "指标值必须从真实对象和处理记录计算。",
    supersedes: "旧事实继续保留为历史版本。",
    conflicts_with: "冲突在审核完成前不得作为确定知识发布。",
  }[relation.type];
  return `${source.name}${label}${target.name}。${suffix}`;
}

function relationCheck(relation) {
  const source = nodeBySlug[relation.sourceSlug];
  const target = nodeBySlug[relation.targetSlug];
  return `核验 ${relation.relationId} 时，应能从${source.name}定位到${target.name}，并在同一知识版本中打开本条来源证据。`;
}

const baseSourceById = Object.fromEntries(baseSources.map(source => [source.id, source]));
const updateSourceByVersion = Object.fromEntries(updateSources.map(source => [sourceVersionId(source), source]));
const allSourceDefinitions = [...baseSources, ...updateSources];

const domainGuidance = {
  project: "涉及跨角色交接时，交接方必须记录当前状态、已确认事实、未解决问题和下一责任人；验收只认可可观察结果，不以口头说明替代运行证据。",
  catalog: "库存和商品判断必须读取当前业务状态，不能用界面缓存推断最终可售结果；发生差异时保留事件版本、门店和 SKU 维度的核对记录。",
  order: "订单与资金状态分别记录并通过事件关联。任何取消、退款或补偿动作都必须幂等，重复请求不能重复改变金额或库存。",
  fulfillment: "履约和售后处理以订单项为最小影响范围。状态异常时先保留客户可见说明，再核对门店、承运方和逆向物流证据。",
  service: "服务人员先确认客户目标和必要身份，再使用知识或工单能力。证据不足、资金风险或跨团队问题必须进入人工升级。",
  knowledge: "编译结果按知识单元跨来源重组，不与文件一一对应。关系、回答和推荐问题只能使用当前已接受知识版本。",
  system: "接口契约包含请求身份、幂等、状态和错误恢复。前端只能展示真实服务状态，不能以定时器或固定返回值生成业务成功状态。",
  quality: "安全和质量检查必须在数据进入模型与界面前生效。告警、恢复和变更均保留不含明文凭据的操作记录。",
};

function sourcePath(source, layer) {
  if (layer === "base") return `raw/base/${source.domain}/${source.id}.md`;
  const suffix = source.supersedes ? `-v${source.version.split(".")[0]}` : "";
  return `raw/update-01/${source.domain}/${source.id}${suffix}.md`;
}

function nodeDescription(node, snapshotVersion) {
  return snapshotVersion === "1.1" && node.updatedDescription ? node.updatedDescription : node.description;
}

function relevantBaseNodes(source) {
  return baseNodes.filter(node => node.primarySource === source.id);
}

function relevantUpdateNodes(source) {
  const introduced = updateNodes.filter(node => node.primarySource === source.id);
  const changed = baseNodes.filter(node => node.primarySource === source.id && node.updatedDescription);
  return [...changed, ...introduced];
}

function relevantBaseRelations(source) {
  return allRelations.slice(0, 432).filter(relation => relation.evidenceSourceId === source.id);
}

function relevantUpdateRelations(source) {
  const affected = new Set(relevantUpdateNodes(source).map(node => node.slug));
  return allRelations.filter(relation =>
    relation.evidenceSourceId === source.id && relation.relationId > "REL-0432" ||
    source.supersedes && (affected.has(relation.sourceSlug) || affected.has(relation.targetSlug))
  );
}

function yamlFrontmatter(source) {
  const fields = [
    ["source_id", source.id],
    ["source_version_id", sourceVersionId(source)],
    ["title", source.title],
    ["document_type", source.documentType],
    ["version", source.version],
    ["effective_date", source.effectiveDate],
    ["owner", source.owner],
    ["status", source.status],
  ];
  if (source.supersedes) fields.push(["supersedes", source.supersedes]);
  return `---\n${fields.map(([key, value]) => `${key}: ${frontmatterValue(value)}`).join("\n")}\n---`;
}

function renderSource(source, layer) {
  const snapshotVersion = layer === "base" ? "1.0" : "1.1";
  const nodes = layer === "base" ? relevantBaseNodes(source) : relevantUpdateNodes(source);
  const relations = layer === "base" ? relevantBaseRelations(source) : relevantUpdateRelations(source);
  if (nodes.length === 0) throw new Error(`${sourceVersionId(source)} 没有关联知识项`);

  const evidenceSpecs = [];
  const nodeLines = nodes.map(node => {
    const evidenceId = stableId("E", `${sourceVersionId(source)}-${node.slug}-definition`);
    const quote = `${node.name}：${nodeDescription(node, snapshotVersion)}`;
    evidenceSpecs.push({ evidenceId, kind: "knowledge", knowledgeId: knowledgeId(node), quote });
    return `- **${evidenceId}** ${quote}`;
  });

  const relationLines = [];
  for (const relation of relations) {
    const factId = stableId("E", `${sourceVersionId(source)}-${relation.relationId}-fact`);
    const checkId = stableId("E", `${sourceVersionId(source)}-${relation.relationId}-check`);
    const fact = relationFact(relation);
    const check = relationCheck(relation);
    evidenceSpecs.push({ evidenceId: factId, kind: "relation", relationId: relation.relationId, quote: fact });
    evidenceSpecs.push({ evidenceId: checkId, kind: "relation", relationId: relation.relationId, quote: check });
    relationLines.push(`- **${factId}** ${fact}`);
    relationLines.push(`- **${checkId}** ${check}`);
  }

  const relatedSourceIds = new Set();
  for (const relation of relations) {
    const targetNode = nodeBySlug[relation.targetSlug];
    const sourceNode = nodeBySlug[relation.sourceSlug];
    if (targetNode.primarySource !== source.id) relatedSourceIds.add(targetNode.primarySource);
    if (sourceNode.primarySource !== source.id) relatedSourceIds.add(sourceNode.primarySource);
  }
  const related = [...relatedSourceIds].slice(0, 10);
  if (related.length === 0) {
    const peers = baseSources.filter(item => item.domain === source.domain && item.id !== source.id).slice(0, 3);
    peers.forEach(item => related.push(item.id));
  }

  const purpose = source.changeSummary || source.summary;
  const changeSection = source.changeSummary
    ? `\n## 变更说明\n\n${source.changeSummary}\n\n本文件形成新的资料版本，旧版本继续保留，用于解释历史知识和历史回答。新规则只在版本 1.1 知识快照发布后成为当前规则。\n`
    : "";

  let content = `${yamlFrontmatter(source)}\n\n# ${source.title}\n\n> 本资料属于连锁零售企业客户服务与知识运营项目，内容不包含客户个人信息、真实订单、联系方式或访问凭据。\n\n## 文档目的\n\n${purpose}\n\n本文件用于统一相关角色对业务对象、处理顺序、异常边界和验收证据的理解。执行人员应以已生效版本为准，不得根据口头约定覆盖本文记录。${changeSection}\n\n## 适用范围\n\n适用于${domainById[source.domain].name}相关的产品设计、客户服务、系统处理、知识编译和质量核验。跨领域动作必须同时遵守被引用资料的状态、权限和恢复要求。\n\n## 核心定义\n\n${nodeLines.join("\n")}\n\n## 处理规则与依赖\n\n${relationLines.join("\n")}\n\n## 异常与恢复\n\n${domainGuidance[source.domain]}\n\n遇到信息不完整、状态冲突或下游不可用时，不得把处理中显示为成功。操作人应记录当前对象、失败阶段、已完成动作和可重试条件；恢复后重新核对相关业务状态与来源证据。\n\n## 验收与记录\n\n验收至少检查正常路径、重复请求、边界状态和失败恢复。涉及客户可见结论时，必须能够定位支撑结论的资料版本；涉及系统状态时，必须能够通过对象身份或事件编号核对，不能以截图或口头说明替代数据记录。\n\n## 相关资料\n\n${related.map(id => `- ${id}`).join("\n")}\n`;

  if (content.length < 900) {
    content += `\n## 执行补充\n\n本文件中的规则需要与当前已接受知识版本一起使用。来源发生变化时先形成新的资料版本，再执行编译和审核；发布前继续使用上一个可用版本，并明确提示待更新状态。任何自动生成的摘要都不能替代本文件中的正式规则和可定位证据。\n`;
  }
  if (content.length < 800) throw new Error(`${sourceVersionId(source)} 正文过短：${content.length}`);
  return { content, evidenceSpecs };
}

const renderedSources = [];

for (const source of baseSources) {
  const rendered = renderSource(source, "base");
  const relativePath = sourcePath(source, "base");
  writeGenerated(relativePath, rendered.content);
  renderedSources.push({ source, layer: "base", relativePath, ...rendered });
}

for (const source of updateSources) {
  const rendered = renderSource(source, "update");
  const relativePath = sourcePath(source, "update");
  writeGenerated(relativePath, rendered.content);
  renderedSources.push({ source, layer: "update", relativePath, ...rendered });
}

const evidenceFragments = [];
const evidenceIdsByRelation = new Map();
const evidenceIdsByKnowledge = new Map();

for (const rendered of renderedSources) {
  for (const spec of rendered.evidenceSpecs) {
    const start = rendered.content.indexOf(spec.quote);
    if (start < 0) throw new Error(`证据文本未写入来源：${spec.evidenceId}`);
    const fragment = {
      evidenceId: spec.evidenceId,
      kind: spec.kind,
      sourceId: rendered.source.id,
      sourceVersionId: sourceVersionId(rendered.source),
      path: rendered.relativePath,
      charStart: start,
      charEnd: start + spec.quote.length,
      quote: spec.quote,
    };
    evidenceFragments.push(fragment);
    if (spec.relationId) {
      if (!evidenceIdsByRelation.has(spec.relationId)) evidenceIdsByRelation.set(spec.relationId, []);
      evidenceIdsByRelation.get(spec.relationId).push(spec.evidenceId);
    }
    if (spec.knowledgeId) {
      if (!evidenceIdsByKnowledge.has(spec.knowledgeId)) evidenceIdsByKnowledge.set(spec.knowledgeId, []);
      evidenceIdsByKnowledge.get(spec.knowledgeId).push(spec.evidenceId);
    }
  }
}

function currentSourceVersions(snapshotVersion) {
  if (snapshotVersion === "1.0") {
    return baseSources.map(source => ({
      sourceId: source.id,
      sourceVersionId: sourceVersionId(source),
      version: source.version,
      path: sourcePath(source, "base"),
      contentSha256: sha256(renderedSources.find(item => item.relativePath === sourcePath(source, "base")).content),
    }));
  }
  return renderedSources.map(item => ({
    sourceId: item.source.id,
    sourceVersionId: sourceVersionId(item.source),
    version: item.source.version,
    path: item.relativePath,
    supersedes: item.source.supersedes || null,
    contentSha256: sha256(item.content),
  }));
}

function relationSourcesForNode(node, relations) {
  const ids = new Set([node.primarySource]);
  for (const relation of relations) {
    if (relation.sourceSlug !== node.slug && relation.targetSlug !== node.slug) continue;
    ids.add(relation.evidenceSourceId);
    const otherSlug = relation.sourceSlug === node.slug ? relation.targetSlug : relation.sourceSlug;
    ids.add(nodeBySlug[otherSlug].primarySource);
    if (ids.size >= 4) break;
  }
  return [...ids].slice(0, 4);
}

function buildKnowledgeItems(snapshotVersion, nodes, relations) {
  const sourceVersions = currentSourceVersions(snapshotVersion);
  const allowedPaths = new Set(sourceVersions.map(version => version.path));
  const latestVersionBySource = new Map();
  for (const version of sourceVersions) latestVersionBySource.set(version.sourceId, version.sourceVersionId);

  return nodes.map(node => {
    const sourceIds = relationSourcesForNode(node, relations);
    return {
      knowledgeId: knowledgeId(node),
      slug: node.slug,
      title: node.name,
      type: node.type,
      domain: node.domain,
      summary: nodeDescription(node, snapshotVersion),
      reviewStatus: "accepted",
      sourceIds,
      sourceVersionIds: sourceIds.map(id => latestVersionBySource.get(id)).filter(Boolean),
      evidenceIds: (evidenceIdsByKnowledge.get(knowledgeId(node)) || []).filter(evidenceId => {
        const fragment = evidenceFragments.find(item => item.evidenceId === evidenceId);
        return fragment && allowedPaths.has(fragment.path);
      }),
      markdownPath: `reference/wiki/${node.domain}/${node.slug}.md`,
      introducedIn: node.introducedIn || "1.0",
      updatedAt: snapshotVersion === "1.0" ? "2026-06-01" : "2026-08-03",
    };
  });
}

function buildRelations(snapshotVersion, relations) {
  const allowedPrefix = snapshotVersion === "1.0" ? "SV-" : null;
  return relations.map(relation => {
    let evidenceIds = evidenceIdsByRelation.get(relation.relationId) || [];
    if (snapshotVersion === "1.0") {
      evidenceIds = evidenceIds.filter(id => {
        const fragment = evidenceFragments.find(item => item.evidenceId === id);
        return fragment && fragment.path.startsWith("raw/base/");
      });
    }
    if (evidenceIds.length === 0) throw new Error(`${snapshotVersion} 的 ${relation.relationId} 缺少证据`);
    return {
      relationId: relation.relationId,
      sourceKnowledgeId: relation.sourceKnowledgeId,
      targetKnowledgeId: relation.targetKnowledgeId,
      type: relation.type,
      directed: relation.directed,
      weight: relation.weight,
      evidenceIds,
      reviewStatus: "accepted",
    };
  });
}

function buildGraphProjection(snapshotId, knowledgeItems, relations) {
  const degree = Object.fromEntries(knowledgeItems.map(item => [item.knowledgeId, 0]));
  for (const relation of relations) {
    degree[relation.sourceKnowledgeId] += 1;
    degree[relation.targetKnowledgeId] += 1;
  }
  const graphNodes = knowledgeItems.map((item, index) => ({
    id: item.knowledgeId,
    knowledgeId: item.knowledgeId,
    name: item.title,
    type: item.type,
    domain: domainById[item.domain].index,
    domainId: item.domain,
    hub: item.type === "domain" || degree[item.knowledgeId] >= 12,
    degree: degree[item.knowledgeId],
    sourceCount: item.sourceIds.length,
    reviewStatus: item.reviewStatus,
    index,
  }));
  const byId = Object.fromEntries(graphNodes.map(node => [node.id, node]));
  const graphEdges = relations.map(relation => ({
    relationId: relation.relationId,
    source: relation.sourceKnowledgeId,
    target: relation.targetKnowledgeId,
    type: relation.type,
    directed: relation.directed,
    weight: relation.weight,
    evidenceCount: relation.evidenceIds.length,
    reviewStatus: relation.reviewStatus,
  }));
  return {
    schemaVersion: "1.0.0",
    snapshotId,
    layoutSeed: LAYOUT_SEED,
    domains: domains.map((domain, index) => ({ ...domain, index })),
    nodes: graphNodes,
    edges: graphEdges,
    byId,
    hierarchy: {
      name: "企业客户服务知识",
      children: domains.map((domain, index) => ({
        id: domain.id,
        name: domain.name,
        domain: index,
        children: graphNodes
          .filter(node => node.domainId === domain.id && node.type !== "domain")
          .map(node => ({ id: node.id, name: node.name, domain: index })),
      })),
    },
    counts: { nodes: graphNodes.length, edges: graphEdges.length },
  };
}

function buildSnapshot(snapshotVersion) {
  const isBase = snapshotVersion === "1.0";
  const nodes = isBase ? baseNodes : allNodes;
  const relations = isBase ? allRelations.slice(0, 432) : allRelations;
  const snapshotId = isBase ? "KS-RETAIL-SERVICE-1.0" : "KS-RETAIL-SERVICE-1.1";
  const knowledgeItems = buildKnowledgeItems(snapshotVersion, nodes, relations);
  const compiledRelations = buildRelations(snapshotVersion, relations);
  const allowedPaths = new Set(currentSourceVersions(snapshotVersion).map(version => version.path));
  const fragments = evidenceFragments.filter(fragment => allowedPaths.has(fragment.path));
  const graphProjection = buildGraphProjection(snapshotId, knowledgeItems, compiledRelations);
  return {
    snapshot: {
      schemaVersion: "1.0.0",
      projectId: "PROJECT-RETAIL-SERVICE-KNOWLEDGE",
      projectName: "连锁零售企业客户服务知识库",
      snapshotId,
      version: snapshotVersion,
      status: "accepted",
      acceptedAt: isBase ? "2026-06-30T18:00:00+08:00" : "2026-08-03T18:00:00+08:00",
      compiledBy: {
        agent: "Codex",
        method: "repository_markdown_precompile",
        note: "由仓库内不可变 Markdown 来源生成；与运行时模型编译共用正式对象契约。",
      },
      sourceVersions: currentSourceVersions(snapshotVersion),
      knowledgeItems,
      relations: compiledRelations,
      evidenceFragments: fragments,
      suggestedQuestions: goldenQuestions.slice(0, 8).map(question => ({
        questionId: `SQ-${question.id.slice(2)}`,
        snapshotId,
        text: question.question,
        relatedKnowledgeIds: question.knowledgeSlugs.map(slug => knowledgeId(nodeBySlug[slug])).filter(Boolean),
      })),
      counts: {
        sourceVersions: currentSourceVersions(snapshotVersion).length,
        knowledgeItems: knowledgeItems.length,
        relations: compiledRelations.length,
        evidenceFragments: fragments.length,
      },
    },
    graphProjection,
  };
}

const baseBuild = buildSnapshot("1.0");
const updateBuild = buildSnapshot("1.1");

writeGenerated("preset/knowledge-snapshot-v1.0.json", json(baseBuild.snapshot));
writeGenerated("preset/knowledge-snapshot-v1.1.json", json(updateBuild.snapshot));
writeGenerated("preset/graph-projection-v1.0.json", json(baseBuild.graphProjection));
writeGenerated("preset/graph-projection-v1.1.json", json(updateBuild.graphProjection));
writeGenerated("preset/default.json", json({
  projectId: updateBuild.snapshot.projectId,
  snapshotId: updateBuild.snapshot.snapshotId,
  knowledgeSnapshot: "knowledge-snapshot-v1.1.json",
  graphProjection: "graph-projection-v1.1.json",
  sourceCorpus: "../corpus-manifest.json",
  note: "正式产品应通过统一快照导入入口加载；不得让图谱单独读取另一套节点或关系。",
}));

function wikiFrontmatter(item) {
  return `---\nknowledge_id: ${frontmatterValue(item.knowledgeId)}\ntitle: ${frontmatterValue(item.title)}\ntype: ${frontmatterValue(item.type)}\ndomain: ${frontmatterValue(item.domain)}\nsources: [${item.sourceIds.map(frontmatterValue).join(", ")}]\nsource_versions: [${item.sourceVersionIds.map(frontmatterValue).join(", ")}]\nupdated: ${frontmatterValue(item.updatedAt)}\nstatus: ${frontmatterValue(item.reviewStatus)}\n---`;
}

const latestItemById = Object.fromEntries(updateBuild.snapshot.knowledgeItems.map(item => [item.knowledgeId, item]));
const latestRelationsByItem = new Map(updateBuild.snapshot.knowledgeItems.map(item => [item.knowledgeId, []]));
for (const relation of updateBuild.snapshot.relations) {
  latestRelationsByItem.get(relation.sourceKnowledgeId).push({ relation, direction: "out" });
  latestRelationsByItem.get(relation.targetKnowledgeId).push({ relation, direction: "in" });
}

function relationWikiLine(entry) {
  const relation = entry.relation;
  const otherId = entry.direction === "out" ? relation.targetKnowledgeId : relation.sourceKnowledgeId;
  const other = latestItemById[otherId];
  const link = `[[${other.domain}/${other.slug}|${other.title}]]`;
  const label = relationLabels[relation.type];
  return entry.direction === "out"
    ? `- ${label} ${link}（${relation.relationId}，证据 ${relation.evidenceIds.length} 条）`
    : `- [${other.title}](../${other.domain}/${other.slug}.md) ${label}本知识（${relation.relationId}，证据 ${relation.evidenceIds.length} 条）`;
}

for (const item of updateBuild.snapshot.knowledgeItems) {
  const entries = latestRelationsByItem.get(item.knowledgeId)
    .sort((a, b) => a.relation.relationId.localeCompare(b.relation.relationId));
  const sourceLines = item.sourceIds.map(sourceId => {
    const versions = currentSourceVersions("1.1").filter(version => version.sourceId === sourceId);
    return `- ${sourceId}：${versions.map(version => version.sourceVersionId).join("、")}`;
  });
  const body = `${wikiFrontmatter(item)}\n\n# ${item.title}\n\n## 摘要\n\n${item.summary}\n\n## 核心说明\n\n本页由多个来源中的定义、处理规则和可核验关系重组而成。它以 ${item.knowledgeId} 作为稳定身份，标题微调或图谱重新布局不会改变该身份。当前内容属于知识版本 ${updateBuild.snapshot.snapshotId}。\n\n## 关系\n\n${entries.map(relationWikiLine).join("\n")}\n\n## 来源\n\n${sourceLines.join("\n")}\n\n## 使用说明\n\n知识页面、图谱节点和问答相关知识都使用同一 knowledgeId。需要核对结论时，应通过关系或回答中的 evidenceId 打开对应资料版本和原文位置。\n`;
  writeGenerated(`reference/wiki/${item.domain}/${item.slug}.md`, body);
}

const indexSections = domains.map(domain => {
  const items = updateBuild.snapshot.knowledgeItems.filter(item => item.domain === domain.id);
  return `## ${domain.name}\n\n${items.map(item => `- [${item.title}](${item.domain}/${item.slug}.md)：${item.summary}`).join("\n")}`;
});
writeGenerated("reference/wiki/index.md", `# 企业客户服务知识索引\n\n本索引列出版本 1.1 的全部知识页面。查询或人工阅读应先从领域和摘要定位目标页面。\n\n${indexSections.join("\n\n")}\n`);
writeGenerated("reference/wiki/log.md", `# 编译记录\n\n## 2026-08-03 · 版本 1.1\n\n- 输入：60 个基础来源版本、6 个既有来源新版本和 6 个新增来源。\n- 输出：150 个知识项、450 条已接受关系和 ${updateBuild.snapshot.evidenceFragments.length} 个证据片段。\n- 变更：取消、退货、库存锁定、首次响应、知识审核和模型连接规则更新；新增 [同城即时配送](fulfillment/instant-delivery.md)、[门店缺货转单](catalog/store-order-transfer.md)、[支付回调积压事故](quality/payment-callback-backlog.md)、[引用定位偏差事故](quality/citation-offset-incident.md)、[会员敏感信息](quality/member-sensitive-data.md) 与 [版本 1.1](project/release-1-1.md)。\n\n## 2026-06-30 · 版本 1.0\n\n- 输入：60 个基础来源版本。\n- 输出：144 个知识项和 432 条已接受关系。\n- 原始来源保持只读，知识页、关系和图谱投影全部从同一编译结果生成。\n`);

const evaluatedQuestions = goldenQuestions.map(question => ({
  ...question,
  knowledgeIds: question.knowledgeSlugs.map(slug => knowledgeId(nodeBySlug[slug])).filter(Boolean),
  expectedSourceVersionIds: question.sourceIds.flatMap(sourceId =>
    currentSourceVersions("1.1").filter(version => version.sourceId === sourceId).map(version => version.sourceVersionId)
  ),
  usage: "evaluation_only_not_runtime_fixed_answer",
}));
writeGenerated("evaluation/golden-questions.json", json(evaluatedQuestions));
writeGenerated("evaluation/golden-questions.md", `# 标准问答集\n\n本文件用于检索、引用和回答质量回归。` +
  `不得在产品运行时根据问题文本直接返回这里的预期摘要。\n\n` +
  evaluatedQuestions.map(question => `## ${question.id} · ${question.category}\n\n**问题**：${question.question}\n\n**预期要点**：${question.expectedSummary}\n\n**相关知识**：${question.knowledgeIds.length ? question.knowledgeIds.join("、") : "无；应返回证据不足"}\n\n**预期来源**：${question.expectedSourceVersionIds.length ? question.expectedSourceVersionIds.join("、") : "无"}\n`).join("\n"));

function topology(projection) {
  const degrees = projection.nodes.map(node => node.degree).sort((a, b) => a - b);
  const quantile = ratio => degrees[Math.floor((degrees.length - 1) * ratio)];
  const domainCounts = Object.fromEntries(domains.map(domain => [domain.id, projection.nodes.filter(node => node.domainId === domain.id).length]));
  const crossDomainEdges = projection.edges.filter(edge => projection.byId[edge.source].domainId !== projection.byId[edge.target].domainId).length;
  return {
    snapshotId: projection.snapshotId,
    nodes: projection.nodes.length,
    edges: projection.edges.length,
    averageDegree: Number((projection.edges.length * 2 / projection.nodes.length).toFixed(2)),
    degreeMedian: quantile(0.5),
    degreeP90: quantile(0.9),
    degreeMax: degrees.at(-1),
    hubs: projection.nodes.filter(node => node.hub).length,
    isolatedNodes: projection.nodes.filter(node => node.degree === 0).length,
    crossDomainEdges,
    crossDomainRatio: Number((crossDomainEdges / projection.edges.length).toFixed(3)),
    domainCounts,
  };
}

const topologyReport = {
  generatedAt: GENERATED_AT,
  base: topology(baseBuild.graphProjection),
  update: topology(updateBuild.graphProjection),
};
writeGenerated("evaluation/topology.json", json(topologyReport));

const manifestEntries = renderedSources.map(item => ({
  sourceId: item.source.id,
  sourceVersionId: sourceVersionId(item.source),
  version: item.source.version,
  layer: item.layer,
  domain: item.source.domain,
  title: item.source.title,
  path: item.relativePath,
  supersedes: item.source.supersedes || null,
  characters: item.content.length,
  bytes: Buffer.byteLength(item.content, "utf8"),
  sha256: sha256(item.content),
}));
const corpusManifest = {
  schemaVersion: "1.0.0",
  datasetId: "enterprise-customer-service",
  title: "连锁零售企业客户服务与知识运营项目资料集",
  generatedAt: GENERATED_AT,
  generatedBy: "Codex",
  sourcePolicy: "immutable_versioned_markdown",
  counts: {
    baseSourceVersions: baseSources.length,
    updateSourceVersions: updateSources.length,
    totalSourceVersions: manifestEntries.length,
    logicalSources: new Set(manifestEntries.map(entry => entry.sourceId)).size,
  },
  files: manifestEntries,
};
writeGenerated("corpus-manifest.json", json(corpusManifest));

writeGenerated("evaluation/build-report.md", `# 数据集生成报告\n\n- 生成时间：${GENERATED_AT}\n- 基础来源版本：${baseSources.length}\n- 更新来源版本：${updateSources.length}\n- 基础知识项 / 关系：${baseBuild.snapshot.counts.knowledgeItems} / ${baseBuild.snapshot.counts.relations}\n- 更新知识项 / 关系：${updateBuild.snapshot.counts.knowledgeItems} / ${updateBuild.snapshot.counts.relations}\n- 更新快照证据片段：${updateBuild.snapshot.counts.evidenceFragments}\n- 互链知识页：${updateBuild.snapshot.counts.knowledgeItems}\n- 标准问题：${evaluatedQuestions.length}\n- 默认预置快照：${updateBuild.snapshot.snapshotId}\n\n所有生成结果都来自 raw/ 对应的 Markdown 事实与蓝图，不包含运行时固定答案分支。\n`);

console.log(JSON.stringify({
  generatedFiles: generatedFiles.length,
  sources: corpusManifest.counts,
  baseSnapshot: baseBuild.snapshot.counts,
  updateSnapshot: updateBuild.snapshot.counts,
  topology: topologyReport,
  questions: evaluatedQuestions.length,
}, null, 2));
