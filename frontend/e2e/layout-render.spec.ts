import { expect, test } from "@playwright/test";

test("knowledge reader keeps the article margins balanced across desktop widths", async ({ page }) => {
  await page.route("**/api/v1/bootstrap", (route) => route.fulfill({ json: {
    productName: "FF - LLM Wiki知识库",
    attribution: "@2026 赋范空间 独家自研",
    project: { projectId: "P-1", name: "我的知识库", sourceCount: 1, sourceVersionCount: 1, seededVersion: null },
    snapshot: null,
    appearance: { themePreference: "light", reduceMotion: false },
    model: { status: "incomplete" },
    activeCompileRuns: [],
    recentConversations: [],
  } }));
  const summary = {
    knowledgeId: "K-1", snapshotId: "KS-1", slug: "entry", title: "知识一",
    type: "concept", domain: "knowledge", summary: "内容摘要", reviewStatus: "accepted",
    sourceCount: 1, updatedAt: "2026-09-28T09:00:00Z",
  };
  await page.route("**/api/v1/knowledge?*", (route) => route.fulfill({ json: {
    snapshotId: "KS-1", items: [summary], total: 1, domains: [],
  } }));
  await page.route("**/api/v1/knowledge/K-1", (route) => route.fulfill({ json: {
    ...summary, markdown: `## 摘要\n\n${"内容\n\n".repeat(120)}`, sourceIds: ["SRC-1"],
    sourceVersionIds: ["SV-1"], evidence: Array.from({ length: 30 }, (_, index) => ({
      evidenceId: `E-${index}`, sourceId: "SRC-1", sourceVersionId: "SV-1",
      sourceTitle: "个人资料", quote: `第 ${index + 1} 条原文`, charStart: index * 10,
      charEnd: index * 10 + 5, pageNumber: null, blockNumber: null, blockLabel: null,
    })), relations: [],
  } }));

  for (const width of [2048, 1366]) {
    await page.setViewportSize({ width, height: 960 });
    await page.goto("/knowledge");
    await expect(page.locator(".knowledge-article")).toBeVisible();
    const gaps = await page.evaluate(() => {
      const index = document.querySelector(".knowledge-index")!.getBoundingClientRect();
      const article = document.querySelector(".knowledge-article")!.getBoundingClientRect();
      const context = document.querySelector(".knowledge-context")!.getBoundingClientRect();
      return { left: article.left - index.right, middle: context.left - article.right, top: context.top - index.top, bottom: context.bottom - index.bottom };
    });
    expect(Math.abs(gaps.left - gaps.middle)).toBeLessThan(1);
    expect(Math.abs(gaps.top)).toBeLessThan(1);
    expect(Math.abs(gaps.bottom)).toBeLessThan(1);
    const sidebars = await page.evaluate(() => {
      const css = (selector: string) => getComputedStyle(document.querySelector(selector)!);
      return {
        widths: [document.querySelector(".knowledge-index")!.getBoundingClientRect().width, document.querySelector(".knowledge-context")!.getBoundingClientRect().width],
        edges: [css(".knowledge-index").borderRight, css(".knowledge-context").borderLeft],
        titles: [css(".knowledge-index h1").fontSize, css(".knowledge-context h2").fontSize],
        itemTitles: [css(".knowledge-index__list strong").fontSize, css(".evidence-list strong").fontSize],
        descriptions: [css(".knowledge-index__list small").fontSize, css(".evidence-list p").fontSize],
        rowBorders: [
          [css(".knowledge-index__list button").borderBottomWidth, css(".knowledge-index__list button").borderBottomStyle, css(".knowledge-index__list button").borderRadius],
          [css(".evidence-list button").borderBottomWidth, css(".evidence-list button").borderBottomStyle, css(".evidence-list button").borderRadius],
        ],
      };
    });
    expect(sidebars.widths[0]).toBe(sidebars.widths[1]);
    expect(sidebars.edges[0]).toBe(sidebars.edges[1]);
    expect(sidebars.titles[0]).toBe(sidebars.titles[1]);
    expect(sidebars.itemTitles[0]).toBe(sidebars.itemTitles[1]);
    expect(sidebars.descriptions[0]).toBe(sidebars.descriptions[1]);
    expect(sidebars.rowBorders[0]).toEqual(sidebars.rowBorders[1]);
    if (width === 2048) await page.screenshot({ path: "test-results/knowledge-reader-balanced.png" });
  }

  const scroll = await page.evaluate(() => {
    const reader = document.querySelector(".knowledge-reader__layout")!;
    const context = document.querySelector(".knowledge-context")!;
    reader.scrollTop = 200;
    context.scrollTop = 200;
    return { reader: reader.scrollTop, context: context.scrollTop };
  });
  expect(scroll.reader).toBeGreaterThan(0);
  expect(scroll.context).toBeGreaterThan(0);

  await page.setViewportSize({ width: 800, height: 960 });
  await expect(page.locator(".knowledge-article")).toBeVisible();
  await expect(page.locator(".knowledge-context")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator(".evidence-list button").last().scrollIntoViewIfNeeded();
  await expect(page.locator(".evidence-list button").last()).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("sidebar shows the knowledge avatar in expanded, collapsed, and dark layouts", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute("href", "/knowledge-avatar-minimal.png");
  const avatar = page.locator(".brand-lockup img");
  await expect(avatar).toHaveAttribute("src", "/knowledge-avatar-minimal.png");
  expect(await avatar.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  await page.screenshot({ path: "test-results/sidebar-avatar-expanded.png", clip: { x: 0, y: 0, width: 280, height: 70 } });

  await page.getByRole("button", { name: "收起侧边栏" }).click();
  await expect(page.locator(".app-shell")).toHaveClass(/app-shell--collapsed/);
  await expect(page.locator(".brand-lockup strong")).toHaveCount(0);
  await expect(page.locator(".sidebar")).toHaveCSS("width", "64px");
  await expect(avatar).toBeVisible();
  await page.screenshot({ path: "test-results/sidebar-avatar-collapsed.png", clip: { x: 0, y: 0, width: 90, height: 70 } });

  await page.addInitScript(() => localStorage.setItem("ff-theme-preference", "dark"));
  await page.route("**/api/v1/bootstrap", async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    await route.fulfill({ response, json: { ...body, appearance: { ...body.appearance, themePreference: "dark" } } });
  });
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(avatar).toHaveAttribute("src", "/knowledge-avatar-minimal.png");
  await page.screenshot({ path: "test-results/sidebar-avatar-dark.png", clip: { x: 0, y: 0, width: 90, height: 70 } });
});

test("question entry keeps its primary content centered and composer anchored", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "向知识库提问" })).toBeVisible();
  await page.locator(".chat-welcome").evaluate(async (element) => {
    await Promise.all(element.getAnimations().map((animation) => animation.finished));
  });
  const layout = await page.evaluate(() => {
    const bounds = (selector: string) => {
      const rect = document.querySelector(selector)!.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, center: rect.x + rect.width / 2 };
    };
    return {
      workspace: bounds(".workspace"),
      scroll: bounds(".chat-scroll"),
      welcome: bounds(".chat-welcome"),
      composer: bounds(".composer"),
    };
  });
  const workspaceCenter = layout.workspace.x + layout.workspace.width / 2;
  console.log(JSON.stringify(layout));
  expect(Math.abs(layout.welcome.center - workspaceCenter)).toBeLessThan(12);
  expect(Math.abs(layout.composer.center - workspaceCenter)).toBeLessThan(12);
  expect(layout.composer.y + layout.composer.height).toBeGreaterThan(850);
  await expect(page.getByRole("navigation").getByRole("link")).toHaveCount(5);
  await expect(page.getByRole("button", { name: /选择问答模型/ })).toBeVisible();
  await page.screenshot({ path: "test-results/question-entry.png", fullPage: true });
});

