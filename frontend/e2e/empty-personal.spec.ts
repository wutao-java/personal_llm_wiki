import { expect, test } from "@playwright/test";

const personalURL = process.env.E2E_PERSONAL_BASE_URL;

test("empty knowledge reader centers its prompt", async ({ page }) => {
  await page.route("**/api/v1/knowledge?**", (route) =>
    route.fulfill({ json: { snapshotId: null, items: [], total: 0, domains: [] } }));
  await page.goto("/knowledge");
  const reader = page.locator(".knowledge-reader");
  await expect(reader.getByRole("link", { name: "导入资料" })).toBeVisible();
  const readerBounds = await reader.boundingBox();
  const emptyBounds = await reader.locator(".state-panel--empty").boundingBox();
  expect(readerBounds).not.toBeNull();
  expect(emptyBounds).not.toBeNull();
  expect(Math.abs(emptyBounds!.y + emptyBounds!.height / 2 - readerBounds!.y - readerBounds!.height / 2)).toBeLessThan(2);
});

test("fresh personal library offers import from every empty view", async ({ page }) => {
  test.skip(!personalURL, "Set E2E_PERSONAL_BASE_URL for isolated personal-library tests");

  await page.goto(personalURL!);
  await expect(page.getByRole("heading", { name: "向知识库提问" })).toBeVisible();
  await expect(page.locator(".composer textarea")).toBeDisabled();
  await expect(page.locator(".chat-welcome").getByRole("link", { name: "导入资料" })).toBeVisible();
  await page.locator(".chat-welcome").getByRole("link", { name: "导入资料" }).click();
  await expect(page).toHaveURL(/\/sources$/);
  await expect(page.getByRole("heading", { name: "资料与知识生成" })).toBeVisible();
  await expect(page.getByText("尚未导入资料")).toBeVisible();

  await page.getByRole("link", { name: "知识页面" }).click();
  await expect(page.getByRole("heading", { name: "知识目录" })).toBeVisible();
  await expect(page.locator(".knowledge-reader").getByRole("link", { name: "导入资料" })).toBeVisible();

  await page.getByRole("link", { name: "知识图谱" }).click();
  await expect(page.locator(".graph-empty").getByText("尚无已发布的知识")).toBeVisible();
  await page.locator(".graph-empty").getByRole("button", { name: "导入资料" }).click();
  await expect(page).toHaveURL(/\/sources$/);
  await page.locator(".source-library").getByRole("button", { name: "导入资料" }).click();
  const topic = page.getByRole("combobox", { name: "专题" });
  await expect(topic).toBeVisible();
  await topic.fill("Agent");
  await expect(topic).toHaveValue("Agent");
  const chooser = page.locator('input[type="file"]');
  await chooser.setInputFiles({ name: "legacy.doc", mimeType: "application/msword", buffer: Buffer.from("unsupported") });
  await expect(page.locator(".upload-files .error-icon")).toBeVisible();
  await expect(page.getByRole("button", { name: "导入并生成知识" })).toBeDisabled();
  await page.locator(".upload-files").getByRole("button", { name: "移除" }).click();
  await chooser.setInputFiles("e2e/fixtures/python-word.docx");
  await expect(page.locator(".upload-files .success-icon")).toBeVisible();
  await expect(page.getByRole("button", { name: "导入并生成知识" })).toBeEnabled();
});
