import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../../api/client";
import type { Evidence, KnowledgeDetail, KnowledgeSummary } from "../../api/types";
import { KnowledgePage } from "./KnowledgePage";

vi.mock("../../state/ui", () => {
  return import("zustand").then(({ create }) => ({
    useUIStore: create(() => ({ setGraphSelectedId: vi.fn() })),
  }));
});

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("KnowledgePage directory", () => {
  it("loads the second page and synchronizes later search navigation", async () => {
    const list = vi.spyOn(api, "knowledge").mockResolvedValue({
      snapshotId: "KS-1", items: [], total: 61, domains: [],
    });
    render(<MemoryRouter initialEntries={["/knowledge?query=first"]}>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <Link to="/knowledge?query=second">切换查询</Link>
        <Routes><Route path="/knowledge" element={<KnowledgePage />} /></Routes>
      </QueryClientProvider>
    </MemoryRouter>);
    expect(await screen.findByPlaceholderText("搜索知识标题或内容")).toHaveValue("first");
    const next = await screen.findByRole("button", { name: "下一页知识" });
    await waitFor(() => expect(next).toBeEnabled());
    fireEvent.click(next);
    await waitFor(() => {
      const params = new URLSearchParams(list.mock.calls.at(-1)![0]);
      expect(params.get("page")).toBe("2");
      expect(params.get("query")).toBe("first");
    });
    fireEvent.click(screen.getByRole("link", { name: "切换查询" }));
    await waitFor(() => expect(screen.getByPlaceholderText("搜索知识标题或内容")).toHaveValue("second"));
    await waitFor(() => {
      const params = new URLSearchParams(list.mock.calls.at(-1)![0]);
      expect(params.get("page")).toBe("1");
      expect(params.get("query")).toBe("second");
    });
  });
});

describe("KnowledgePage evidence", () => {
  it("shows readable source references in the article and opens the matching evidence", async () => {
    const summary: KnowledgeSummary = {
      knowledgeId: "K-1", snapshotId: "KS-1", slug: "entry", title: "知识一",
      type: "concept", domain: "knowledge", summary: "内容摘要",
      reviewStatus: "accepted", sourceCount: 1, updatedAt: "2026-09-28T09:00:00Z",
    };
    const evidence: Evidence[] = [
      {
        evidenceId: "E-SV-SRC-USER-ABC-1-P060", sourceId: "SRC-1", sourceVersionId: "SV-1",
        sourceTitle: "个人资料", quote: "第一条原文", charStart: 10, charEnd: 14,
        pageNumber: 2, blockNumber: null, blockLabel: null,
      },
      {
        evidenceId: "E-SV-SRC-USER-ABC-1-P061", sourceId: "SRC-1", sourceVersionId: "SV-1",
        sourceTitle: "个人资料", quote: "第二条原文", charStart: 20, charEnd: 24,
        pageNumber: null, blockNumber: null, blockLabel: null,
      },
    ];
    vi.spyOn(api, "knowledge").mockResolvedValue({
      snapshotId: "KS-1", items: [summary], total: 1, domains: [],
    });
    vi.spyOn(api, "knowledgeDetail").mockResolvedValue({
      ...summary,
      markdown: "## 来源依据\n\n循环步骤见 E-SV-SRC-USER-ABC-1-P060、E-SV-SRC-USER-ABC-1-P061；未知 E-SV-SRC-USER-ABC-1-P099。\n\n`E-SV-SRC-USER-ABC-1-P060`",
      sourceIds: ["SRC-1"], sourceVersionIds: ["SV-1"], evidence, relations: [],
    } satisfies KnowledgeDetail);
    vi.spyOn(api, "evidence").mockImplementation(async (id) => ({
      ...evidence.find((item) => item.evidenceId === id)!, accessible: true,
    }));

    render(<MemoryRouter initialEntries={["/knowledge"]}><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <Routes><Route path="/knowledge" element={<KnowledgePage />} /></Routes>
    </QueryClientProvider></MemoryRouter>);

    const article = await screen.findByRole("article");
    await within(article).findByRole("heading", { name: "来源依据" });
    expect(within(article).getByRole("button", { name: "[1] 个人资料 · 第 2 页" })).toBeVisible();
    expect(within(article).getByRole("button", { name: "[2] 个人资料" })).toBeVisible();
    expect(article).toHaveTextContent("E-SV-SRC-USER-ABC-1-P099");
    expect(within(article).getByText("E-SV-SRC-USER-ABC-1-P060", { selector: "code" })).toBeVisible();
    fireEvent.click(within(article).getByRole("button", { name: "[2] 个人资料" }));
    const drawer = await screen.findByRole("dialog", { name: "来源证据" });
    await waitFor(() => expect(within(drawer).getByText("第二条原文")).toBeVisible());
    expect(api.evidence).toHaveBeenCalledWith("E-SV-SRC-USER-ABC-1-P061");
  });

  it("hides the source version ID while preserving the original source link", async () => {
    const summary: KnowledgeSummary = {
      knowledgeId: "K-1", snapshotId: "KS-1", slug: "entry", title: "知识一",
      type: "concept", domain: "knowledge", summary: "内容摘要",
      reviewStatus: "accepted", sourceCount: 1, updatedAt: "2026-09-28T09:00:00Z",
    };
    const evidence: Evidence = {
      evidenceId: "E-1", sourceId: "SRC-1", sourceVersionId: "SV-1",
      sourceTitle: "个人资料", quote: "证据原文", charStart: 10, charEnd: 14,
      pageNumber: 2, blockNumber: null, blockLabel: null, accessible: true,
    };
    vi.spyOn(api, "knowledge").mockResolvedValue({
      snapshotId: "KS-1", items: [summary], total: 1, domains: [],
    });
    vi.spyOn(api, "knowledgeDetail").mockResolvedValue({
      ...summary, markdown: "内容", sourceIds: ["SRC-1"], sourceVersionIds: ["SV-1"],
      evidence: [evidence], relations: [],
    } satisfies KnowledgeDetail);
    vi.spyOn(api, "evidence").mockResolvedValue(evidence);

    render(<MemoryRouter initialEntries={["/knowledge"]}><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <Routes><Route path="/knowledge" element={<KnowledgePage />} /><Route path="/knowledge/:knowledgeId" element={<KnowledgePage />} /></Routes>
    </QueryClientProvider></MemoryRouter>);

    fireEvent.click((await screen.findByText("证据原文")).closest("button")!);
    const drawer = await screen.findByRole("dialog", { name: "来源证据" });
    const originalLink = await within(drawer).findByRole("link", { name: "打开完整原始资料" });
    expect(drawer).not.toHaveTextContent("SV-1");
    await waitFor(() => expect(drawer).toHaveTextContent("第 2 页 · 字符 10–14"));
    expect(originalLink).toHaveAttribute("href", "/sources?source=SRC-1&version=SV-1&page=2&start=10&end=14");
  });
});
