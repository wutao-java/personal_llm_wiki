import { expect, test } from "@playwright/test";
import type { Message } from "../src/api/types";

test("each saved message can be deleted without breaking the chat layout", async ({ page }) => {
  const model = {
    profileId: "deepseek-default", name: "DeepSeek 在线服务", baseUrl: "https://api.deepseek.com",
    modelId: "deepseek-chat", modelIds: ["deepseek-chat"], status: "incomplete",
    keyConfigured: false, credentialMask: "", lastTestedAt: null, lastLatencyMs: null, lastError: null,
  };
  const answer = {
    answerId: "A-1", snapshotId: "S-1", status: "completed", content: "资料回答",
    citations: [], relatedKnowledgeIds: [], evidenceStatus: "limited" as const,
    retrievedSourceCount: 0, usedSourceCount: 0, modelId: null, error: null,
  };
  const messages: Message[] = [
    { messageId: "M-1", role: "user", content: "原始问题", createdAt: "" },
    { messageId: "M-2", role: "assistant", content: "资料回答", createdAt: "", answer },
  ];
  await page.route("**/api/v1/bootstrap", (route) => route.fulfill({ json: {
    productName: "FF - LLM Wiki知识库", attribution: "@2026 赋范空间 独家自研",
    project: { projectId: "P-1", name: "个人知识库", sourceCount: 0, sourceVersionCount: 0, seededVersion: null },
    snapshot: null, appearance: { themePreference: "light", reduceMotion: false },
    model, activeCompileRuns: [], recentConversations: [],
  } }));
  await page.route("**/api/v1/settings/models", (route) => route.fulfill({ json: {
    activeProfileId: model.profileId, profiles: [model],
  } }));
  await page.route("**/api/v1/suggested-questions", (route) => route.fulfill({ json: { snapshotId: null, items: [] } }));
  await page.route("**/api/v1/conversations/C-1", (route) => route.fulfill({ json: {
    conversationId: "C-1", projectId: "P-1", title: "原始问题", contextKnowledgeIds: [],
    createdAt: "", updatedAt: "", messages,
  } }));
  await page.route("**/api/v1/conversations/C-1/messages/*", (route) => {
    const id = route.request().url().split("/").at(-1);
    const index = messages.findIndex((item) => item.messageId === id);
    if (index !== -1) messages.splice(index, 1);
    return route.fulfill({ json: { messageId: id } });
  });
  await page.route("**/api/v1/answers/A-1/events", (route) => route.fulfill({
    status: 200, contentType: "text/event-stream",
    body: `event: final\ndata: ${JSON.stringify(answer)}\n\n`,
  }));

  await page.goto("/conversations/C-1?answer=A-1");
  await expect(page.locator(".message")).toHaveCount(2);
  await expect(page).toHaveURL(/\/conversations\/C-1$/);
  await expect(page.getByRole("button", { name: "删除问题" })).toBeVisible();
  await expect(page.getByRole("button", { name: "删除回答" })).toBeVisible();
  await page.screenshot({ path: "test-results/chat-message-delete-desktop.png" });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(async () => (await page.locator(".sidebar").boundingBox())?.x ?? 0).toBeLessThanOrEqual(-280);
  await expect(page.getByRole("button", { name: "删除问题" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/chat-message-delete-mobile.png" });
  await page.getByRole("button", { name: "删除回答" }).click();
  await expect(page.getByRole("dialog", { name: "删除回答" })).toBeVisible();
  await page.getByRole("button", { name: "确认删除" }).click();
  await expect(page.locator(".message")).toHaveCount(1);
  await expect(page.getByText("资料回答")).toHaveCount(0);

  await page.getByRole("button", { name: "删除问题" }).click();
  await page.getByRole("button", { name: "确认删除" }).click();
  await expect(page.getByRole("heading", { name: "向知识库提问" })).toBeVisible();
});
