import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../../api/client";
import * as client from "../../api/client";
import type { AnswerResult, Bootstrap, ModelProfile, SourceVersion } from "../../api/types";
import { ChatPage } from "./ChatPage";

vi.mock("../../state/ui", () => {
  return import("zustand").then(({ create }) => ({
    useUIStore: create((set: (value: object) => void) => ({
      chatDraft: "", setChatDraft: (value: string) => set({ chatDraft: value }),
      setGraphSelectedId: vi.fn(),
    })),
  }));
});

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("ChatPage model selection", () => {
  it("loads models for an available service and submits the selected model with a question", async () => {
    const deepseek: ModelProfile = {
      profileId: "deepseek-default", name: "DeepSeek 在线服务", baseUrl: "https://api.deepseek.com",
      modelId: "deepseek-chat", status: "available", keyConfigured: true, credentialMask: "••••",
      modelIds: ["deepseek-chat"],
      lastTestedAt: null, lastLatencyMs: null, lastError: null,
    };
    const compatible: ModelProfile = { ...deepseek, profileId: "openai-compatible", name: "OpenAI 兼容服务", modelId: "custom-a", modelIds: ["custom-a", "custom-b"] };
    vi.spyOn(api, "bootstrap").mockResolvedValue({
      snapshot: { snapshotId: "S-1", version: "1", status: "published", acceptedAt: "", knowledgeCount: 1, relationCount: 0, evidenceCount: 1, sourceVersionCount: 1 },
      model: deepseek, project: { projectId: "P-1", name: "测试", sourceCount: 1, sourceVersionCount: 1, seededVersion: null },
      appearance: { themePreference: "light", reduceMotion: false }, productName: "FF - LLM Wiki知识库",
      attribution: "@2026 赋范空间 独家自研", activeCompileRuns: [], recentConversations: [],
    } satisfies Bootstrap);
    vi.spyOn(api, "models").mockResolvedValue({ activeProfileId: "deepseek-default", profiles: [deepseek, compatible] });
    vi.spyOn(api, "suggestedQuestions").mockResolvedValue({ snapshotId: "S-1", items: [] });
    const discover = vi.spyOn(api, "discoverModels");
    vi.spyOn(api, "createConversation").mockResolvedValue({
      conversationId: "C-1", projectId: "P-1", title: "新对话", contextKnowledgeIds: [], createdAt: "", updatedAt: "",
    });
    const ask = vi.spyOn(api, "ask").mockResolvedValue({ answerId: "A-1", conversationId: "C-1", snapshotId: "S-1", status: "received" });

    render(<MemoryRouter initialEntries={["/"]}><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <Routes><Route path="/" element={<ChatPage />} /><Route path="/conversations/:conversationId" element={<div>对话已创建</div>} /></Routes>
    </QueryClientProvider></MemoryRouter>);
    expect(screen.getByRole("img", { name: "知识问答头像" }).getAttribute("src"))
      .toBe("/knowledge-avatar-minimal.png");
    fireEvent.click(await screen.findByRole("button", { name: /选择问答模型/ }));
    fireEvent.click(screen.getByRole("button", { name: /OpenAI 兼容服务/ }));
    expect(discover).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole("button", { name: "custom-b" }));
    fireEvent.change(screen.getByPlaceholderText(/询问当前知识/), { target: { value: "引用来源是什么？" } });
    fireEvent.click(screen.getByRole("button", { name: "发送问题" }));
    await waitFor(() => expect(ask).toHaveBeenCalledWith("C-1", "引用来源是什么？", {
      profileId: "openai-compatible", modelId: "custom-b",
    }));
  });
});

