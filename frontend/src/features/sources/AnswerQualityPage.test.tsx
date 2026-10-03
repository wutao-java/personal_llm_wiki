import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../../api/client";
import type { AnswerQuality, QualityAnswer } from "../../api/types";
import { AnswerQualityPage } from "./AnswerQualityPage";

const answer: QualityAnswer = {
  answerId: "ANS-1", conversationId: "CONV-1", question: "如何核对来源？",
  snapshotId: "KS-1", snapshotVersion: "2026.09.28", status: "completed",
  content: "查看原文 [1]", citations: [{
    index: 1, evidenceId: "EV-1", sourceId: "SRC-1", sourceVersionId: "SV-1",
    sourceTitle: "个人资料", knowledgeId: "K-1", quote: "请查看原文",
    charStart: 0, charEnd: 6, pageNumber: 1, blockNumber: null, blockLabel: null,
  }], relatedKnowledgeIds: ["K-1"], evidenceStatus: "sufficient",
  retrievedSourceCount: 1, usedSourceCount: 1, modelId: "deepseek-chat",
  error: null, createdAt: "2026-09-28T08:00:00Z", review: null,
};

function response(items: QualityAnswer[]): AnswerQuality {
  return {
    items, total: items.length, page: 1, pageSize: 30, failedRuns: [],
    summary: {
      answerCount: items.length, completedCount: items.length, failedCount: 0,
      insufficientCount: 0, uncitedCount: 0, reviewedCount: 0, issueCount: 0,
      attentionCount: 0, compileFailureCount: 0,
    },
  };
}

function showPage() {
  render(<MemoryRouter><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><AnswerQualityPage /></QueryClientProvider></MemoryRouter>);
}

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("AnswerQualityPage", () => {
  it("shows no invented grade for an empty personal library", async () => {
    vi.spyOn(api, "answerQuality").mockResolvedValue(response([]));
    showPage();
    expect(await screen.findByText("评估维度")).toBeVisible();
    expect(screen.getAllByText("未评估")).toHaveLength(7);
    fireEvent.click(screen.getByRole("tab", { name: "逐条核查" }));
    expect(await screen.findByText("暂无问答记录")).toBeVisible();
  });

  it("opens real evidence and persists an issue review", async () => {
    vi.spyOn(api, "answerQuality").mockResolvedValue(response([answer]));
    const review = vi.spyOn(api, "reviewAnswer").mockResolvedValue({
      answerId: "ANS-1", review: { verdict: "issue", category: "引用", note: "需要核对", updatedAt: "2026-09-28T09:00:00Z" },
    });
    showPage();
    fireEvent.click(await screen.findByRole("tab", { name: "逐条核查" }));
    fireEvent.click(await screen.findByRole("button", { name: /如何核对来源/ }));
    const drawer = await screen.findByRole("dialog", { name: "回答核查" });
    expect(drawer).not.toHaveTextContent("SV-1");
    expect(drawer).toHaveTextContent("第 1 页");
    expect(within(drawer).getByRole("link", { name: /查看原文/ })).toHaveAttribute("href", "/sources?source=SRC-1&version=SV-1&page=1");
    expect(within(drawer).getByRole("link", { name: /打开原对话/ })).toHaveAttribute("href", "/conversations/CONV-1");
    fireEvent.click(within(drawer).getByRole("button", { name: "需处理" }));
    fireEvent.change(within(drawer).getByRole("combobox", { name: "问题类别" }), { target: { value: "引用" } });
    fireEvent.change(within(drawer).getByRole("textbox", { name: "核查说明" }), { target: { value: "需要核对" } });
    fireEvent.click(within(drawer).getByRole("button", { name: "保存核查" }));
    await waitFor(() => expect(review).toHaveBeenCalledWith("ANS-1", { verdict: "issue", category: "引用", note: "需要核对" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "回答核查" })).not.toBeInTheDocument());
  });

  it("requests only attention records for the overview worklist", async () => {
    const quality = vi.spyOn(api, "answerQuality").mockResolvedValue({
      ...response([answer]),
      total: 1,
      summary: { ...response([answer]).summary, answerCount: 40, attentionCount: 1 },
    });
    showPage();
    expect(await screen.findByRole("button", { name: /如何核对来源/ })).toBeVisible();
    expect(quality.mock.calls[0][0].get("status")).toBe("attention");
    fireEvent.click(screen.getByRole("tab", { name: "逐条核查" }));
    await waitFor(() => expect(quality.mock.calls.at(-1)?.[0].get("status")).toBe("all"));
  });

  it("keeps the failed task link without showing its internal ID", async () => {
    vi.spyOn(api, "answerQuality").mockResolvedValue({
      ...response([]),
      failedRuns: [{
        runId: "RUN-FAILED-1", status: "failed", stage: "compiling",
        sourceVersionIds: ["SV-1"], counts: {}, issues: [], error: null,
        createdAt: "2026-09-28T08:00:00Z", updatedAt: "2026-09-28T08:01:00Z",
      }],
      summary: { ...response([]).summary, compileFailureCount: 1 },
    });
    showPage();
    const link = await screen.findByRole("link", { name: "知识生成未完成" });
    expect(link).toHaveAttribute("href", "/sources?run=RUN-FAILED-1");
    expect(link).not.toHaveTextContent("RUN-FAILED-1");
  });
});
