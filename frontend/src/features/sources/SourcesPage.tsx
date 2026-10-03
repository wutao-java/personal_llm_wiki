import * as Dialog from "@radix-ui/react-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleX,
  Clock3,
  ExternalLink,
  FileCheck2,
  FileText,
  FolderOpen,
  History,
  LoaderCircle,
  RefreshCw,
  Search,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, subscribeToEvents } from "../../api/client";
import type { CompileRun } from "../../api/types";
import { EmptyState, ErrorState, LoadingState } from "../../components/AsyncState";
import { PageHeader } from "../../components/PageHeader";
import { SidePanel } from "../../components/SidePanel";
import { SourceDocumentReader } from "../../components/SourceDocumentReader";
import { StatusBadge } from "../../components/StatusBadge";

type SourceTab = "library" | "active" | "history";
type RemovalAction = { kind: "source" | "cancel" | "record"; id: string; label: string };

const activeStatuses = new Set(["queued", "running", "publishing", "awaiting_review"]);
const supportedSourceName = /\.(md|markdown|txt|pdf|docx)$/i;
const stageOrder = [
  "validating",
  "importing",
  "extracting",
  "compiling",
  "relating",
  "validating_result",
  "awaiting_review",
  "publishing",
  "completed",
];
const stageLabel: Record<string, string> = {
  validating: "校验资料",
  importing: "写入版本",
  extracting: "读取证据",
  compiling: "生成知识",
  relating: "建立关系",
  validating_result: "校验结果",
  awaiting_review: "等待确认",
  publishing: "发布知识版本",
  completed: "处理完成",
  failed: "处理未完成",
  cancelled: "任务已取消",
};

