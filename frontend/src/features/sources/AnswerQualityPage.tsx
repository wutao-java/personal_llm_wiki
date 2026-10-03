import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle, ArrowRight, BookOpenText, CheckCircle2, ChevronLeft,
  ChevronRight, FileSearch, FileText, MessageSquareText, RefreshCw, Search,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import type { QualityAnswer } from "../../api/types";
import { EmptyState, ErrorState, LoadingState } from "../../components/AsyncState";
import { MarkdownView } from "../../components/MarkdownView";
import { PageHeader } from "../../components/PageHeader";
import { SidePanel } from "../../components/SidePanel";

type View = "overview" | "cases";
type Filter = "all" | "attention" | "reviewed" | "unreviewed";

const dimensions = [
  ["回答完整", "需要题目预期事实与人工逐条判断"],
  ["检索命中", "缺少预期知识和历史有序检索记录"],
  ["证据覆盖", "缺少必要证据标注与完整检索上下文"],
  ["引用有效", "引用可逐条核对，尚无全量判定"],
  ["忠于证据", "需要核对每条事实是否由原文支持"],
  ["诚实拒答", "需要标注问题是否可回答"],
  ["异常稳健", "需要预设失败场景并复测"],
] as const;

export function AnswerQualityPage() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<View>("overview");
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<QualityAnswer | null>(null);
  const params = new URLSearchParams({ status: view === "overview" ? "attention" : filter, page: String(view === "overview" ? 1 : page), pageSize: "30" });
  if (view === "cases" && query) params.set("query", query);
  const quality = useQuery({
    queryKey: ["answer-quality", params.toString()],
    queryFn: () => api.answerQuality(params),
  });
  const data = quality.data;
  const summary = data?.summary;
  const chooseView = (next: View) => {
    setView(next);
    setPage(1);
  };

  return (
    <div className="page page--quality">
      <PageHeader title="问答质量"
        description="查看真实回答与处理记录，逐条核对结论和引用；未建立评测题集前不生成质量分数。"
        actions={<button className="icon-button" type="button" aria-label="刷新问答质量" title="刷新问答质量" onClick={() => quality.refetch()}><RefreshCw size={17} /></button>}
      />
      {quality.isLoading ? <LoadingState label="正在读取问答记录" /> : null}
      {quality.isError ? <ErrorState message={quality.error.message} onRetry={() => quality.refetch()} /> : null}
      {data ? (
        <>
          <section className="quality-summary" aria-label="问答记录摘要">
            <div><span>回答记录</span><strong>{summary!.answerCount}</strong><small>已完成 {summary!.completedCount} · 证据不足 {summary!.insufficientCount}</small></div>
            <div><span>待定位</span><strong className="quality-summary__alert">{summary!.attentionCount}</strong><small>失败、无引用或人工标记，按回答去重</small></div>
            <div><span>人工核查</span><strong>{summary!.reviewedCount}</strong><small>其中 {summary!.issueCount} 条标记需处理</small></div>
          </section>
          <div className="segmented-tabs quality-tabs" role="tablist" aria-label="问答质量视图">
            <button role="tab" aria-selected={view === "overview"} className={view === "overview" ? "is-active" : ""} type="button" onClick={() => chooseView("overview")}>质量概览</button>
            <button role="tab" aria-selected={view === "cases"} className={view === "cases" ? "is-active" : ""} type="button" onClick={() => chooseView("cases")}>逐条核查</button>
          </div>
          {view === "overview" ? (
            <>
              <div className="quality-section-heading"><h2>评估维度</h2><span>尚无标准题集及可比评估记录</span></div>
              <div className="quality-dimensions">
                {dimensions.map(([name, reason]) => <div key={name}><span>{name}</span><strong>未评估</strong><small>{reason}</small></div>)}
              </div>
              <div className="quality-note">完成状态和引用数量只表示过程记录，不能当作回答正确率。跨知识版本成绩需同一题集与判定口径，目前不提供对比。</div>
              <div className="quality-section-heading"><h2>待处理记录</h2><button className="quality-link" type="button" onClick={() => { setFilter("attention"); chooseView("cases"); }}>查看问答 <ArrowRight size={15} /></button></div>
              <div className="quality-worklist">
                <section>
                  <h3><AlertTriangle size={17} /> 生成与引用</h3>
                  <p>回答失败 {summary!.failedCount} 条 · 已完成但无引用 {summary!.uncitedCount} 条</p>
                  <p>证据不足 {summary!.insufficientCount} 条需结合问题预期核对，不自动判为错误。</p>
                  {data.items.slice(0, 3).map((item) => (
                    <button className="quality-worklist__item" key={item.answerId} type="button" onClick={() => setSelected(item)}>
                      <span>{item.question}</span><ChevronRight size={16} />
                    </button>
                  ))}
                  {data.total === 0 ? <span className="quality-muted">{summary!.answerCount ? "没有待定位的问答" : "尚无问答记录"}</span> : null}
                </section>
                <section>
                  <h3><FileText size={17} /> 知识生成</h3>
                  <p>{summary!.compileFailureCount} 个未完成的编译任务</p>
                  {data.failedRuns.map((run) => (
                    <Link key={run.runId} className="quality-worklist__item" to={`/sources?run=${encodeURIComponent(run.runId)}`}>
                      <span>{run.error?.message ?? "知识生成未完成"}</span><ChevronRight size={16} />
                    </Link>
                  ))}
                  {!summary!.compileFailureCount ? <span className="quality-muted">没有失败的编译任务</span> : null}
                </section>
              </div>
            </>
          ) : (
            <section className="quality-cases">
              <div className="quality-section-heading"><h2>逐条核查</h2><span>共 {data.total} 条结果</span></div>
              <div className="quality-tools">
                <form onSubmit={(event) => { event.preventDefault(); setQuery(search.trim()); setPage(1); }} role="search">
                  <label className="search-field"><Search size={16} /><input aria-label="搜索问题" placeholder="搜索问题" maxLength={200} value={search} onChange={(event) => setSearch(event.target.value)} /></label>
                  <button className="button button--secondary" type="submit">搜索</button>
                </form>
                <label>状态 <select aria-label="筛选回答" value={filter} onChange={(event) => { setFilter(event.target.value as Filter); setPage(1); }}>
                  <option value="all">全部回答</option><option value="attention">待定位</option><option value="unreviewed">未核查</option><option value="reviewed">已核查</option>
                </select></label>
              </div>
              {!summary!.answerCount ? (
                <EmptyState icon={<MessageSquareText />} title="暂无问答记录" description="导入资料并发布知识后，在知识问答中提问，这里会显示真实回答以供核查。"
                  action={<Link className="button button--primary" to="/sources">导入资料 <ArrowRight size={15} /></Link>} />
              ) : data.items.length === 0 ? <EmptyState icon={<FileSearch />} title="没有匹配的回答" description="调整搜索词或筛选状态。" /> : (
                <div className="quality-case-list">
                  {data.items.map((item) => <button type="button" key={item.answerId} className="quality-case" onClick={() => setSelected(item)}>
                    <span className="quality-case__body"><strong>{item.question}</strong><small>{item.content || item.error?.message || "回答处理中"} · {new Date(item.createdAt).toLocaleString("zh-CN")}</small></span>
                    <span className={`quality-case__status${needsAttention(item) ? " quality-case__status--alert" : ""}`}>{answerLabel(item)}</span>
                    <ChevronRight size={17} />
                  </button>)}
                </div>
              )}
              {data.total > data.pageSize ? <div className="quality-pagination">
                <button className="button button--secondary" type="button" disabled={page === 1} onClick={() => setPage(page - 1)}><ChevronLeft size={15} />上一页</button>
                <span>第 {page} / {Math.ceil(data.total / data.pageSize)} 页</span>
                <button className="button button--secondary" type="button" disabled={page * data.pageSize >= data.total} onClick={() => setPage(page + 1)}>下一页 <ChevronRight size={15} /></button>
              </div> : null}
            </section>
          )}
        </>
      ) : null}
      <SidePanel open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelected(null); }} title="回答核查" description={selected?.snapshotVersion ? `知识版本 ${selected.snapshotVersion}` : undefined} wide>
        {selected ? <AnswerDetail key={selected.answerId} item={selected} onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ["answer-quality"] });
          setSelected(null);
        }} /> : null}
      </SidePanel>
    </div>
  );
}