describe("ChatPage assistant avatar", () => {
  it("shows the knowledge avatar for a completed assistant message", async () => {
    const model: ModelProfile = {
      profileId: "deepseek-default", name: "DeepSeek 在线服务", baseUrl: "https://api.deepseek.com",
      modelId: "deepseek-chat", status: "incomplete", keyConfigured: false, credentialMask: "",
      modelIds: ["deepseek-chat"],
      lastTestedAt: null, lastLatencyMs: null, lastError: null,
    };
    vi.spyOn(api, "bootstrap").mockResolvedValue({
      snapshot: null,
      model,
      project: { projectId: "P-1", name: "测试", sourceCount: 0, sourceVersionCount: 0, seededVersion: null },
      appearance: { themePreference: "light", reduceMotion: false }, productName: "FF - LLM Wiki知识库",
      attribution: "@2026 赋范空间 独家自研", activeCompileRuns: [], recentConversations: [],
    } satisfies Bootstrap);
    vi.spyOn(api, "models").mockResolvedValue({ activeProfileId: "deepseek-default", profiles: [model] });
    vi.spyOn(api, "suggestedQuestions").mockResolvedValue({ snapshotId: "", items: [] });
    vi.spyOn(api, "conversation").mockResolvedValue({
      conversationId: "C-1", projectId: "P-1", title: "提问", contextKnowledgeIds: [],
      createdAt: "", updatedAt: "",
      messages: [{ messageId: "M-1", role: "assistant", content: "来自资料的回答", createdAt: "" }],
    });

    render(<MemoryRouter initialEntries={["/conversations/C-1"]}><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <Routes><Route path="/conversations/:conversationId" element={<ChatPage />} /></Routes>
    </QueryClientProvider></MemoryRouter>);

    await screen.findByText("来自资料的回答");
    expect(document.querySelector(".message--assistant .message__avatar img")?.getAttribute("src"))
      .toBe("/knowledge-avatar-minimal.png");
  });
});

