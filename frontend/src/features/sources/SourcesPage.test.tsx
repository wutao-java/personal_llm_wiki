import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../../api/client";
import type { CompileRun, SourceSummary, SourceVersion } from "../../api/types";
import { SourcesPage } from "./SourcesPage";

vi.mock("../../api/client", async (importOriginal) => ({
  ...await importOriginal<typeof import("../../api/client")>(),
  subscribeToEvents: vi.fn(() => () => undefined),
}));

const source: SourceSummary = {
  sourceId: "SRC-1", title: "Python 笔记", filename: "python.md", domain: "Python",
  documentType: "markdown", currentVersionId: "SV-1", versionCount: 1,
  status: "ready", knowledgeCount: 2, importedAt: "2026-09-28T09:00:00Z",
  updatedAt: "2026-09-28T09:00:00Z",
};
const run = (id: string, status: string): CompileRun => ({
  runId: id, status, stage: status === "completed" ? "completed" : "awaiting_review",
  sourceVersionIds: ["SV-1"], counts: {}, issues: [],
  createdAt: "2026-09-28T09:00:00Z", updatedAt: "2026-09-28T09:00:00Z",
});

function showPage(path = "/sources") {
  render(<MemoryRouter initialEntries={[path]}><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><SourcesPage /></QueryClientProvider></MemoryRouter>);
}

