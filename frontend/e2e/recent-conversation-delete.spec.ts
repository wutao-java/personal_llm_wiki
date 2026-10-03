import { expect, test } from "@playwright/test";

test("recent conversations can be deleted from the sidebar on desktop and mobile", async ({ page }) => {
  const model = {
    profileId: "deepseek-default", name: "DeepSeek 在线服务", baseUrl: "https://api.deepseek.com",
    modelId: "deepseek-chat", modelIds: ["deepseek-chat"], status: "incomplete",
    keyConfigured: false, credentialMask: "", lastTestedAt: null, lastLatencyMs: null, lastError: null,
  };
  const conversations = ["第一问题", "第二问题"].map((title, index) => ({
    conversationId: `C-${index + 1}`, projectId: "P-1", title,
    contextKnowledgeIds: [], createdAt: "", updatedAt: "",
  }));
  await page.route("**/api/v1/bootstrap", (route) => route.fulfill({ json: {
    productName: "FF - LLM Wiki知识库", attribution: "@2026 赋范空间 独家自研",
    project: { projectId: "P-1", name: "个人知识库", sourceCount: 0, sourceVersionCount: 0, seededVersion: null },
    snapshot: null, appearance: { themePreference: "light", reduceMotion: false },
    model, activeCompileRuns: [], recentConversations: conversations,
  } }));
  await page.route("**/api/v1/settings/models", (route) => route.fulfill({ json: {
    activeProfileId: model.profileId, profiles: [model],
  } }));
  await page.route("**/api/v1/suggested-questions", (route) => route.fulfill({ json: { snapshotId: null, items: [] } }));
  await page.route("**/api/v1/conversations/C-*", (route) => {
    const id = route.request().url().split("/").at(-1);
    if (route.request().method() === "DELETE") {
      if (id === "C-2") {
        return route.fulfill({ status: 400, json: { error: { code: "invalid_request", message: "回答仍在生成，请完成后再删除对话" } } });
      }
      conversations.splice(conversations.findIndex((item) => item.conversationId === id), 1);
      return route.fulfill({ json: { conversationId: id } });
    }
    const conversation = conversations.find((item) => item.conversationId === id);
    return route.fulfill({ json: { ...conversation, messages: [] } });
  });

  await page.goto("/conversations/C-1");
  const first = page.getByRole("button", { name: "删除对话：第一问题" });
  await expect(first).toBeVisible();
  await expect(page.getByRole("heading", { name: "向知识库提问" })).toBeVisible();
  await page.screenshot({ path: "test-results/recent-conversation-delete-desktop.png" });
  await first.click();
  await expect(page.getByRole("dialog", { name: "删除对话" })).toBeVisible();
  await page.getByRole("button", { name: "返回" }).click();
  await expect(page.getByRole("button", { name: "第一问题", exact: true })).toBeVisible();
  await first.click();
  await page.getByRole("button", { name: "确认删除" }).click();
  await expect(page).toHaveURL("/");
  await expect(first).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("button", { name: "第二问题", exact: true })).toBeVisible();
  await expect(first).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "打开导航" }).click();
  await expect.poll(async () => (await page.locator(".sidebar").boundingBox())?.x).toBe(0);
  await expect(page.locator(".recent-conversations")).toHaveCSS("display", "block");
  await expect(page.getByRole("button", { name: "删除对话：第二问题" })).toHaveCSS("opacity", "1");
  await expect(page.getByRole("button", { name: "删除对话：第二问题" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/recent-conversation-delete-mobile.png" });
  await page.getByRole("button", { name: "删除对话：第二问题" }).click();
  await page.getByRole("button", { name: "确认删除" }).click();
  await expect(page.getByRole("alert")).toContainText("回答仍在生成");
  await page.getByRole("button", { name: "返回" }).click();
  await expect(page.getByRole("button", { name: "第二问题", exact: true })).toBeVisible();
});
