import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../../api/client";
import type { Evidence, KnowledgeDetail, SourceVersion } from "../../api/types";
import { KnowledgePage } from "./KnowledgePage";

vi.mock("../../state/ui", () => ({
  useUIStore: (selector: (state: { setGraphSelectedId: () => void }) => unknown) =>
    selector({ setGraphSelectedId: vi.fn() }),
}));

const evidence: Evidence = {
  evidenceId: "E-1", sourceId: "SRC-1", sourceVersionId: "SV-1", sourceTitle: "AI 笔记",
  charStart: 17, charEnd: 21, pageNumber: null, blockNumber: null, blockLabel: null,
  quote: "角色定义",
};
const knowledge: KnowledgeDetail = {
  knowledgeId: "K-1", snapshotId: "S-1", slug: "roles", title: "Agent 角色",
  type: "concept", domain: "knowledge", summary: "角色定义", reviewStatus: "ready",
  sourceCount: 1, updatedAt: "2026-09-28T09:00:00Z", markdown: "# Agent 角色",
  sourceIds: ["SRC-1"], sourceVersionIds: ["SV-1"], evidence: [evidence], relations: [],
};
const sourceVersion: SourceVersion = {
  sourceVersionId: "SV-1", sourceId: "SRC-1", version: "1", filename: "ai-notes.md",
  mimeType: "text/markdown", sizeBytes: 120, sha256: "", supersedes: null,
  status: "ready", createdAt: "2026-09-28T09:00:00Z",
  content: "# 原始笔记\n\n## 角色\n\n- 角色定义\n- 执行工具\n\n## 文末\n\n最后一段",
  pageSpans: [], blockSpans: [],
};

function showPage() {
  vi.spyOn(api, "knowledge").mockResolvedValue({
    snapshotId: "S-1", items: [knowledge], total: 1, domains: [],
  });
  vi.spyOn(api, "knowledgeDetail").mockResolvedValue(knowledge);
  vi.spyOn(api, "evidence").mockResolvedValue({
    ...evidence, accessible: true, context: "## 角色\n\n- 角色定义",
    matchStart: 9, matchEnd: 13,
  });
  render(<MemoryRouter initialEntries={["/knowledge/K-1"]}>
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <KnowledgePage />
    </QueryClientProvider>
  </MemoryRouter>);
}

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("KnowledgePage source evidence", () => {
  it.each(["ai-notes.md", "ai-notes.markdown"])("renders the complete Markdown source for %s", async (filename) => {
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    const loadSource = vi.spyOn(api, "sourceContent").mockResolvedValue({ ...sourceVersion, filename });
    showPage();
    fireEvent.click(await screen.findByRole("button", { name: /AI 笔记/ }));

    const panel = await screen.findByRole("dialog", { name: "来源证据" });
    expect(await within(panel).findByRole("heading", { name: "原始笔记" })).toBeVisible();
    expect(within(panel).getByRole("heading", { name: "文末" })).toBeVisible();
    expect(within(panel).getByText("执行工具").closest("li")).toBeVisible();
    expect(within(panel).getByText("最后一段")).toBeVisible();
    expect(await within(panel).findByText("角色定义", { selector: "mark" })).toHaveAttribute("id", "source-highlight");
    await waitFor(() => expect(scroll.mock.contexts).toContain(panel.querySelector("#source-highlight")));
    expect(panel.querySelector(".context-excerpt")).not.toBeInTheDocument();
    expect(loadSource).toHaveBeenCalledWith("SV-1");
    expect(within(panel).getByRole("link", { name: "打开完整原始资料" }))
      .toHaveAttribute("href", "/sources?source=SRC-1&version=SV-1&start=17&end=21");
  });

  it("keeps the excerpt and retry action if the source cannot be read", async () => {
    const loadSource = vi.spyOn(api, "sourceContent")
      .mockRejectedValueOnce(new Error("资料读取失败"))
      .mockResolvedValue(sourceVersion);
    showPage();
    fireEvent.click(await screen.findByRole("button", { name: /AI 笔记/ }));

    const panel = await screen.findByRole("dialog", { name: "来源证据" });
    expect(await within(panel).findByText("资料读取失败")).toBeVisible();
    expect(panel.querySelector(".context-excerpt")).toBeInTheDocument();
    fireEvent.click(within(panel).getByRole("button", { name: "重新加载" }));
    await waitFor(() => expect(loadSource).toHaveBeenCalledTimes(2));
    expect(await within(panel).findByRole("heading", { name: "原始笔记" })).toBeVisible();
  });

  it.each([
    { filename: "notes.pdf", mimeType: "application/pdf", pageSpans: [{ pageNumber: 2, charStart: 0, charEnd: sourceVersion.content!.length }], blockSpans: [] },
    { filename: "notes.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", pageSpans: [], blockSpans: [{ blockNumber: 3, label: "第 3 段", charStart: 0, charEnd: sourceVersion.content!.length }] },
  ])("locates the extracted source text for $filename", async ({ filename, mimeType, pageSpans, blockSpans }) => {
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    vi.spyOn(api, "sourceContent").mockResolvedValue({
      ...sourceVersion, filename, mimeType, pageSpans, blockSpans,
    });
    showPage();
    fireEvent.click(await screen.findByRole("button", { name: /AI 笔记/ }));

    const panel = await screen.findByRole("dialog", { name: "来源证据" });
    expect(await within(panel).findByText("角色定义", { selector: "mark" })).toHaveAttribute("id", "source-highlight");
    await waitFor(() => expect(scroll.mock.contexts).toContain(panel.querySelector("#source-highlight")));
    expect(panel.querySelector(".context-excerpt")).not.toBeInTheDocument();
    expect(within(panel).queryByRole("heading", { name: "原始笔记" })).not.toBeInTheDocument();
  });
});