afterEach(() => {
  cleanup();
  delete (Element.prototype as Partial<Element>).scrollIntoView;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("SourcesPage pagination", () => {
  it("loads later sources and resets the page when searching", async () => {
    const list = vi.spyOn(api, "sources").mockResolvedValue({ items: [source], total: 61 });
    vi.spyOn(api, "compileRuns").mockResolvedValue({ items: [] });
    showPage();
    const next = await screen.findByRole("button", { name: "下一页资料" });
    await waitFor(() => expect(next).toBeEnabled());
    fireEvent.click(next);
    await waitFor(() => expect(new URLSearchParams(list.mock.calls.at(-1)![0]).get("page")).toBe("2"));
    fireEvent.change(screen.getByPlaceholderText("搜索资料名称或文件名"), { target: { value: "Python" } });
    await waitFor(() => {
      const params = new URLSearchParams(list.mock.calls.at(-1)![0]);
      expect(params.get("page")).toBe("1");
      expect(params.get("query")).toBe("Python");
    });
  });
});

describe("SourcesPage compilation progress", () => {
  it("shows persisted batch progress, active requests, candidates, and timings", async () => {
    const current: CompileRun = {
      ...run("RUN-PROGRESS", "running"), stage: "compiling",
      counts: {
        batchesTotal: 10, batchesCompleted: 4, batchesInFlight: 3, batchesReused: 2,
        batchesRetried: 1, knowledgeCandidates: 7, relationCandidates: 5,
        compileDurationMs: 83000, lastBatchDurationMs: 12500, extractionDurationMs: 400,
      },
    };
    vi.spyOn(api, "sources").mockResolvedValue({ items: [], total: 0 });
    vi.spyOn(api, "compileRuns").mockResolvedValue({ items: [current] });
    vi.spyOn(api, "compileRun").mockResolvedValue(current);
    showPage();
    const detail = await screen.findByRole("dialog", { name: "知识生成任务" });
    const progress = within(detail).getByRole("progressbar", { name: "知识生成进度" });
    expect(progress).toHaveAttribute("aria-valuenow", "4");
    expect(progress).toHaveAttribute("aria-valuemax", "10");
    expect(progress).toHaveAttribute("aria-valuetext", "已完成 4 / 10 批");
    expect(within(detail).getByText("3 批处理中")).toBeVisible();
    expect(within(detail).getByText("已复用 2 批")).toBeVisible();
    expect(within(detail).getByText("生成耗时 1 分 23 秒")).toBeVisible();
    expect(within(detail).getByText("最近一批 13 秒")).toBeVisible();
    expect(within(detail).getByText("已生成知识").parentElement).toHaveTextContent("7");
    expect(within(detail).queryByText("确认并发布知识版本")).not.toBeInTheDocument();
  });

  it("does not invent a percentage for legacy tasks without batch counts", async () => {
    const current = { ...run("RUN-LEGACY", "running"), stage: "compiling" };
    vi.spyOn(api, "sources").mockResolvedValue({ items: [], total: 0 });
    vi.spyOn(api, "compileRuns").mockResolvedValue({ items: [current] });
    vi.spyOn(api, "compileRun").mockResolvedValue(current);
    showPage();
    const detail = await screen.findByRole("dialog", { name: "知识生成任务" });
    expect(within(detail).queryByRole("progressbar")).not.toBeInTheDocument();
    expect(detail).not.toHaveTextContent("%");
  });

  it("preserves zero real progress on a failed first batch", async () => {
    const current = {
      ...run("RUN-FAILED", "failed"), stage: "failed",
      counts: { batchesTotal: 6, batchesCompleted: 0, batchesInFlight: 0 },
    };
    vi.spyOn(api, "sources").mockResolvedValue({ items: [], total: 0 });
    vi.spyOn(api, "compileRuns").mockResolvedValue({ items: [current] });
    vi.spyOn(api, "compileRun").mockResolvedValue(current);
    showPage("/sources?run=RUN-FAILED");
    const detail = await screen.findByRole("dialog", { name: "知识生成任务" });
    expect(within(detail).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
    expect(within(detail).getByRole("progressbar").firstElementChild).toHaveStyle({ width: "0%" });
    expect(within(detail).queryByText(/批处理中/)).not.toBeInTheDocument();
    expect(within(detail).getByRole("button", { name: "重新处理" })).toBeVisible();
  });
});

describe("SourcesPage removal", () => {
  it("confirms source impact and preserves the error for retry", async () => {
    vi.spyOn(api, "sources").mockResolvedValue({ items: [source], total: 1 });
    vi.spyOn(api, "compileRuns").mockResolvedValue({ items: [] });
    const remove = vi.spyOn(api, "removeSource")
      .mockRejectedValueOnce(new Error("请先取消处理任务"))
      .mockResolvedValue({ sourceId: "SRC-1", snapshotId: null, removedKnowledgeCount: 2, removedRelationCount: 1 });
    showPage();
    fireEvent.click(await screen.findByRole("button", { name: "移出资料 Python 笔记" }));
    expect(screen.getByText(/同时依赖其他资料的知识也会整页移除/)).toBeVisible();
    expect(remove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "确认移出" }));
    expect(await screen.findByText("请先取消处理任务")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "确认移出" }));
    await waitFor(() => expect(remove).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "移出资料" })).not.toBeInTheDocument());
  });

  it("cancels an active task after confirmation", async () => {
    vi.spyOn(api, "sources").mockResolvedValue({ items: [], total: 0 });
    vi.spyOn(api, "compileRuns").mockResolvedValue({ items: [run("RUN-1", "awaiting_review")] });
    vi.spyOn(api, "compileRun").mockResolvedValue(run("RUN-1", "awaiting_review"));
    vi.spyOn(api, "compileReview").mockResolvedValue({ ...run("RUN-1", "awaiting_review"), knowledgeItems: [], relations: [], summary: {} });
    const cancel = vi.spyOn(api, "cancelCompile").mockResolvedValue(run("RUN-1", "cancelled"));
    showPage();
    const detail = await screen.findByRole("dialog", { name: "知识生成任务" });
    expect(detail).not.toHaveTextContent("RUN-1");
    fireEvent.click(within(detail).getByRole("button", { name: "取消任务" }));
    expect(screen.getByRole("dialog", { name: "取消任务" })).not.toHaveTextContent("RUN-1");
    expect(cancel).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "确认取消" }));
    await waitFor(() => expect(cancel).toHaveBeenCalledWith("RUN-1"));
  });

  it("deletes only a completed run record", async () => {
    vi.spyOn(api, "sources").mockResolvedValue({ items: [], total: 0 });
    vi.spyOn(api, "compileRuns").mockResolvedValue({ items: [run("RUN-2", "completed")] });
    const remove = vi.spyOn(api, "deleteCompile").mockResolvedValue(undefined);
    showPage();
    fireEvent.click(screen.getByRole("button", { name: /处理记录/ }));
    fireEvent.click(await screen.findByRole("button", { name: /^删除记录 / }));
    expect(screen.getByText(/已发布知识、历史版本和原始资料不受影响/)).toBeVisible();
    expect(screen.getByRole("dialog", { name: "删除处理记录" })).not.toHaveTextContent("RUN-2");
    fireEvent.click(screen.getByRole("button", { name: "确认删除" }));
    await waitFor(() => expect(remove).toHaveBeenCalledWith("RUN-2"));
  });

  it("opens a failed task from a quality link even when it is not on the first list page", async () => {
    vi.spyOn(api, "sources").mockResolvedValue({ items: [], total: 0 });
    vi.spyOn(api, "compileRuns").mockResolvedValue({ items: [] });
    const loadRun = vi.spyOn(api, "compileRun").mockResolvedValue(run("RUN-OLD", "failed"));
    showPage("/sources?run=RUN-OLD");
    const detail = await screen.findByRole("dialog", { name: "知识生成任务" });
    await waitFor(() => expect(loadRun).toHaveBeenCalledWith("RUN-OLD"));
    expect(within(detail).getByText("重新处理")).toBeVisible();
    expect(await screen.findByText("当前没有处理记录")).toBeVisible();
  });
});