export function SourcesPage() {
  const queryClient = useQueryClient();
  const [urlParams] = useSearchParams();
  const requestedRunId = urlParams.get("run");
  const [tab, setTab] = useState<SourceTab>("library");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 30;
  const [uploadOpen, setUploadOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [topic, setTopic] = useState("");
  const [dragging, setDragging] = useState(false);
  const [importResult, setImportResult] = useState<Awaited<ReturnType<typeof api.importSources>> | null>(null);
  const [ocrEdits, setOcrEdits] = useState<Record<number, string>>({});
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(urlParams.get("source"));
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(urlParams.get("version"));
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [removalAction, setRemovalAction] = useState<RemovalAction | null>(null);
  const restoredRun = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const requestedPage = Number(urlParams.get("page"));
  const requestedBlock = Number(urlParams.get("block"));
  const requestedStart = urlParams.get("start");
  const requestedEnd = urlParams.get("end");

  const sourceParams = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (search.trim()) sourceParams.set("query", search.trim());
  const sources = useQuery({
    queryKey: ["sources", search, page],
    queryFn: () => api.sources(sourceParams.toString()),
  });
  const pageCount = Math.max(1, Math.ceil((sources.data?.total ?? 0) / pageSize));
  useEffect(() => {
    if (sources.data && page > pageCount) setPage(pageCount);
  }, [sources.data, page, pageCount]);
  const runs = useQuery({ queryKey: ["compile-runs"], queryFn: () => api.compileRuns() });
  const selectedSource = useQuery({
    queryKey: ["source", selectedSourceId],
    queryFn: () => api.source(selectedSourceId!),
    enabled: Boolean(selectedSourceId),
  });
  const effectiveVersionId = selectedVersionId ?? selectedSource.data?.currentVersionId ?? null;
  const sourceContent = useQuery({
    queryKey: ["source-content", effectiveVersionId],
    queryFn: () => api.sourceContent(effectiveVersionId!),
    enabled: Boolean(effectiveVersionId),
  });
  const start = requestedStart === null ? NaN : Number(requestedStart);
  const end = requestedEnd === null ? NaN : Number(requestedEnd);
  const citedRange = selectedSourceId === urlParams.get("source")
    && effectiveVersionId === urlParams.get("version")
    ? { start, end, pageNumber: requestedPage, blockNumber: requestedBlock } : null;
  const pendingOcrPages = sourceContent.data?.pageSpans.filter((page) => page.reviewStatus === "needs_review") ?? [];
  useEffect(() => {
    if (!sourceContent.data) return;
    setOcrEdits(Object.fromEntries(sourceContent.data.pageSpans
      .filter((page) => page.reviewStatus === "needs_review")
      .map((page) => [page.pageNumber, sourceContent.data!.content?.slice(page.charStart, page.charEnd) ?? ""])));
  }, [sourceContent.data]);
  const activeRun = useQuery({
    queryKey: ["compile-run", activeRunId],
    queryFn: () => api.compileRun(activeRunId!),
    enabled: Boolean(activeRunId),
    refetchInterval: (query) => {
      const status = (query.state.data as CompileRun | undefined)?.status;
      return status && activeStatuses.has(status) ? 1500 : false;
    },
  });
  const review = useQuery({
    queryKey: ["compile-review", activeRunId],
    queryFn: () => api.compileReview(activeRunId!),
    enabled: Boolean(activeRunId && activeRun.data?.status === "awaiting_review"),
  });

  useEffect(() => {
    if (!runs.data || restoredRun.current) return;
    restoredRun.current = true;
    const requested = runs.data.items.find((run) => run.runId === requestedRunId);
    if (requested) {
      setActiveRunId(requested.runId);
      setTab(activeStatuses.has(requested.status) ? "active" : "history");
      return;
    }
    if (requestedRunId) {
      setActiveRunId(requestedRunId);
      return;
    }
    const pending = runs.data.items.find((run) => activeStatuses.has(run.status));
    if (pending) {
      setActiveRunId(pending.runId);
      setTab("active");
    }
  }, [runs.data, requestedRunId]);
  useEffect(() => {
    if (requestedRunId && activeRun.data?.runId === requestedRunId) {
      setTab(activeStatuses.has(activeRun.data.status) ? "active" : "history");
    }
  }, [requestedRunId, activeRun.data]);

  useEffect(() => {
    if (!activeRunId) return;
    const close = subscribeToEvents(
      `/compile-runs/${activeRunId}/events`,
      ["compile", "error"],
      () => {
        queryClient.invalidateQueries({ queryKey: ["compile-run", activeRunId] });
        queryClient.invalidateQueries({ queryKey: ["compile-runs"] });
        queryClient.invalidateQueries({ queryKey: ["bootstrap"] });
      },
      () => void api.compileRun(activeRunId).then((run) => {
        queryClient.setQueryData(["compile-run", activeRunId], run);
      }).catch(() => undefined),
    );
    return close;
  }, [activeRunId, queryClient]);

  const importMutation = useMutation({
    mutationFn: () => api.importSources(files, topic),
    onSuccess: (result) => {
      setImportResult(result);
      setFiles([]);
      if (result.runId && !result.items.some((item) => item.status === "needs_review")) {
        setActiveRunId(result.runId);
        setUploadOpen(false);
        setTab("active");
      }
      queryClient.invalidateQueries({ queryKey: ["sources"] });
      queryClient.invalidateQueries({ queryKey: ["compile-runs"] });
      queryClient.invalidateQueries({ queryKey: ["bootstrap"] });
    },
  });
  const acceptMutation = useMutation({
    mutationFn: (runId: string) => api.acceptCompile(runId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compile-run", activeRunId] });
      queryClient.invalidateQueries({ queryKey: ["compile-runs"] });
      queryClient.invalidateQueries({ queryKey: ["sources"] });
      queryClient.invalidateQueries({ queryKey: ["bootstrap"] });
      queryClient.invalidateQueries({ queryKey: ["graph"] });
      queryClient.invalidateQueries({ queryKey: ["knowledge"] });
    },
  });
  const retryMutation = useMutation({
    mutationFn: (runId: string) => api.retryCompile(runId),
    onSuccess: (run) => {
      setActiveRunId(run.runId);
      setTab("active");
      queryClient.invalidateQueries({ queryKey: ["compile-runs"] });
    },
  });
  const removalMutation = useMutation({
    mutationFn: async (action: RemovalAction) => {
      if (action.kind === "source") await api.removeSource(action.id);
      else if (action.kind === "cancel") await api.cancelCompile(action.id);
      else await api.deleteCompile(action.id);
    },
    onSuccess: (_, action) => {
      if (action.kind === "source" && selectedSourceId === action.id) {
        setSelectedSourceId(null);
        setSelectedVersionId(null);
      }
      if (action.kind !== "source" && activeRunId === action.id) setActiveRunId(null);
      setRemovalAction(null);
      for (const key of ["sources", "source", "compile-runs", "compile-run", "compile-review", "bootstrap", "knowledge", "knowledge-detail", "graph", "suggested-questions"]) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
    },
  });
  const confirmRemoval = (action: RemovalAction) => {
    removalMutation.reset();
    setRemovalAction(action);
  };

  const ocrReviewMutation = useMutation({
    mutationFn: () => api.reviewOcrPages(effectiveVersionId!, pendingOcrPages.map((page) => ({
      pageNumber: page.pageNumber, text: ocrEdits[page.pageNumber] ?? "",
    }))),
    onSuccess: (run) => {
      setActiveRunId(run.runId);
      setSelectedSourceId(null);
      setSelectedVersionId(null);
      setTab("active");
      queryClient.invalidateQueries({ queryKey: ["sources"] });
      queryClient.invalidateQueries({ queryKey: ["source-content", effectiveVersionId] });
      queryClient.invalidateQueries({ queryKey: ["compile-runs"] });
      queryClient.invalidateQueries({ queryKey: ["bootstrap"] });
    },
  });
  const allRuns = runs.data?.items ?? [];
  const activeItems = allRuns.filter((run) => activeStatuses.has(run.status));
  const historyItems = allRuns.filter((run) => !activeStatuses.has(run.status));
  const displayedRuns = tab === "active" ? activeItems : historyItems;
  const currentRun = activeRun.data ?? allRuns.find((run) => run.runId === activeRunId);
  const runPanelOpen = Boolean(activeRunId);

  const fileSummary = useMemo(() => ({
    total: files.length,
    bytes: files.reduce((total, file) => total + file.size, 0),
    unsupported: files.filter((file) => !supportedSourceName.test(file.name)).length,
  }), [files]);

  const addFiles = (incoming: FileList | File[]) => {
    const next = Array.from(incoming);
    setFiles((current) => {
      const bySignature = new Map(current.map((file) => [`${file.name}:${file.size}:${file.lastModified}`, file]));
      next.forEach((file) => bySignature.set(`${file.name}:${file.size}:${file.lastModified}`, file));
      return Array.from(bySignature.values());
    });
    setImportResult(null);
  };

  return (
    <div className="page page--sources">
      <PageHeader
        eyebrow="资料管理"
        title="资料与知识生成"
        description="管理原始资料版本，查看每次知识生成的真实处理进度，并在确认后发布新的知识版本。"
        actions={<button className="button button--primary" type="button" onClick={() => setUploadOpen(true)}><UploadCloud size={16} />导入资料</button>}
      />

      <div className="metric-row">
        <Metric icon={<FolderOpen size={18} />} label="已入库资料" value={sources.data?.total ?? 0} />
        <Metric icon={<LoaderCircle size={18} />} label="进行中任务" value={activeItems.filter((run) => run.status !== "awaiting_review").length} tone="blue" />
        <Metric icon={<Clock3 size={18} />} label="等待确认" value={activeItems.filter((run) => run.status === "awaiting_review").length} tone="amber" />
        <Metric icon={<CheckCircle2 size={18} />} label="已完成任务" value={historyItems.filter((run) => run.status === "completed").length} tone="green" />
      </div>

      <div className="segmented-tabs" role="tablist" aria-label="资料管理视图">
        <button className={tab === "library" ? "is-active" : ""} onClick={() => setTab("library")} type="button"><FileText size={15} />已入库资料 <span>{sources.data?.total ?? 0}</span></button>
        <button className={tab === "active" ? "is-active" : ""} onClick={() => setTab("active")} type="button"><LoaderCircle size={15} />处理任务 <span>{activeItems.length}</span></button>
        <button className={tab === "history" ? "is-active" : ""} onClick={() => setTab("history")} type="button"><History size={15} />处理记录 <span>{historyItems.length}</span></button>
      </div>

      {tab === "library" ? (
        <section className="content-card source-library">
          <div className="table-toolbar">
            <label className="search-field"><Search size={15} /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="搜索资料名称或文件名" /></label>
            <span>原始资料以只读版本保留</span>
          </div>
          {sources.isLoading ? <LoadingState label="正在读取资料" /> : null}
          {sources.isError ? <ErrorState message={sources.error.message} onRetry={() => sources.refetch()} /> : null}
          {sources.data?.items.length === 0 ? (
            <EmptyState
              icon={<FileText />}
              title={search ? "没有找到资料" : "尚未导入资料"}
              description={search ? "调整搜索词或导入资料。" : "选择 Markdown、文本、DOCX 或 PDF 开始建立知识库。"}
              action={!search ? <button className="button button--primary" type="button" onClick={() => setUploadOpen(true)}><UploadCloud size={16} />导入资料</button> : undefined}
            />
          ) : null}
          <footer className="directory-pagination">
            <span>{page} / {pageCount}</span>
            <button className="icon-button" type="button" title="上一页资料" aria-label="上一页资料" disabled={page <= 1 || sources.isFetching} onClick={() => setPage(page - 1)}><ChevronLeft size={16} /></button>
            <button className="icon-button" type="button" title="下一页资料" aria-label="下一页资料" disabled={page >= pageCount || sources.isFetching} onClick={() => setPage(page + 1)}><ChevronRight size={16} /></button>
          </footer>
          {sources.data?.items.length ? (
            <div className="data-table" role="table">
              <div className="data-table__head" role="row"><span>资料</span><span>领域</span><span>版本</span><span>关联知识</span><span>状态</span><span>更新时间</span><span>操作</span></div>
              {sources.data.items.map((source) => (
                <div className="data-table__row" role="row" key={source.sourceId}>
                  <button className="data-table__open" type="button" onClick={() => { setSelectedSourceId(source.sourceId); setSelectedVersionId(source.currentVersionId); }}>
                    <span className="source-cell"><i><FileText size={17} /></i><span><strong>{source.title}</strong><small>{source.filename}</small></span></span>
                    <span>{domainName(source.domain)}</span>
                    <span>{source.versionCount} 个版本</span>
                    <span>{source.knowledgeCount} 条</span>
                    <span><StatusBadge status={source.status} /></span>
                    <span>{formatDate(source.updatedAt)}</span>
                  </button>
                  <div className="data-table__actions"><ChevronRight size={15} /><button className="icon-button" type="button" title="移出资料" aria-label={`移出资料 ${source.title}`} onClick={() => confirmRemoval({ kind: "source", id: source.sourceId, label: source.title })}><Trash2 size={15} /></button></div>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ) : (
        <section className="run-list">
          {runs.isLoading ? <LoadingState label="正在读取处理任务" /> : null}
          {runs.isError ? <ErrorState message={runs.error.message} onRetry={() => runs.refetch()} /> : null}
          {!runs.isLoading && displayedRuns.length === 0 ? (
            <EmptyState
              icon={tab === "active" ? <LoaderCircle /> : <History />}
              title={tab === "active" ? "当前没有进行中的任务" : "当前没有处理记录"}
              description={tab === "active" ? "导入资料后，知识生成状态会实时显示在这里。" : "已结束的处理任务会保留在这里，可单独清理记录。"}
            />
          ) : null}
          {displayedRuns.map((run) => <RunCard key={run.runId} run={run} onOpen={() => setActiveRunId(run.runId)} onRetry={() => retryMutation.mutate(run.runId)} onRemove={() => confirmRemoval({ kind: activeStatuses.has(run.status) ? "cancel" : "record", id: run.runId, label: run.runId })} />)}
        </section>
      )}

      <SidePanel open={uploadOpen} onOpenChange={setUploadOpen} title="导入资料" description="支持 Markdown、UTF-8 文本、DOCX 和 PDF；扫描页需本机 OCR。单个文件不超过 10 MB。" wide>
        <label className="import-topic-field">
          <span>专题</span>
          <input list="import-topic-options" value={topic} maxLength={64} onChange={(event) => setTopic(event.target.value)} placeholder="选择或输入专题" />
          <datalist id="import-topic-options"><option value="Java" /><option value="Python" /><option value="Agent" /></datalist>
        </label>
        <div
          className={`upload-dropzone${dragging ? " is-dragging" : ""}`}
          onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => { event.preventDefault(); setDragging(false); addFiles(event.dataTransfer.files); }}
        >
          <UploadCloud size={30} />
          <strong>将资料拖到这里</strong>
          <span>或者从电脑中选择文件</span>
          <button className="button button--secondary" type="button" onClick={() => fileInput.current?.click()}>选择文件</button>
          <input ref={fileInput} hidden multiple type="file" accept=".md,.markdown,.txt,.pdf,.docx,text/markdown,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => event.target.files && addFiles(event.target.files)} />
        </div>
        {files.length ? (
          <div className="upload-files">
            <header><strong>待导入资料</strong><span>{fileSummary.total} 个文件 · {formatBytes(fileSummary.bytes)}</span></header>
            {files.map((file) => {
              const supported = supportedSourceName.test(file.name);
              return <div key={`${file.name}:${file.lastModified}`}><FileText size={16} /><span><strong>{file.name}</strong><small>{formatBytes(file.size)}</small></span>{supported ? <FileCheck2 className="success-icon" size={17} /> : <AlertTriangle className="error-icon" size={17} />}<button type="button" onClick={() => setFiles((current) => current.filter((item) => item !== file))}>移除</button></div>;
            })}
          </div>
        ) : null}
        {importResult ? <ImportResult result={importResult} onReview={(sourceId, versionId) => { setUploadOpen(false); setTab("library"); setSelectedSourceId(sourceId); setSelectedVersionId(versionId); }} /> : null}
        {importMutation.isError ? <div className="inline-notice inline-notice--error"><AlertTriangle size={17} /><div><strong>资料未能导入</strong><span>{importMutation.error.message}</span></div></div> : null}
        <div className="panel-actions">
          <button className="button button--secondary" type="button" onClick={() => setUploadOpen(false)}>取消</button>
          <button className="button button--primary" type="button" disabled={!files.length || fileSummary.unsupported > 0 || importMutation.isPending} onClick={() => importMutation.mutate()}>{importMutation.isPending ? <LoaderCircle className="spin" size={16} /> : <UploadCloud size={16} />}导入并生成知识</button>
        </div>
      </SidePanel>

      <SidePanel open={Boolean(selectedSourceId)} onOpenChange={(open) => { if (!open) { setSelectedSourceId(null); setSelectedVersionId(null); } }} title={selectedSource.data?.title ?? "资料内容"} description={selectedSource.data?.filename} wide>
        {selectedSource.isLoading || sourceContent.isLoading ? <LoadingState label="正在读取资料版本" /> : null}
        {selectedSource.isError ? <ErrorState message={selectedSource.error.message} onRetry={() => selectedSource.refetch()} /> : null}
        {sourceContent.isError ? <ErrorState message={sourceContent.error.message} onRetry={() => sourceContent.refetch()} /> : null}
        {selectedSource.data ? (
          <>
            <div className="source-meta-strip">
              <StatusBadge status={selectedSource.data.status} />
              <span>{domainName(selectedSource.data.domain)}</span>
              <span>{selectedSource.data.knowledgeCount} 条关联知识</span>
              <span>{formatBytes(sourceContent.data?.sizeBytes ?? 0)}</span>
              {sourceContent.data && ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(sourceContent.data.mimeType) && effectiveVersionId ? (
                <a className="source-original-link" href={`/api/v1/source-versions/${encodeURIComponent(effectiveVersionId)}/original${sourceContent.data.mimeType === "application/pdf" && effectiveVersionId === urlParams.get("version") && requestedPage ? `#page=${requestedPage}` : ""}`} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} />{sourceContent.data.mimeType === "application/pdf" ? "查看 PDF 原件" : "下载 Word 原件"}</a>
              ) : null}
            </div>
            <div className="version-switcher">
              <span>资料版本</span>
              <div>{selectedSource.data.versions.map((version) => <button className={effectiveVersionId === version.sourceVersionId ? "is-active" : ""} key={version.sourceVersionId} onClick={() => setSelectedVersionId(version.sourceVersionId)} type="button">v{version.version}</button>)}</div>
            </div>
            {sourceContent.data ? <SourceDocumentReader source={sourceContent.data} location={citedRange} /> : null}
            {pendingOcrPages.length ? <section className="ocr-review">
              <header><AlertTriangle size={17} /><div><h3>核对扫描页文字</h3><p>请对照 PDF 原件核对全部待复核页；确认前这些文字不会用于知识或回答。</p></div></header>
              {pendingOcrPages.map((page) => <label key={page.pageNumber}>
                <span>第 {page.pageNumber} 页 · 原始识别 {Math.round(page.qualityScore ?? 0)} 分</span>
                <textarea aria-label={`第 ${page.pageNumber} 页校对文字`} value={ocrEdits[page.pageNumber] ?? ""} onChange={(event) => setOcrEdits((current) => ({ ...current, [page.pageNumber]: event.target.value }))} rows={7} maxLength={200000} />
                <small>{(ocrEdits[page.pageNumber] ?? "").replace(/\s/g, "").length} / 40 个可引用字符</small>
              </label>)}
              {ocrReviewMutation.isError ? <div className="inline-notice inline-notice--error"><AlertTriangle size={16} /><div><strong>文字未提交</strong><span>{ocrReviewMutation.error.message}</span></div></div> : null}
              <button className="button button--primary" type="button" disabled={ocrReviewMutation.isPending || pendingOcrPages.some((page) => (ocrEdits[page.pageNumber] ?? "").replace(/\s/g, "").length < 40)} onClick={() => ocrReviewMutation.mutate()}>{ocrReviewMutation.isPending ? <LoaderCircle className="spin" size={16} /> : <CheckCircle2 size={16} />}确认文字并生成知识</button>
            </section> : null}
          </>
        ) : null}
      </SidePanel>

      <SidePanel open={runPanelOpen} onOpenChange={(open) => { if (!open) setActiveRunId(null); }} title="知识生成任务" wide>
        {activeRun.isLoading ? <LoadingState label="正在读取任务状态" /> : null}
        {activeRun.isError ? <ErrorState message={activeRun.error.message} onRetry={() => activeRun.refetch()} /> : null}
        {currentRun ? (
          <div className="run-detail">
            <div className="run-detail__summary"><StatusBadge status={currentRun.status} /><span>{formatDateTime(currentRun.updatedAt)}</span></div>
            <BatchProgress run={currentRun} />
            <RunTimings run={currentRun} />
            <CompileTimeline run={currentRun} />
            <div className="run-count-grid">
              <Count label="已读取资料" value={currentRun.counts.sourcesRead ?? 0} />
              <Count label="证据片段" value={currentRun.counts.evidenceFragments ?? 0} />
              <Count label="已生成知识" value={currentRun.counts.knowledgeCandidates ?? 0} />
              <Count label="已生成关系" value={currentRun.counts.relationCandidates ?? 0} />
              <Count label="新增知识" value={currentRun.counts.knowledgeAdded ?? 0} />
              <Count label="更新知识" value={currentRun.counts.knowledgeUpdated ?? 0} />
              <Count label="有效关系" value={currentRun.counts.relationsValid ?? 0} />
              <Count label="需要注意" value={currentRun.counts.warnings ?? 0} />
            </div>
            {currentRun.error ? <div className="inline-notice inline-notice--error"><AlertTriangle size={17} /><div><strong>任务未完成</strong><span>{currentRun.error.message}</span></div></div> : null}
            {currentRun.issues.length ? <div className="issue-list"><strong>处理说明</strong>{currentRun.issues.map((issue, index) => <div key={`${issue.code}-${index}`}><AlertTriangle size={14} /><span>{issue.message}</span></div>)}</div> : null}
            {currentRun.status === "awaiting_review" ? (
              <section className="review-summary">
                <header><div><span className="eyebrow">轻量审核</span><h3>确认本次知识变更</h3></div><StatusBadge status="awaiting_review" /></header>
                {review.isLoading ? <LoadingState label="正在整理审核摘要" /> : null}
                {review.data ? (
                  <>
                    <div className="review-numbers"><Count label="新增" value={review.data.summary.added ?? 0} /><Count label="更新" value={review.data.summary.updated ?? 0} /><Count label="关系" value={review.data.summary.relations ?? 0} /><Count label="警告" value={review.data.summary.warnings ?? 0} /></div>
                    <div className="review-items">{review.data.knowledgeItems.slice(0, 8).map((item, index) => <div key={String(item.knowledgeId ?? index)}><FileText size={15} /><span><strong>{String(item.title ?? "未命名知识")}</strong><small>{String(item.summary ?? "")}</small></span><StatusBadge status="accepted" label={item.changeType === "updated" ? "更新" : "新增"} /></div>)}</div>
                    <p>确认后将生成新的知识版本；知识页面、图谱和后续问答会同步使用该版本。</p>
                    <button className="button button--primary button--full" type="button" disabled={acceptMutation.isPending} onClick={() => acceptMutation.mutate(currentRun.runId)}>{acceptMutation.isPending ? <LoaderCircle className="spin" size={16} /> : <CheckCircle2 size={16} />}确认并发布知识版本</button>
                  </>
                ) : null}
              </section>
            ) : null}
            {["failed", "interrupted"].includes(currentRun.status) ? <button className="button button--primary button--full" type="button" disabled={retryMutation.isPending} onClick={() => retryMutation.mutate(currentRun.runId)}><RefreshCw size={16} />重新处理</button> : null}
            <button className="button button--secondary button--full" type="button" onClick={() => confirmRemoval({ kind: activeStatuses.has(currentRun.status) ? "cancel" : "record", id: currentRun.runId, label: currentRun.runId })}>{activeStatuses.has(currentRun.status) ? <CircleX size={16} /> : <Trash2 size={16} />}{activeStatuses.has(currentRun.status) ? "取消任务" : "删除记录"}</button>
          </div>
        ) : null}
      </SidePanel>

      <Dialog.Root open={Boolean(removalAction)} onOpenChange={(open) => { if (!open && !removalMutation.isPending) setRemovalAction(null); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="removal-dialog">
            <Dialog.Title>{removalAction?.kind === "source" ? "移出资料" : removalAction?.kind === "cancel" ? "取消任务" : "删除处理记录"}</Dialog.Title>
            <Dialog.Description>
              {removalAction?.kind === "source"
                ? `确定移出「${removalAction.label}」吗？当前知识中由它支持的页面、关系及检索结果会移除；同时依赖其他资料的知识也会整页移除，避免保留旧结论。历史知识版本、引用证据和原件仍可查看。`
                : removalAction?.kind === "cancel"
                  ? "确定取消这项任务吗？正在进行的处理会停止，未发布的结果不会进入当前知识。"
                  : "确定删除这条处理记录吗？任务事件会一并清理，已发布知识、历史版本和原始资料不受影响。"}
            </Dialog.Description>
            {removalMutation.isError ? <div className="inline-notice inline-notice--error" role="alert"><AlertTriangle size={16} /><div><strong>操作未完成</strong><span>{removalMutation.error.message}</span></div></div> : null}
            <div className="removal-dialog__actions">
              <button className="button button--secondary" type="button" disabled={removalMutation.isPending} onClick={() => setRemovalAction(null)}>返回</button>
              <button className="button button--danger" type="button" disabled={removalMutation.isPending} onClick={() => removalAction && removalMutation.mutate(removalAction)}>{removalMutation.isPending ? <LoaderCircle className="spin" size={16} /> : removalAction?.kind === "cancel" ? <CircleX size={16} /> : <Trash2 size={16} />}{removalAction?.kind === "source" ? "确认移出" : removalAction?.kind === "cancel" ? "确认取消" : "确认删除"}</button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

function Metric({ icon, label, value, tone = "default" }: { icon: React.ReactNode; label: string; value: number; tone?: string }) {
  return <div className={`metric-card metric-card--${tone}`}><i>{icon}</i><div><strong>{value}</strong><span>{label}</span></div></div>;
}

function RunCard({ run, onOpen, onRetry, onRemove }: { run: CompileRun; onOpen: () => void; onRetry: () => void; onRemove: () => void }) {
  return <article className="run-card"><div className="run-card__icon">{activeStatuses.has(run.status) ? <LoaderCircle className={run.status !== "awaiting_review" ? "spin" : ""} size={20} /> : run.status === "completed" ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}</div><div className="run-card__main"><header><div><strong>{stageLabel[run.stage] ?? "知识生成任务"}</strong><span>{run.sourceVersionIds.length} 个资料版本 · {formatDateTime(run.createdAt)}</span></div><StatusBadge status={run.status} /></header><BatchProgress run={run} /><div className="run-card__stats"><span>{run.counts.evidenceFragments ?? 0} 个证据片段</span><span>{run.counts.knowledgeCandidates ?? ((run.counts.knowledgeAdded ?? 0) + (run.counts.knowledgeUpdated ?? 0))} 条已生成知识</span><span>{run.counts.relationCandidates ?? run.counts.relationsValid ?? 0} 条已生成关系</span></div><RunTimings run={run} /></div><div className="run-card__actions">{["failed", "interrupted"].includes(run.status) ? <button className="button button--ghost" onClick={onRetry} type="button"><RefreshCw size={14} />重新处理</button> : null}<button className="button button--secondary" onClick={onOpen} type="button">查看详情 <ChevronRight size={14} /></button><button className="icon-button" type="button" title={activeStatuses.has(run.status) ? "取消任务" : "删除记录"} aria-label={`${activeStatuses.has(run.status) ? "取消任务" : "删除记录"} ${formatDateTime(run.createdAt)}`} onClick={onRemove}>{activeStatuses.has(run.status) ? <CircleX size={16} /> : <Trash2 size={16} />}</button></div></article>;
}

function BatchProgress({ run }: { run: CompileRun }) {
  const total = run.counts.batchesTotal ?? 0;
  if (total <= 0) return null;
  const completed = Math.max(0, Math.min(total, run.counts.batchesCompleted ?? 0));
  const inFlight = run.status === "running" ? (run.counts.batchesInFlight ?? 0) : 0;
  const label = `已完成 ${completed} / ${total} 批`;
  return <div className="run-batches">
    <div className="run-card__stats"><span>{label}</span>{inFlight > 0 ? <span>{inFlight} 批处理中</span> : null}{(run.counts.batchesReused ?? 0) > 0 ? <span>已复用 {run.counts.batchesReused} 批</span> : null}{(run.counts.batchesRetried ?? 0) > 0 ? <span>已重试 {run.counts.batchesRetried} 次</span> : null}</div>
    <div className="run-progress" role="progressbar" aria-label="知识生成进度" aria-valuemin={0} aria-valuemax={total} aria-valuenow={completed} aria-valuetext={label}><i style={{ width: `${completed / total * 100}%` }} /></div>
  </div>;
}

function RunTimings({ run }: { run: CompileRun }) {
  return <div className="run-card__stats run-timings">
    {run.counts.extractionDurationMs !== undefined ? <span>读取耗时 {formatDuration(run.counts.extractionDurationMs)}</span> : null}
    {run.counts.compileDurationMs !== undefined ? <span>生成耗时 {formatDuration(run.counts.compileDurationMs)}</span> : null}
    {run.counts.lastBatchDurationMs !== undefined ? <span>最近一批 {formatDuration(run.counts.lastBatchDurationMs)}</span> : null}
  </div>;
}

function CompileTimeline({ run }: { run: CompileRun }) {
  const currentIndex = Math.max(0, stageOrder.indexOf(run.stage));
  return <ol className="compile-timeline">{stageOrder.slice(0, -1).map((stage, index) => { const done = run.status === "completed" || index < currentIndex; const current = index === currentIndex && activeStatuses.has(run.status); return <li key={stage} className={`${done ? "is-done" : ""}${current ? " is-current" : ""}`}><i>{done ? <CheckCircle2 size={14} /> : current ? <LoaderCircle className={run.status === "awaiting_review" ? "" : "spin"} size={14} /> : <span />}</i><div><strong>{stageLabel[stage]}</strong>{current ? <small>{run.status === "awaiting_review" ? "请确认本次知识变更" : "正在处理当前阶段"}</small> : null}</div></li>; })}</ol>;
}

function Count({ label, value }: { label: string; value: number }) { return <div><strong>{value}</strong><span>{label}</span></div>; }

function ImportResult({ result, onReview }: {
  result: Awaited<ReturnType<typeof api.importSources>>;
  onReview: (sourceId: string, versionId: string) => void;
}) {
  return <div className="import-result"><strong>导入结果</strong>{result.items.map((item) => <div key={item.filename}>
    <StatusBadge status={item.status === "imported" ? "ready" : item.status === "duplicate" ? "accepted" : item.status === "needs_review" ? "needs_review" : "failed"} label={item.status === "imported" ? "已接收" : item.status === "duplicate" ? "内容已存在" : item.status === "needs_review" ? "待核对" : "未导入"} />
    <span><b>{item.filename}</b><small>{item.message}</small></span>
    {item.status === "needs_review" && item.sourceId && item.sourceVersionId ? <button className="button button--secondary" type="button" onClick={() => onReview(item.sourceId!, item.sourceVersionId!)}>核对文字</button> : null}
  </div>)}</div>;
}

function domainName(domain: string) { return ({ project: "项目与角色", catalog: "商品与库存", order: "订单与支付", fulfillment: "履约与售后", service: "客户服务", knowledge: "知识", system: "系统与接口", quality: "质量、安全与运营" } as Record<string, string>)[domain] ?? domain; }
function formatBytes(bytes: number) { if (!bytes) return "0 B"; const units = ["B", "KB", "MB", "GB"]; const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1); return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`; }
function formatDate(value: string) { return new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit", year: "numeric" }).format(new Date(value)); }
function formatDateTime(value: string) { return new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }
function formatDuration(milliseconds: number) {
  if (milliseconds < 1000) return "不足 1 秒";
  const seconds = Math.round(milliseconds / 1000);
  return seconds < 60 ? `${seconds} 秒` : `${Math.floor(seconds / 60)} 分 ${seconds % 60} 秒`;
}
