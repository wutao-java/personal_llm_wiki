import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

const pdfURL = process.env.E2E_PDF_BASE_URL;

test("a text PDF retains page links and the original after compilation cannot start", async ({ page }) => {
  test.skip(!pdfURL, "Set E2E_PDF_BASE_URL for an isolated PDF upload server");

  await page.goto(`${pdfURL}/sources`);
  await page.locator(".source-library").getByRole("button", { name: "导入资料" }).click();
  await page.getByRole("combobox", { name: "专题" }).fill("Python");
  const pdf = readFileSync(resolve("e2e/fixtures/python-two-page.pdf"));
  await page.locator('input[type="file"]').setInputFiles({
    name: `python-${Date.now()}.pdf`,
    mimeType: "application/pdf",
    buffer: Buffer.concat([pdf, Buffer.from(`\n% test-import-${Date.now()}\n`)]),
  });
  await page.getByRole("button", { name: "导入并生成知识" }).click();
  await expect(page.getByRole("dialog", { name: "知识生成任务" }).getByText("任务未完成")).toBeVisible();
  await page.getByRole("dialog", { name: "知识生成任务" }).getByRole("button", { name: "关闭" }).click();
  await page.getByRole("button", { name: /已入库资料/ }).click();
  await page.locator(".data-table__row").first().click();
  const reader = page.getByRole("dialog", { name: /python-\d+/ });
  await expect(reader.locator("#source-page-1")).toContainText("Python context managers");
  await expect(reader.locator("#source-page-2")).toContainText("The second page");
  const original = reader.getByRole("link", { name: "查看 PDF 原件" });
  await expect(original).toHaveAttribute("href", /\/original$/);
  const source = await page.evaluate(async () => {
    const response = await fetch("/api/v1/sources");
    return (await response.json()).items[0] as { sourceId: string; currentVersionId: string };
  });
  await page.goto(`${pdfURL}/sources?source=${encodeURIComponent(source.sourceId)}&version=${encodeURIComponent(source.currentVersionId)}&page=2`);
  await expect(page.locator("#source-page-2 h3")).toHaveText("第 2 页");
  await expect(page.getByRole("link", { name: "查看 PDF 原件" })).toHaveAttribute("href", /\/original#page=2$/);
  const response = await page.request.get(`${pdfURL}/api/v1/source-versions/${encodeURIComponent(source.currentVersionId)}/original`);
  expect(response.ok()).toBeTruthy();
  expect(response.headers()["content-type"]).toContain("application/pdf");
  expect((await response.body()).subarray(0, 4).toString()).toBe("%PDF");
});