describe("SourcesPage citation location", () => {
  const content = "开头😀。\n\n前文\n\n目标引用在这里\n\n结尾";
  const chars = Array.from(content);
  const start = chars.indexOf("目");
  const end = start + Array.from("目标引用在这里").length;

  it.each([
    { filename: "notes.pdf", mimeType: "application/pdf", location: "&page=2", span: "pageSpans", id: "source-page-2" },
    { filename: "notes.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", location: "&block=2", span: "blockSpans", id: "source-block-2" },
    { filename: "notes.md", mimeType: "text/markdown", location: "", span: "none", id: "" },
  ])("opens $filename at the cited characters", async ({ filename, mimeType, location, span, id }) => {
    const scroll = vi.fn();
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { callback(0); return 1; });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    Element.prototype.scrollIntoView = scroll;
    vi.spyOn(api, "sources").mockResolvedValue({ items: [source], total: 1 });
    vi.spyOn(api, "compileRuns").mockResolvedValue({ items: [] });
    vi.spyOn(api, "source").mockResolvedValue({ ...source, versions: [] });
    vi.spyOn(api, "sourceContent").mockResolvedValue({
      sourceVersionId: "SV-1", sourceId: "SRC-1", version: "1", filename, mimeType,
      sizeBytes: 120, sha256: "", supersedes: null, status: "ready",
      createdAt: "2026-09-28T09:00:00Z", content,
      pageSpans: span === "pageSpans" ? [
        { pageNumber: 1, charStart: 0, charEnd: start - 2 },
        { pageNumber: 2, charStart: start - 2, charEnd: chars.length },
      ] : [],
      blockSpans: span === "blockSpans" ? [
        { blockNumber: 1, label: "第 1 段", charStart: 0, charEnd: start - 2 },
        { blockNumber: 2, label: "第 2 段", charStart: start - 2, charEnd: chars.length },
      ] : [],
    } satisfies SourceVersion);
    showPage(`/sources?source=SRC-1&version=SV-1${location}&start=${start}&end=${end}`);
    const panel = await screen.findByRole("dialog", { name: source.title });
    const mark = await within(panel).findByText("目标引用在这里", { selector: "mark" });
    expect(mark).toHaveAttribute("id", "source-highlight");
    expect(mark).toHaveTextContent("目标引用在这里");
    if (id) expect(panel.querySelector(`#${id}`)).toContainElement(mark);
    await waitFor(() => expect(scroll).toHaveBeenCalledWith({ block: "start", inline: "nearest" }));
  });

  it("renders a cited Markdown source as formatted Markdown while locating its text", async () => {
    const content = "---\ntitle: 资料\n---\n# 概览😀\n\n- **重点**：引用内容\n\n结尾";
    const start = Array.from(content).indexOf("重");
    const scroll = vi.fn();
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { callback(0); return 1; });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    Element.prototype.scrollIntoView = scroll;
    vi.spyOn(api, "sources").mockResolvedValue({ items: [source], total: 1 });
    vi.spyOn(api, "compileRuns").mockResolvedValue({ items: [] });
    vi.spyOn(api, "source").mockResolvedValue({ ...source, versions: [] });
    vi.spyOn(api, "sourceContent").mockResolvedValue({
      sourceVersionId: "SV-1", sourceId: "SRC-1", version: "1", filename: "notes.md",
      mimeType: "text/markdown", sizeBytes: 120, sha256: "", supersedes: null,
      status: "ready", createdAt: "2026-09-28T09:00:00Z", content,
      pageSpans: [], blockSpans: [],
    } satisfies SourceVersion);
    showPage(`/sources?source=SRC-1&version=SV-1&start=${start}&end=${start + 2}`);
    const panel = await screen.findByRole("dialog", { name: source.title });
    expect(within(panel).getByRole("heading", { name: "概览😀" })).toBeVisible();
    const mark = await within(panel).findByText("重点", { selector: "mark" });
    expect(mark.closest("strong")).toBeInTheDocument();
    expect(mark).toHaveAttribute("id", "source-highlight");
    expect(panel.querySelector(".document-reader > pre")).not.toBeInTheDocument();
    await waitFor(() => expect(scroll.mock.contexts.some((target) => target instanceof Element && target.id === "source-highlight")).toBe(true));
  });

  it.each(["", "&start=999&end=1000"])("falls back to the cited page when the character range is unavailable (%s)", async (range) => {
    const scroll = vi.fn();
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { callback(0); return 1; });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    Element.prototype.scrollIntoView = scroll;
    vi.spyOn(api, "sources").mockResolvedValue({ items: [source], total: 1 });
    vi.spyOn(api, "compileRuns").mockResolvedValue({ items: [] });
    vi.spyOn(api, "source").mockResolvedValue({ ...source, versions: [] });
    vi.spyOn(api, "sourceContent").mockResolvedValue({
      sourceVersionId: "SV-1", sourceId: "SRC-1", version: "1", filename: "notes.pdf",
      mimeType: "application/pdf", sizeBytes: 120, sha256: "", supersedes: null,
      status: "ready", createdAt: "2026-09-28T09:00:00Z", content: "第一页\n\n第二页",
      pageSpans: [
        { pageNumber: 1, charStart: 0, charEnd: 3 },
        { pageNumber: 2, charStart: 5, charEnd: 8 },
      ], blockSpans: [],
    } satisfies SourceVersion);
    showPage(`/sources?source=SRC-1&version=SV-1&page=2${range}`);
    const panel = await screen.findByRole("dialog", { name: source.title });
    await within(panel).findByText("第二页");
    expect(panel.querySelector("#source-highlight")).not.toBeInTheDocument();
    await waitFor(() => expect(scroll.mock.instances).toContain(panel.querySelector("#source-page-2")));
    expect(within(panel).getByRole("link", { name: "查看 PDF 原件" })).toHaveAttribute("href", "/api/v1/source-versions/SV-1/original#page=2");
  });
});