describe("ChatPage evidence panel", () => {
  it("reads the cited source in place and returns to the same conversation", async () => {
    Element.prototype.scrollIntoView = vi.fn();
    const quote = "另一段原文，解释不同的处理方式";
    const content = `原文一\n\n前文😀说明\n\n${quote}\n\n结尾`;
    const start = Array.from(content).indexOf("另");
    const model: ModelProfile = {
      profileId: "deepseek-default", name: "DeepSeek 在线服务", baseUrl: "https://api.deepseek.com",
      modelId: "deepseek-chat", status: "incomplete", keyConfigured: false, credentialMask: "",
      modelIds: ["deepseek-chat"], lastTestedAt: null, lastLatencyMs: null, lastError: null,
    };
    const answer: AnswerResult = {
      answerId: "A-1", snapshotId: "S-1", status: "completed", content: "已找到资料 [1] [2] [3]",
      citations: [
        {
          index: 1, evidenceId: "E-1", sourceId: "SRC-1", sourceVersionId: "SV-SRC-1",
          sourceTitle: "第一份资料", knowledgeTitle: "知识一", quote: "原文一",
          charStart: 0, charEnd: 3, pageNumber: null, blockNumber: null, blockLabel: null,
        },
        {
          index: 2, evidenceId: "E-2", sourceId: "SRC-2", sourceVersionId: "SV-SRC-2",
          sourceTitle: "第二份资料", knowledgeTitle: "知识二", quote: "原文二",
          charStart: 4, charEnd: 7, pageNumber: 2, blockNumber: null, blockLabel: null,
          extractionMethod: "ocr", qualityScore: 84, reviewStatus: "reviewed",
        },
        {
          index: 3, evidenceId: "E-3", sourceId: "SRC-1", sourceVersionId: "SV-SRC-1",
          sourceTitle: "第一份资料", knowledgeTitle: "知识一", quote,
          charStart: start, charEnd: start + Array.from(quote).length, pageNumber: null, blockNumber: null, blockLabel: null,
        },
      ],
      relatedKnowledgeIds: [], evidenceStatus: "sufficient", retrievedSourceCount: 2,
      usedSourceCount: 2, modelId: "deepseek-chat", error: null,
    };
    vi.spyOn(api, "bootstrap").mockResolvedValue({
      snapshot: null, model,
      project: { projectId: "P-1", name: "测试", sourceCount: 0, sourceVersionCount: 0, seededVersion: null },
      appearance: { themePreference: "light", reduceMotion: false }, productName: "FF - LLM Wiki知识库",
      attribution: "@2026 赋范空间 独家自研", activeCompileRuns: [], recentConversations: [],
    } satisfies Bootstrap);
    vi.spyOn(api, "models").mockResolvedValue({ activeProfileId: "deepseek-default", profiles: [model] });
    vi.spyOn(api, "suggestedQuestions").mockResolvedValue({ snapshotId: "", items: [] });
    vi.spyOn(api, "conversation").mockResolvedValue({
      conversationId: "C-1", projectId: "P-1", title: "提问", contextKnowledgeIds: [],
      createdAt: "", updatedAt: "",
      messages: [{ messageId: "M-1", role: "assistant", content: answer.content, createdAt: "", answer }],
    });
    const sourceContent = vi.spyOn(api, "sourceContent").mockImplementation(async (versionId) => {
      if (versionId === "SV-SRC-2") throw new Error("暂时无法读取");
      return {
        sourceVersionId: versionId, sourceId: "SRC-1", version: "1", filename: "notes.md",
        mimeType: "text/markdown", sizeBytes: 20, sha256: "", supersedes: null,
        status: "ready", createdAt: "", content,
        pageSpans: [], blockSpans: [],
      } satisfies SourceVersion;
    });

    render(<MemoryRouter initialEntries={["/conversations/C-1"]}><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <Routes><Route path="/conversations/:conversationId" element={<ChatPage />} /><Route path="/sources" element={<div>资料管理页</div>} /></Routes>
    </QueryClientProvider></MemoryRouter>);

    const panel = (await screen.findByRole("heading", { name: "来源证据" })).closest(".evidence-panel") as HTMLElement;
    expect(panel).not.toHaveTextContent("SV-SRC-1");
    expect(panel).not.toHaveTextContent("SV-SRC-2");
    expect(panel.querySelectorAll(".evidence-source-card__summary em")).toHaveLength(1);
    expect(panel).toHaveTextContent("第 2 页");
    expect(panel).toHaveTextContent("已人工校对");
    const cards = panel.querySelectorAll(".evidence-source-card");
    expect(cards[0].querySelector(".evidence-source-card__summary")).toHaveTextContent("知识一");
    expect(cards[2].querySelector(".evidence-source-card__summary")).toHaveTextContent("知识一");
    expect(cards[0].querySelector(".evidence-source-card__summary")).toHaveTextContent("第一份资料");
    expect(cards[2].querySelector(".evidence-source-card__summary")).toHaveTextContent("第一份资料");
    expect(cards[0].querySelector(".evidence-source-card__excerpt")).toHaveTextContent("原文一");
    expect(cards[2].querySelector(".evidence-source-card__excerpt")).toHaveTextContent("另一段原文，解释不同的处理方式");
    expect(cards[2].querySelector("blockquote")).toBeNull();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(document.querySelector(".message--assistant .citation-marker")!);
    const preview = await screen.findByRole("dialog", { name: "第一份资料" });
    expect(await within(preview).findByText("原文一", { selector: "mark" })).toBeVisible();
    expect(sourceContent).toHaveBeenCalledWith("SV-SRC-1");
    await waitFor(() => expect(vi.mocked(Element.prototype.scrollIntoView).mock.contexts)
      .toContain(preview.querySelector("#source-highlight")));
    expect(screen.queryByText("资料管理页")).not.toBeInTheDocument();
    fireEvent.click(within(preview).getByRole("button", { name: "关闭" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "第一份资料" })).not.toBeInTheDocument());
    expect(screen.getByText("已找到资料")).toBeVisible();
    expect(screen.getByRole("heading", { name: "来源证据" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /第二份资料/ }));
    const failedPreview = await screen.findByRole("dialog", { name: "第二份资料" });
    expect(await within(failedPreview).findByText("暂时无法读取")).toBeVisible();
    sourceContent.mockResolvedValueOnce({
      sourceVersionId: "SV-SRC-2", sourceId: "SRC-2", version: "1", filename: "notes.pdf",
      mimeType: "application/pdf", sizeBytes: 20, sha256: "", supersedes: null,
      status: "ready", createdAt: "", content: "前文说明原文二",
      pageSpans: [{ pageNumber: 2, charStart: 0, charEnd: 7 }], blockSpans: [],
    });
    fireEvent.click(within(failedPreview).getByRole("button", { name: "重新加载" }));
    expect(await within(failedPreview).findByRole("link", { name: "查看 PDF 原件" }))
      .toHaveAttribute("href", "/api/v1/source-versions/SV-SRC-2/original#page=2");
    expect(within(failedPreview).getByText("原文二", { selector: "mark" })).toBeVisible();
    expect(screen.queryByText("资料管理页")).not.toBeInTheDocument();
    fireEvent.click(within(failedPreview).getByRole("button", { name: "关闭" }));
    fireEvent.click(screen.getByRole("button", { name: /另一段原文/ }));
    const secondRange = await screen.findByRole("dialog", { name: "第一份资料" });
    expect(await within(secondRange).findByText(quote, { selector: "mark" })).toBeVisible();
    await waitFor(() => expect(vi.mocked(Element.prototype.scrollIntoView).mock.contexts)
      .toContain(secondRange.querySelector("#source-highlight")));
    fireEvent.click(within(secondRange).getByRole("button", { name: "关闭" }));
    expect(cards[2]).toHaveClass("is-expanded");
    expect(cards[2].querySelector("blockquote")).toHaveTextContent(quote);
    fireEvent.click(document.querySelector(".answer-evidence-summary button")!);
    const footerPreview = await screen.findByRole("dialog", { name: "第一份资料" });
    expect(await within(footerPreview).findByText("原文一", { selector: "mark" })).toBeVisible();
  });
});

