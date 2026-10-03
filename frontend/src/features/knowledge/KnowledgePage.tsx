import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BookOpenText,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  GitFork,
  Link2,
  Network,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api } from "../../api/client";
import type { Evidence, KnowledgeRelation } from "../../api/types";
import { EmptyState, ErrorState, LoadingState } from "../../components/AsyncState";
import { MarkdownView } from "../../components/MarkdownView";
import { SidePanel } from "../../components/SidePanel";
import { SourceDocumentReader } from "../../components/SourceDocumentReader";
import { StatusBadge } from "../../components/StatusBadge";
import { useUIStore } from "../../state/ui";

const domainNames: Record<string, string> = {
  project: "项目与角色",
  catalog: "商品与库存",
  order: "订单与支付",
  fulfillment: "履约与售后",
  service: "客户服务",
  knowledge: "知识与模型",
  system: "系统与接口",
  quality: "质量、安全与运营",
};

export function KnowledgePage() {
  const { knowledgeId } = useParams();
  const navigate = useNavigate();
  const [urlParams] = useSearchParams();
  const search = urlParams.get("query") ?? "";
  const domain = urlParams.get("domain") ?? "";
  const requestedPage = Number(urlParams.get("page") ?? 1);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const pageSize = 30;
  const [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(null);
  const [copied, setCopied] = useState(false);
  const setGraphSelectedId = useUIStore((state) => state.setGraphSelectedId);

  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (search.trim()) params.set("query", search.trim());
  if (domain) params.set("domain", domain);
  const list = useQuery({ queryKey: ["knowledge", search, domain, page], queryFn: () => api.knowledge(params.toString()) });
  const pageCount = Math.max(1, Math.ceil((list.data?.total ?? 0) / pageSize));
  const effectiveId = knowledgeId ?? list.data?.items[0]?.knowledgeId ?? null;
  const detail = useQuery({
    queryKey: ["knowledge-detail", effectiveId],
    queryFn: () => api.knowledgeDetail(effectiveId!),
    enabled: Boolean(effectiveId),
  });
  const evidenceDetail = useQuery({
    queryKey: ["evidence", selectedEvidence?.evidenceId],
    queryFn: () => api.evidence(selectedEvidence!.evidenceId),
    enabled: Boolean(selectedEvidence),
  });
  const sourceContent = useQuery({
    queryKey: ["source-content", evidenceDetail.data?.sourceVersionId],
    queryFn: () => api.sourceContent(evidenceDetail.data!.sourceVersionId),
    enabled: Boolean(selectedEvidence && evidenceDetail.data?.accessible),
  });

  useEffect(() => {
    if (list.data && page > pageCount) {
      const next = new URLSearchParams(urlParams);
      next.set("page", String(pageCount));
      navigate(`/knowledge?${next}`, { replace: true });
    }
  }, [list.data, page, pageCount, urlParams, navigate]);

  const domains = useMemo(() => list.data?.domains ?? [], [list.data?.domains]);
  const relatedByType = useMemo(() => {
    const groups = new Map<string, KnowledgeRelation[]>();
    for (const relation of detail.data?.relations ?? []) {
      const current = groups.get(relation.type) ?? [];
      current.push(relation);
      groups.set(relation.type, current);
    }
    return Array.from(groups.entries());
  }, [detail.data?.relations]);

  const selectKnowledge = (id: string) => {
    navigate(`/knowledge/${encodeURIComponent(id)}?${urlParams}`);
  };

  const updateDirectory = (key: "query" | "domain" | "page", value: string) => {
    const next = new URLSearchParams(urlParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    navigate(`/knowledge?${next}`, { replace: true });
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="knowledge-workspace">
      <aside className="knowledge-index">
        <header>
          <div><span className="eyebrow">知识页面</span><h1>知识目录</h1></div>
          <span>{list.data?.total ?? 0}</span>
        </header>
        <label className="search-field"><Search size={15} /><input value={search} onChange={(event) => updateDirectory("query", event.target.value)} placeholder="搜索知识标题或内容" /></label>
        <div className="filter-pills">
          <button className={!domain ? "is-active" : ""} onClick={() => updateDirectory("domain", "")} type="button">全部</button>
          {domains.map((item) => <button className={domain === item.id ? "is-active" : ""} key={item.id} onClick={() => updateDirectory("domain", item.id)} type="button">{item.name}</button>)}
        </div>
        <div className="knowledge-index__list">
          {list.isLoading ? <LoadingState label="正在读取知识目录" /> : null}
          {list.isError ? <ErrorState message={list.error.message} onRetry={() => list.refetch()} /> : null}
          {list.data?.items.length === 0 ? <EmptyState icon={<BookOpenText />} title={list.data.snapshotId ? "没有匹配的知识" : "尚无已发布的知识"} description={list.data.snapshotId ? "调整搜索词或领域筛选。" : "导入资料并确认生成结果后，知识会显示在这里。"} /> : null}
          {list.data?.items.map((item) => (
            <button className={effectiveId === item.knowledgeId ? "is-active" : ""} key={item.knowledgeId} onClick={() => selectKnowledge(item.knowledgeId)} type="button">
              <i data-domain={item.domain}><BookOpenText size={16} /></i>
              <span><strong>{item.title}</strong><small>{item.summary}</small><em>{domainNames[item.domain] ?? item.domain} · {typeName(item.type)}</em></span>
              <ChevronRight size={14} />
            </button>
          ))}
        </div>
        <footer className="directory-pagination">
          <span>{page} / {pageCount}</span>
          <button className="icon-button" type="button" title="上一页知识" aria-label="上一页知识" disabled={page <= 1 || list.isFetching} onClick={() => updateDirectory("page", String(page - 1))}><ChevronLeft size={16} /></button>
          <button className="icon-button" type="button" title="下一页知识" aria-label="下一页知识" disabled={page >= pageCount || list.isFetching} onClick={() => updateDirectory("page", String(page + 1))}><ChevronRight size={16} /></button>
        </footer>
      </aside>

      <main className={`knowledge-reader${detail.data ? " knowledge-reader--with-context" : ""}`}>
        {detail.isLoading ? <LoadingState label="正在打开知识页面" /> : null}
        {detail.isError ? <ErrorState message={detail.error.message} onRetry={() => detail.refetch()} /> : null}
        {!effectiveId && !detail.isLoading ? (
          <EmptyState
            icon={<BookOpenText />}
            title={list.data?.snapshotId ? "选择一条知识" : "尚无已发布的知识"}
            description={list.data?.snapshotId ? "从左侧目录打开知识页面，并查看来源与关系。" : "导入资料并确认生成结果后，即可阅读知识页面。"}
            action={!list.data?.snapshotId && list.data ? <Link className="button button--primary" to="/sources"><FileText size={16} />导入资料</Link> : undefined}
          />
        ) : null}
        {detail.data ? (
          <>
            <header className="knowledge-reader__header">
              <div className="knowledge-reader__breadcrumb"><span>知识页面</span><ChevronRight size={13} /><span>{domainNames[detail.data.domain] ?? detail.data.domain}</span></div>
              <div className="knowledge-reader__title"><div><span className="type-label">{typeName(detail.data.type)}</span><h2>{detail.data.title}</h2><p>{detail.data.summary}</p></div><div className="reader-actions"><button className="icon-button" onClick={copyLink} type="button" title="复制页面链接">{copied ? <Check size={17} /> : <Link2 size={17} />}</button><button className="button button--secondary" type="button" onClick={() => { setGraphSelectedId(detail.data.knowledgeId); navigate("/graph"); }}><GitFork size={15} />在图谱中查看</button></div></div>
              <div className="knowledge-reader__meta"><StatusBadge status={detail.data.reviewStatus} /><span>{detail.data.sourceCount} 个来源</span><span>{detail.data.relations.length} 条关系</span><span>更新于 {formatDate(detail.data.updatedAt)}</span></div>
            </header>

            <div className="knowledge-reader__layout">
              <article className="knowledge-article"><MarkdownView content={detail.data.markdown} evidence={detail.data.evidence} onEvidence={setSelectedEvidence} /></article>
            </div>
            <aside className="knowledge-context">
                <section>
                  <header><div><FileText size={16} /><h2>来源依据</h2></div><span>{detail.data.evidence.length}</span></header>
                  <div className="evidence-list">
                    {detail.data.evidence.map((evidence, index) => (
                      <button key={evidence.evidenceId} type="button" onClick={() => setSelectedEvidence({ ...evidence, index: index + 1 } as Evidence)}>
                        <span>[{index + 1}]</span><div><strong>{evidence.sourceTitle}{evidence.pageNumber ? ` · 第 ${evidence.pageNumber} 页` : evidence.blockLabel ? ` · ${evidence.blockLabel}` : ""}{evidence.extractionMethod === "ocr" ? evidence.reviewStatus === "reviewed" ? ` · 已人工校对（原始识别 ${Math.round(evidence.qualityScore ?? 0)} 分）` : ` · 文字识别 ${Math.round(evidence.qualityScore ?? 0)} 分` : ""}</strong><p>{evidence.quote}</p></div><ChevronRight size={14} />
                      </button>
                    ))}
                  </div>
                </section>
                <section>
                  <header><div><Network size={16} /><h2>关联知识</h2></div><span>{detail.data.relations.length}</span></header>
                  <div className="relation-groups">
                    {relatedByType.map(([relationType, relations]) => <div key={relationType}><span>{relationType}</span>{relations.map((relation) => relation.relatedKnowledge ? <button key={relation.relationId} onClick={() => selectKnowledge(relation.relatedKnowledge!.knowledgeId)} type="button"><i data-domain={relation.relatedKnowledge.domain} /><div><strong>{relation.relatedKnowledge.title}</strong><small>{relation.directed ? "有向关系" : "双向关系"} · {relation.evidenceIds.length} 个依据</small></div><ArrowRight size={13} /></button> : null)}</div>)}
                  </div>
                </section>
            </aside>
          </>
        ) : null}
      </main>

      <SidePanel open={Boolean(selectedEvidence)} onOpenChange={(open) => { if (!open) setSelectedEvidence(null); }} title="来源证据" description={selectedEvidence?.sourceTitle} wide>
        {evidenceDetail.isLoading ? <LoadingState label="正在定位原始资料" /> : null}
        {evidenceDetail.isError ? <ErrorState message={evidenceDetail.error.message} onRetry={() => evidenceDetail.refetch()} /> : null}
        {evidenceDetail.data ? (
          <div className="evidence-detail">
            <div className="source-meta-strip"><StatusBadge status={evidenceDetail.data.accessible ? "ready" : "failed"} label={evidenceDetail.data.accessible ? "原文可访问" : "原文不可访问"} /><span>{evidenceDetail.data.pageNumber ? `第 ${evidenceDetail.data.pageNumber} 页 · ` : evidenceDetail.data.blockLabel ? `${evidenceDetail.data.blockLabel} · ` : ""}字符 {evidenceDetail.data.charStart}–{evidenceDetail.data.charEnd}</span>{evidenceDetail.data.extractionMethod === "ocr" ? <span>{evidenceDetail.data.reviewStatus === "reviewed" ? `已人工校对 · 原始识别 ${Math.round(evidenceDetail.data.qualityScore ?? 0)} 分` : `文字识别 · ${Math.round(evidenceDetail.data.qualityScore ?? 0)} 分`}</span> : null}</div>
            <section><span className="eyebrow">引用内容</span><blockquote>{evidenceDetail.data.quote}</blockquote></section>
            <Link className="button button--primary button--full" to={`/sources?source=${encodeURIComponent(evidenceDetail.data.sourceId)}&version=${encodeURIComponent(evidenceDetail.data.sourceVersionId)}${evidenceDetail.data.pageNumber ? `&page=${evidenceDetail.data.pageNumber}` : evidenceDetail.data.blockNumber ? `&block=${evidenceDetail.data.blockNumber}` : ""}&start=${evidenceDetail.data.charStart}&end=${evidenceDetail.data.charEnd}`}><FileText size={15} />打开完整原始资料</Link>
            {sourceContent.isLoading ? <LoadingState label="正在读取原始资料" /> : null}
            {sourceContent.isError ? <ErrorState message={sourceContent.error.message} onRetry={() => sourceContent.refetch()} /> : null}
            {sourceContent.data ? (
              <section className="evidence-detail__document">
                <span className="eyebrow">原始资料</span>
                <SourceDocumentReader
                  source={sourceContent.data}
                  location={{ start: evidenceDetail.data.charStart, end: evidenceDetail.data.charEnd, pageNumber: evidenceDetail.data.pageNumber, blockNumber: evidenceDetail.data.blockNumber }}
                />
              </section>
            ) : evidenceDetail.data.context && !sourceContent.isLoading ? (
              <section><span className="eyebrow">原文上下文</span><ContextExcerpt evidence={evidenceDetail.data} /></section>
            ) : null}
          </div>
        ) : null}
      </SidePanel>
    </div>
  );
}

function ContextExcerpt({ evidence }: { evidence: Evidence }) {
  const start = evidence.matchStart ?? 0;
  const end = evidence.matchEnd ?? start;
  const context = evidence.context ?? "";
  return <pre className="context-excerpt">{context.slice(0, start)}<mark>{context.slice(start, end)}</mark>{context.slice(end)}</pre>;
}

function typeName(type: string) { return ({ concept: "概念", process: "流程", rule: "规则", system: "系统", role: "角色", domain: "领域", interface: "接口", metric: "指标", entity: "实体" } as Record<string, string>)[type] ?? type; }
function formatDate(value: string) { return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value)); }
