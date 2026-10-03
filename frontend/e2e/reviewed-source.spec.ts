import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

const baseURL = process.env.E2E_OCR_REVIEW_BASE_URL;
const fixture = process.env.E2E_OCR_REVIEW_FIXTURE;

test("blank scanned page survives refresh and publishes only after correction", async ({ page }) => {
  test.skip(!baseURL || !fixture, "Set isolated OCR review server and fixture");
  const original = readFileSync(fixture!);
  await page.goto(`${baseURL}/sources`);
  await page.locator(".source-library").getByRole("button", { name: "导入资料" }).click();
  await page.getByRole("combobox", { name: "专题" }).fill("Python");
  await page.locator('input[type="file"]').setInputFiles({
    name: "blank-only.pdf", mimeType: "application/pdf", buffer: original,
  });
  await page.getByRole("button", { name: "导入并生成知识" }).click();
  await expect(page.getByText("扫描页文字待核对，确认后再生成知识")).toBeVisible();
  const imported = await (await page.request.get(`${baseURL}/api/v1/sources`)).json();
  expect(imported.total).toBe(1);
  const versionId = imported.items[0].currentVersionId;
  expect(imported.items[0].status).toBe("needs_review");
  const content = await (await page.request.get(`${baseURL}/api/v1/source-versions/${versionId}/content`)).json();
  expect(content.content).toBe("");
  expect(content.pageSpans[0].reviewStatus).toBe("needs_review");
  expect((await (await page.request.get(`${baseURL}/api/v1/compile-runs`)).json()).items).toHaveLength(0);
  expect((await (await page.request.get(`${baseURL}/api/v1/bootstrap`)).json()).snapshot).toBeNull();

  await page.reload();
  await page.locator(".data-table__row").getByText("blank-only.pdf").click();
  const source = page.getByRole("dialog", { name: "blank-only" });
  await expect(source.getByRole("textbox", { name: "第 1 页校对文字" })).toBeVisible();
  if (process.env.E2E_OCR_REVIEW_SCREENSHOT) {
    await page.screenshot({ path: process.env.E2E_OCR_REVIEW_SCREENSHOT, fullPage: true });
  }
  await expect(source.getByRole("button", { name: "确认文字并生成知识" })).toBeDisabled();
  const originalLink = source.getByRole("link", { name: "查看 PDF 原件" });
  const pdfResponse = await page.request.get(`${baseURL}${await originalLink.getAttribute("href")}`);
  expect(Buffer.compare(await pdfResponse.body(), original)).toBe(0);
  await source.getByRole("textbox", { name: "第 1 页校对文字" }).fill(
    "Human verified Python source details on the first physical scanned PDF page. The original document remains unchanged.",
  );
  await source.getByRole("button", { name: "确认文字并生成知识" }).click();
  const run = page.getByRole("dialog", { name: "知识生成任务" });
  await expect(run.getByRole("heading", { name: "确认本次知识变更" })).toBeVisible();
  await run.getByRole("button", { name: "确认并发布知识版本" }).click();
  await expect.poll(async () => {
    const response = await page.request.get(`${baseURL}/api/v1/bootstrap`);
    return (await response.json()).snapshot?.knowledgeCount;
  }).toBe(1);
  await run.getByRole("button", { name: "关闭" }).click();
  const reviewed = await (await page.request.get(`${baseURL}/api/v1/source-versions/${versionId}/content`)).json();
  expect(reviewed.pageSpans[0].reviewStatus).toBe("reviewed");
  expect(reviewed.pageSpans[0].qualityScore).toBe(content.pageSpans[0].qualityScore);
  expect(reviewed.pageSpans[0].reviewedAt).toBeTruthy();

  await page.getByRole("link", { name: "知识页面" }).click();
  await page.getByText("Verified scanned source").first().click();
  await expect(page.getByRole("button", { name: /已人工校对（原始识别 0 分）/ })).toBeVisible();
  await page.getByRole("link", { name: "知识问答" }).click();
  await page.locator(".composer textarea").fill("How does the verified Python source cite its page?");
  await page.getByRole("button", { name: "发送问题" }).click();
  await expect(page.locator(".message--assistant").getByText(/first physical page/)).toBeVisible();
  await expect(page.locator(".evidence-panel").getByText(/已人工校对（原始识别 0 分）/).first()).toBeVisible();
});

test("mixed import keeps correction available while another file compiles", async ({ page }) => {
  test.skip(!baseURL || !fixture, "Set isolated OCR review server and fixture");
  await page.goto(`${baseURL}/sources`);
  await page.getByRole("button", { name: "导入资料" }).first().click();
  await page.getByRole("combobox", { name: "专题" }).fill("Python");
  await page.locator('input[type="file"]').setInputFiles([
    {
      name: "mixed-good.pdf", mimeType: "application/pdf",
      buffer: readFileSync(resolve("e2e/fixtures/python-scanned.pdf")),
    },
    {
      name: "mixed-pending.pdf", mimeType: "application/pdf",
      buffer: Buffer.concat([readFileSync(fixture!), Buffer.from("\n% mixed-import-correction\n")]),
    },
  ]);
  await page.getByRole("button", { name: "导入并生成知识" }).click();
  const upload = page.getByRole("dialog", { name: "导入资料" });
  await expect(upload.getByText("mixed-good.pdf")).toBeVisible();
  await expect(upload.getByText("mixed-pending.pdf")).toBeVisible();
  await upload.getByRole("button", { name: "核对文字" }).click();
  await expect(page.getByRole("dialog", { name: "mixed-pending" })
    .getByRole("textbox", { name: "第 1 页校对文字" })).toBeVisible();
  const runs = (await (await page.request.get(`${baseURL}/api/v1/compile-runs`)).json()).items;
  const sources = (await (await page.request.get(`${baseURL}/api/v1/sources`)).json()).items;
  const goodId = sources.find((source: { filename: string }) => source.filename === "mixed-good.pdf").currentVersionId;
  const pendingId = sources.find((source: { filename: string }) => source.filename === "mixed-pending.pdf").currentVersionId;
  expect(runs.filter((run: { sourceVersionIds: string[] }) => run.sourceVersionIds.includes(goodId))).toHaveLength(1);
  expect(runs.some((run: { sourceVersionIds: string[] }) => run.sourceVersionIds.includes(pendingId))).toBe(false);
});