describe("ChatPage message removal", () => {
  it("confirms deletion for each persisted message and refreshes the conversation", async () => {
    const model: ModelProfile = {
      profileId: "deepseek-default", name: "DeepSeek 在线服务", baseUrl: "https://api.deepseek.com",
      modelId: "deepseek-chat", status: "incomplete", keyConfigured: false, credentialMask: "",
      modelIds: ["deepseek-chat"], lastTestedAt: null, lastLatencyMs: null, lastError: null,
    };
    vi.spyOn(api, "bootstrap").mockResolvedValue({
      snapshot: null, model,
      project: { projectId: "P-1", name: "测试", sourceCount: 0, sourceVersionCount: 0, seededVersion: null },
      appearance: { themePreference: "light", reduceMotion: false }, productName: "FF - LLM Wiki知识库",
      attribution: "@2026 赋范空间 独家自研", activeCompileRuns: [], recentConversations: [],
    } satisfies Bootstrap);
    vi.spyOn(api, "models").mockResolvedValue({ activeProfileId: "deepseek-default", profiles: [model] });
    vi.spyOn(api, "suggestedQuestions").mockResolvedValue({ snapshotId: "", items: [] });
    let messages: Array<{ messageId: string; role: "user" | "assistant"; content: string; createdAt: string }> = [
      { messageId: "M-1", role: "user", content: "最初的问题", createdAt: "" },
      { messageId: "M-2", role: "assistant", content: "资料回答", createdAt: "" },
    ];
    vi.spyOn(api, "conversation").mockImplementation(async () => ({
      conversationId: "C-1", projectId: "P-1", title: "最初的问题", contextKnowledgeIds: [],
      createdAt: "", updatedAt: "", messages,
    }));
    const remove = vi.spyOn(api, "deleteMessage").mockImplementation(async (_conversationId, messageId) => {
      messages = messages.filter((item) => item.messageId !== messageId);
      return { messageId };
    });

    render(<MemoryRouter initialEntries={["/conversations/C-1"]}><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <Routes><Route path="/conversations/:conversationId" element={<ChatPage />} /></Routes>
    </QueryClientProvider></MemoryRouter>);

    fireEvent.click(await screen.findByRole("button", { name: "删除回答" }));
    expect(screen.getByText("确定删除这条回答吗？该回答的引用、事件及质量审核也会删除，原问题保留。")).toBeInTheDocument();
    expect(remove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "确认删除" }));
    await waitFor(() => expect(screen.queryByText("资料回答")).not.toBeInTheDocument());
    expect(remove).toHaveBeenCalledWith("C-1", "M-2");

    fireEvent.click(screen.getByRole("button", { name: "删除问题" }));
    expect(screen.getByText(/由它生成的回答、引用及质量审核也会一起删除/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "确认删除" }));
    await waitFor(() => expect(screen.queryByText("最初的问题")).not.toBeInTheDocument());
    expect(remove).toHaveBeenCalledWith("C-1", "M-1");
  });
});

