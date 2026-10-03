import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

const scannedURL = process.env.E2E_SCANNED_BASE_URL;

test("scanned PDF citation preserves page and OCR quality across the journey", async ({ page }) => {
  test.skip(!scannedURL, "Set E2E_SCANNED_BASE_URL for isolated Windows OCR browser acceptance");
  const original = readFileSync(resolve("e2e/fixtures/python-scanned.pdf"));
  await page.goto(`${scannedURL}/sources`);
  await page.locator(".source-library").getByRole("button", { name: "导入资料" }).click();
  await page.getByRole("combobox", { name: "专题" }).fill("Python");
  await page.locator('input[type="file"]').setInputFiles({
    name: "python-scanned.pdf",
    mimeType: "application/pdf",
    buffer: original,
  });
  await page.getByRole("button", { name: "导入并生成知识" }).click();
  const run = page.getByRole("dialog", { name: "知识生成任务" });
  await expect(run.getByRole("heading", { name: "确认本次知识变更" })).toBeVisible();
  await run.getByRole("button", { name: "确认并发布知识版本" }).click();
  await expect.poll(async () => {
    const response = await page.request.get(`${scannedURL}/api/v1/bootstrap`);
    return (await response.json()).snapshot?.knowledgeCount;
  }).toBe(1);
  await run.getByRole("button", { name: "关闭" }).click();

  await page.getByRole("link", { name: "知识页面" }).click();
  await expect(page.getByText("Scanned source page").first()).toBeVisible();
  await page.getByRole("button", { name: /第 2 页.*文字识别/ }).click();
  const evidence = page.getByRole("dialog", { name: "来源证据" });
  await expect(evidence.getByText(/文字识别 · \d+ 分/)).toBeVisible();
  await evidence.getByRole("link", { name: "打开完整原始资料" }).click();
  const source = page.getByRole("dialog", { name: "python-scanned" });
  await expect(source.locator("#source-page-2 h3")).toContainText("第 2 页");
  await expect(source.locator("#source-page-2 h3")).toContainText(/文字识别 · \d+ 分/);
  await expect(source.locator("#source-page-2")).toContainText("Python Agent notes preserve the original source");
  const originalLink = source.getByRole("link", { name: "查看 PDF 原件" });
  await expect(originalLink).toHaveAttribute("href", /\/original#page=2$/);
  const originalPath = (await originalLink.getAttribute("href"))!.split("#")[0];
  const response = await page.request.get(`${scannedURL}${originalPath}`);
  expect(response.ok()).toBeTruthy();
  expect(Buffer.compare(await response.body(), original)).toBe(0);

  await source.getByRole("button", { name: "关闭" }).click();
  await page.getByRole("link", { name: "知识问答" }).click();
  await page.locator(".composer textarea").fill("How should Python Agent notes cite their original source?");
  await page.getByRole("button", { name: "发送问题" }).click();
  await expect(page.locator(".message--assistant").getByText(/cite the second page/)).toBeVisible();
  await expect(page.locator(".evidence-panel").getByText(/文字识别 \d+ 分/).first()).toBeVisible();
});