test("source summary and empty graph match the workbench layout", async ({ page }) => {
  await page.goto("/sources");
  await expect(page.locator(".metric-row .metric-card")).toHaveCount(4);
  await expect(page.locator(".metric-card").first()).toHaveCSS("border-top-width", "0px");
  await expect(page.getByRole("button", { name: "导入资料" }).first()).toBeVisible();
  await page.screenshot({ path: "test-results/sources-workbench.png", fullPage: true });

  await page.goto("/graph");
  await expect(page.locator(".graph-page--empty")).toBeVisible();
  await expect(page.locator(".graph-title p")).toHaveText("探索知识与来源之间的关系。");
  await expect(page.locator(".graph-empty")).toHaveCSS("border-top-width", "0px");
  await expect(page.locator(".graph-empty").getByRole("button", { name: "导入资料" })).toBeVisible();
  await expect(page.locator(".graph-hud__tools")).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight)).toBe(true);
  await page.locator(".graph-hud--top").evaluate(async (element) => {
    await Promise.all(element.getAnimations().map((animation) => animation.finished));
  });
  await page.screenshot({ path: "test-results/graph-empty-light.png", fullPage: true });
});

test("empty graph remains usable on narrow screens", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/graph");
  await expect(page.locator(".graph-page--empty .graph-empty")).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight)).toBe(true);
  await page.locator(".graph-hud--top").evaluate(async (element) => {
    await Promise.all(element.getAnimations().map((animation) => animation.finished));
  });
  await page.screenshot({ path: "test-results/graph-empty-mobile.png", fullPage: true });
  await page.locator(".graph-empty").getByRole("button", { name: "导入资料" }).click();
  await expect(page).toHaveURL(/\/sources$/);
});

test("dark empty views render without console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.addInitScript(() => localStorage.setItem("ff-theme-preference", "dark"));
  await page.route("**/api/v1/bootstrap", async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    await route.fulfill({ response, json: { ...body, appearance: { ...body.appearance, themePreference: "dark" } } });
  });
  await page.goto("/sources");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator(".metric-row .metric-card")).toHaveCount(4);
  await page.screenshot({ path: "test-results/sources-workbench-dark.png", fullPage: true });
  await page.goto("/graph");
  await expect(page.locator(".graph-page--empty")).toBeVisible();
  await expect(page.locator(".graph-empty")).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await page.locator(".graph-hud--top").evaluate(async (element) => {
    await Promise.all(element.getAnimations().map((animation) => animation.finished));
  });
  await page.screenshot({ path: "test-results/graph-empty-dark.png", fullPage: true });
  expect(errors).toEqual([]);
});