describe("ChatPage answer recovery", () => {
  const answer: AnswerResult = {
    answerId: "A-1", snapshotId: "S-1", status: "generating", content: "",
    citations: [], relatedKnowledgeIds: [], evidenceStatus: "pending",
    retrievedSourceCount: 1, usedSourceCount: 0, modelId: "deepseek-chat", error: null,
  };
  function setup(result: AnswerResult, active = false) {
    const model: ModelProfile = {
      profileId: "deepseek-default", name: "DeepSeek 在线服务", baseUrl: "https://api.deepseek.com",
      modelId: "deepseek-chat", modelIds: ["deepseek-chat"], status: "available",
      keyConfigured: true, credentialMask: "", lastTestedAt: null, lastLatencyMs: null, lastError: null,
    };
    vi.spyOn(api, "models").mockResolvedValue({ activeProfileId: "deepseek-default", profiles: [model] });
    vi.spyOn(api, "bootstrap").mockResolvedValue({
      model, snapshot: { snapshotId: "S-1", version: "1", status: "published", acceptedAt: "", knowledgeCount: 1, relationCount: 0, evidenceCount: 1, sourceVersionCount: 1 },
      project: { projectId: "P-1", name: "测试", sourceCount: 1, sourceVersionCount: 1, seededVersion: null },
      appearance: { themePreference: "light", reduceMotion: false }, productName: "FF - LLM Wiki知识库",
      attribution: "@2026 赋范空间 独家自研", activeCompileRuns: [], recentConversations: [],
    });
    vi.spyOn(api, "suggestedQuestions").mockResolvedValue({ snapshotId: "S-1", items: [] });
    vi.spyOn(api, "conversation").mockResolvedValue({
      conversationId: "C-1", projectId: "P-1", title: "退款期限", contextKnowledgeIds: [],
      createdAt: "", updatedAt: "", activeAnswer: active ? result : null,
      messages: active ? [{ messageId: "M-1", role: "user", content: "退款期限", createdAt: "" }]
        : [{ messageId: "M-2", role: "assistant", content: "", createdAt: "", answer: result }],
    });
    const subscribe = vi.spyOn(client, "subscribeToEvents").mockReturnValue(vi.fn());
    render(<MemoryRouter initialEntries={["/conversations/C-1"]}><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <Routes><Route path="/conversations/:conversationId" element={<ChatPage />} /></Routes>
    </QueryClientProvider></MemoryRouter>);
    return subscribe;
  }

  it("reconnects an active persisted answer without a URL parameter and stops it through the API", async () => {
    const subscribe = setup(answer, true);
    const cancel = vi.spyOn(api, "cancelAnswer").mockResolvedValue({
      ...answer, status: "failed", error: { code: "answer_cancelled", message: "回答已停止", retryable: true },
    });
    await waitFor(() => expect(subscribe).toHaveBeenCalledWith(
      "/answers/A-1/events", expect.any(Array), expect.any(Function), expect.any(Function),
    ));
    expect(screen.getByRole("textbox", { name: "输入问题" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "停止回答" }));
    await waitFor(() => expect(cancel).toHaveBeenCalledWith("A-1"));
    expect(await screen.findByText("回答已停止")).toBeVisible();
  });

  it("renders interrupted history as a retryable failure without a successful answer footer", async () => {
    setup({ ...answer, status: "failed", error: { code: "answer_interrupted", message: "服务中断，回答未完成", retryable: true } });
    const retry = vi.spyOn(api, "retryAnswer").mockRejectedValue(new Error("模型连接不可用"));
    expect(await screen.findByText("服务中断，回答未完成")).toBeVisible();
    expect(screen.queryByRole("button", { name: "复制" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "重新生成" }));
    await waitFor(() => expect(retry).toHaveBeenCalledWith("A-1"));
    expect(await screen.findByText("模型连接不可用")).toBeVisible();
    expect(screen.getByRole("button", { name: "重新生成" })).toBeEnabled();
  });
});