function needsAttention(item: QualityAnswer) {
  return item.status === "failed" || (item.status === "completed" && item.usedSourceCount === 0) || item.review?.verdict === "issue";
}

function answerLabel(item: QualityAnswer) {
  if (item.review?.verdict === "issue") return "需处理";
  if (item.status === "failed") return "回答失败";
  if (item.status === "completed" && !item.usedSourceCount) return "无引用";
  if (item.review?.verdict === "accepted") return "核查通过";
  if (item.status === "insufficient") return "证据不足";
  if (item.status === "completed") return "未核查";
  return "处理中";
}

function AnswerDetail({ item, onSaved }: { item: QualityAnswer; onSaved: () => void }) {
  const [verdict, setVerdict] = useState<"accepted" | "issue">(item.review?.verdict ?? "accepted");
  const [category, setCategory] = useState(item.review?.category ?? "");
  const [note, setNote] = useState(item.review?.note ?? "");
  const save = useMutation({
    mutationFn: (next: "pending" | "accepted" | "issue") => api.reviewAnswer(item.answerId, { verdict: next, category, note }),
    onSuccess: onSaved,
  });
  return <div className="quality-detail">
    <div className="quality-detail__meta"><span className="quality-case__status">{answerLabel(item)}</span><span>{new Date(item.createdAt).toLocaleString("zh-CN")}</span><span>{item.modelId ?? "未使用在线模型"}</span></div>
    <h3>问题</h3><p>{item.question}</p>
    <h3>回答</h3>
    {item.content ? <div className="quality-detail__answer"><MarkdownView content={item.content} /></div> : <p>{item.error?.message ?? "回答尚未完成"}</p>}
    <Link className="quality-detail__link" to={`/conversations/${encodeURIComponent(item.conversationId)}`}>打开原对话 <ArrowRight size={15} /></Link>
    <h3>引用来源 <span>{item.citations.length}</span></h3>
    {item.citations.length ? item.citations.map((citation) => <div className="quality-citation" key={`${citation.index}-${citation.evidenceId}`}>
      <strong>[{citation.index}] {citation.sourceTitle}</strong>
      {citation.pageNumber || citation.blockLabel ? <small>{citation.pageNumber ? `第 ${citation.pageNumber} 页` : citation.blockLabel}</small> : null}
      <blockquote>{citation.quote}</blockquote>
      <div>
        <Link to={`/sources?source=${encodeURIComponent(citation.sourceId)}&version=${encodeURIComponent(citation.sourceVersionId)}${citation.pageNumber ? `&page=${citation.pageNumber}` : citation.blockNumber ? `&block=${citation.blockNumber}` : ""}`}>查看原文 <ArrowRight size={14} /></Link>
        {citation.knowledgeId ? <Link to={`/knowledge/${encodeURIComponent(citation.knowledgeId)}`}><BookOpenText size={14} />查看知识</Link> : null}
      </div>
    </div>) : <p className="quality-muted">此回答没有引用来源；不能仅凭完成状态判定为正确。</p>}
    {["completed", "insufficient", "failed"].includes(item.status) ? <section className="quality-review">
      <h3>人工核查</h3>
      <p>核查结果仅记录本次人工判断，不代表自动评估指标或跨版本成绩。</p>
      <div className="quality-review__options" role="group" aria-label="核查结果">
        <button type="button" className={verdict === "accepted" ? "is-active" : ""} onClick={() => setVerdict("accepted")}><CheckCircle2 size={15} />核查通过</button>
        <button type="button" className={verdict === "issue" ? "is-active" : ""} onClick={() => setVerdict("issue")}><AlertTriangle size={15} />需处理</button>
      </div>
      {verdict === "issue" ? <label>问题类别 <select value={category} onChange={(event) => setCategory(event.target.value)}>
        <option value="">请选择类别</option><option>回答内容</option><option>来源证据</option><option>引用</option><option>知识检索</option><option>其他</option>
      </select></label> : null}
      <label>核查说明 <textarea value={note} maxLength={1000} rows={3} onChange={(event) => setNote(event.target.value)} placeholder={verdict === "issue" ? "描述问题及需要核对的位置" : "可选：记录判断依据"} /></label>
      {save.isError ? <div className="inline-notice inline-notice--error" role="alert"><AlertTriangle size={16} /><div><strong>核查未保存</strong><span>{save.error.message}</span></div></div> : null}
      <div className="quality-review__actions">
        {item.review ? <button type="button" className="button button--secondary" disabled={save.isPending} onClick={() => save.mutate("pending")}>清除核查</button> : null}
        <button type="button" className="button button--primary" disabled={save.isPending || (verdict === "issue" && (!category || !note.trim()))} onClick={() => save.mutate(verdict)}>保存核查</button>
      </div>
    </section> : null}
  </div>;
}
