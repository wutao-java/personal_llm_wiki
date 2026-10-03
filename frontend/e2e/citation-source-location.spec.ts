import { expect, test, type Page } from "@playwright/test";
import type { AnswerResult, Bootstrap, Citation, KnowledgeDetail, ModelProfile, SourceVersion } from "../src/api/types";

const quotes = ["符合条件后，应先核对申请材料，再确认处理范围。", "办理时记录处理结果，并向申请人说明后续步骤。"];
const content = [
  "---\ntitle: 处理规则资料\n---\n\n# 处理规则\n\n前文包含中文和 emoji 😀，引用位置按原文字符计算。",
  ...Array.from({ length: 35 }, (_, i) => `第 ${i + 1} 条背景说明：办理前需要阅读相关说明，确认资料完整，并保留处理记录。`),
  `## 适用条件\n\n${quotes[0]}\n\n这段后文补充了适用条件，不能只显示孤立的引用句。`,
  ...Array.from({ length: 35 }, (_, i) => `第 ${i + 1} 条流程说明：按照申请内容逐项检查，并记录办理情况。`),
  `## 办理流程\n\n${quotes[1]}\n\n这段后文补充了办理流程。\n\n## 文末\n\n原文结束，历史资料内容不变。`,
].join("\n\n");
const source: SourceVersion = {
  sourceVersionId: "SV-HIST-1", sourceId: "SRC-1", version: "1", filename: "rules.md",
  mimeType: "text/markdown", sizeBytes: content.length * 3, sha256: "", supersedes: null,
  status: "ready", createdAt: "2026-10-03T00:00:00Z", content, pageSpans: [], blockSpans: [],
};
const citations: Citation[] = quotes.map((quote, i) => {
  const start = Array.from(content.slice(0, content.indexOf(quote))).length;
  return {
    index: i + 1, evidenceId: `E-${i + 1}`, sourceId: source.sourceId,
    sourceVersionId: source.sourceVersionId, sourceTitle: "处理规则资料",
    knowledgeId: "K-1", knowledgeTitle: "处理规则", quote,
    charStart: start, charEnd: start + Array.from(quote).length,
    pageNumber: null, blockNumber: null, blockLabel: null,
  };
});
const answer: AnswerResult = {
  answerId: "A-1", snapshotId: "KS-1", status: "completed",
  content: "先核对申请材料 [1]，再记录处理结果 [2]。",
  citations, relatedKnowledgeIds: ["K-1"], evidenceStatus: "sufficient",
  retrievedSourceCount: 1, usedSourceCount: 1, modelId: "deepseek-chat", error: null,
};
const knowledge: KnowledgeDetail = {
  knowledgeId: "K-1", snapshotId: "KS-1", slug: "rules", title: "处理规则",
  type: "rule", domain: "knowledge", summary: "申请的适用条件和办理流程",
  reviewStatus: "accepted", sourceCount: 1, updatedAt: "2026-10-03T00:00:00Z",
  markdown: "## 适用条件\n\n先核对申请材料。E-1\n\n## 办理流程\n\n记录处理结果。E-2",
  sourceIds: ["SRC-1"], sourceVersionIds: ["SV-HIST-1"], evidence: citations, relations: [],
};
const model: ModelProfile = {
  profileId: "deepseek-default", name: "DeepSeek 在线服务", baseUrl: "https://api.deepseek.com",
  modelId: "deepseek-chat", modelIds: ["deepseek-chat"], keyConfigured: true,
  credentialMask: null, status: "available", lastTestedAt: null, lastLatencyMs: null, lastError: null,
};
const layouts = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

async function setup(page: Page, theme: "light" | "dark", original = source) {
  const errors: string[] = [];
  const requests: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await page.addInitScript((value) => localStorage.setItem("ff-theme-preference", value), theme);
  const conversation = {
    conversationId: "C-1", projectId: "P-1", title: "如何办理申请？", contextKnowledgeIds: [],
    createdAt: "2026-10-03T00:00:00Z", updatedAt: "2026-10-03T00:00:00Z",
  };
  const bootstrap: Bootstrap = {
    productName: "FF - LLM Wiki知识库", attribution: "@2026 赋范空间 独家自研",
    project: { projectId: "P-1", name: "我的知识库", sourceCount: 1, sourceVersionCount: 2, seededVersion: null },
    snapshot: { snapshotId: "KS-1", version: "1", status: "published", acceptedAt: "2026-10-03T00:00:00Z", knowledgeCount: 1, relationCount: 0, evidenceCount: 2, sourceVersionCount: 1 },
    model, appearance: { themePreference: theme, reduceMotion: true },
    activeCompileRuns: [], recentConversations: [conversation],
  };
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname.replace("/api/v1", "");
    requests.push(path);
    let json: unknown;
    if (path === "/bootstrap") json = bootstrap;
    else if (path === "/settings/models") json = { activeProfileId: model.profileId, profiles: [model] };
    else if (path === "/suggested-questions") json = { snapshotId: "KS-1", items: [] };
    else if (path === "/conversations/C-1") json = {
      ...conversation, messages: [
        { messageId: "M-1", role: "user", content: "如何办理申请？", createdAt: conversation.createdAt },
        { messageId: "M-2", role: "assistant", content: answer.content, createdAt: conversation.createdAt, answer },
      ],
    };
    else if (path === "/source-versions/SV-HIST-1/content") json = original;
    else if (path === "/knowledge") json = { snapshotId: "KS-1", items: [knowledge], total: 1, domains: [] };
    else if (path === "/knowledge/K-1") json = knowledge;
    else if (path.startsWith("/evidence/")) {
      const citation = citations.find((item) => `/evidence/${item.evidenceId}` === path);
      if (citation) json = { ...citation, accessible: true, context: citation.quote, matchStart: 0, matchEnd: citation.quote.length };
    }
    if (json === undefined) {
      errors.push(`Unexpected API request: ${path}`);
      await route.abort();
    } else await route.fulfill({ json });
  });
  return { errors, requests };
}

async function expectLocation(page: Page, quote: string) {
  const highlight = page.locator(".side-panel #source-highlight");
  await expect(highlight).toHaveText(quote);
  await expect(highlight).toBeInViewport();
  await expect.poll(() => page.locator(".side-panel__body").evaluate((element) => element.scrollTop)).toBeGreaterThan(100);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.locator(".side-panel__body").evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
}

for (const theme of ["light", "dark"] as const) {
  for (const layout of layouts) {
    test(`chat opens exact historical passages in one click: ${layout.name} ${theme}`, async ({ page }) => {
      await page.setViewportSize(layout);
      const { errors, requests } = await setup(page, theme);
      await page.goto("/conversations/C-1");
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await expect(page.locator(".evidence-source-card")).toHaveCount(2);
      if (layout.name === "mobile") await page.getByRole("button", { name: "关闭来源证据" }).click();
      await page.getByRole("textbox", { name: "输入问题" }).fill("保留未提交的问题");
      await page.locator(".citation-marker").first().click();
      await expect(page.getByRole("dialog", { name: "处理规则资料" })).toBeVisible();
      await expectLocation(page, quotes[0]);
      await expect(page.locator(".document-reader")).toContainText("这段后文补充了适用条件");
      await page.screenshot({ path: test.info().outputPath("chat-inline.png") });
      const firstScroll = await page.locator(".side-panel__body").evaluate((element) => element.scrollTop);
      await page.getByRole("button", { name: "关闭", exact: true }).click();
      await expect(page).toHaveURL(/\/conversations\/C-1$/);
      await expect(page.locator(".evidence-source-card").first()).toHaveClass(/is-expanded/);

      await page.locator(".evidence-source-card__trigger").nth(1).click();
      await expectLocation(page, quotes[1]);
      expect(await page.locator(".side-panel__body").evaluate((element) => element.scrollTop)).toBeGreaterThan(firstScroll);
      await page.screenshot({ path: test.info().outputPath("chat-source-card.png") });
      await page.getByRole("button", { name: "关闭", exact: true }).click();
      await expect(page.locator(".evidence-source-card").nth(1)).toHaveClass(/is-expanded/);
      await expect(page.locator(".evidence-source-card").nth(1).locator("blockquote")).toHaveText(quotes[1]);
      await page.getByRole("button", { name: "关闭来源证据" }).click();
      await expect(page.getByRole("textbox", { name: "输入问题" })).toHaveValue("保留未提交的问题");

      await page.locator(".answer-evidence-summary button").first().click();
      await expectLocation(page, quotes[0]);
      await page.getByRole("button", { name: "关闭", exact: true }).click();
      await page.getByRole("button", { name: "关闭来源证据" }).click();
      await page.getByRole("button", { name: "查看来源", exact: true }).click();
      await expect(page.locator(".evidence-panel")).toBeVisible();
      await expect(page.getByRole("dialog")).toHaveCount(0);
      expect(requests.filter((path) => path.includes("/source-versions/")).every((path) => path === "/source-versions/SV-HIST-1/content")).toBe(true);
      expect(errors).toEqual([]);
    });
  }

  for (const format of ["md", "pdf", "docx"] as const) {
    test(`knowledge highlights and scrolls original ${format}: desktop ${theme}`, async ({ page }) => {
      await page.setViewportSize(layouts[0]);
      const original = {
        ...source, filename: `rules.${format}`,
        mimeType: format === "pdf" ? "application/pdf" : format === "docx" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "text/markdown",
        pageSpans: format === "pdf" ? [{ pageNumber: 2, charStart: 0, charEnd: Array.from(content).length }] : [],
        blockSpans: format === "docx" ? [{ blockNumber: 3, label: "第 3 段", charStart: 0, charEnd: Array.from(content).length }] : [],
      };
      const { errors } = await setup(page, theme, original);
      await page.goto("/knowledge/K-1");
      await page.locator(".knowledge-article .evidence-reference").first().click();
      await expectLocation(page, quotes[0]);
      await expect(page.locator(".document-reader")).toContainText("原文结束，历史资料内容不变");
      await expect(page.locator(".context-excerpt")).toHaveCount(0);
      if (format === "md") await expect(page.locator(".document-reader h1")).toHaveText("处理规则");
      await page.screenshot({ path: test.info().outputPath(`knowledge-${format}.png`) });
      await page.getByRole("button", { name: "关闭", exact: true }).click();
      await page.locator(".evidence-list button").nth(1).click();
      await expectLocation(page, quotes[1]);
      await page.getByRole("button", { name: "关闭", exact: true }).click();
      await expect(page).toHaveURL(/\/knowledge\/K-1$/);
      expect(errors).toEqual([]);
    });
  }

  test(`knowledge original remains readable: mobile ${theme}`, async ({ page }) => {
    await page.setViewportSize(layouts[1]);
    const { errors } = await setup(page, theme);
    await page.goto("/knowledge/K-1");
    await page.locator(".knowledge-article .evidence-reference").first().click();
    await expectLocation(page, quotes[0]);
    await page.screenshot({ path: test.info().outputPath("knowledge-mobile.png") });
    await page.getByRole("button", { name: "关闭", exact: true }).click();
    await expect(page.locator(".knowledge-article")).toBeVisible();
    expect(errors).toEqual([]);
  });
}
