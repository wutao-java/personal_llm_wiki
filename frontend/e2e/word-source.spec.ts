import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

const wordURL = process.env.E2E_WORD_BASE_URL;

test("Word table citation opens the correct extracted block and retained DOCX", async ({ page }) => {
  test.skip(!wordURL, "Set E2E_WORD_BASE_URL for an isolated offline Word test server");

  await page.goto(`${wordURL}/sources`);
  await page.locator(".source-library").getByRole("button", { name: "导入资料" }).click();
  await page.getByRole("combobox", { name: "专题" }).fill("Python");
  await page.locator('input[type="file"]').setInputFiles({
    name: `python-word-${Date.now()}.docx`,
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    buffer: Buffer.concat([
      readFileSync(resolve("e2e/fixtures/python-word.docx")),
      Buffer.from(`%word-import-${Date.now()}`),
    ]),
  });
  await page.getByRole("button", { name: "导入并生成知识" }).click();
  const task = page.getByRole("dialog", { name: "知识生成任务" });
  await expect(task.getByRole("heading", { name: "确认本次知识变更" })).toBeVisible();
  await task.getByRole("button", { name: "确认并发布知识版本" }).click();
  await expect.poll(async () => {
    const response = await page.request.get(`${wordURL}/api/v1/bootstrap`);
    return (await response.json()).snapshot?.knowledgeCount;
  }).toBe(1);
  await task.getByRole("button", { name: "关闭" }).click();

  await page.getByRole("link", { name: "知识页面" }).click();
  await expect(page.getByText("Python file cleanup").first()).toBeVisible();
  await page.getByRole("button", { name: /表格 1 · 第 2 行/ }).click();
  const evidence = page.getByRole("dialog", { name: "来源证据" });
  await expect(evidence.getByText(/表格 1 · 第 2 行/).first()).toBeVisible();
  await evidence.getByRole("link", { name: "打开完整原始资料" }).click();
  const source = page.getByRole("dialog", { name: /python-word-/ });
  await expect(source.locator("#source-block-4 h3")).toHaveText("表格 1 · 第 2 行");
  await expect(source.locator("#source-block-4")).toContainText("Python files must close after a with block");
  await expect(source.getByRole("link", { name: "下载 Word 原件" })).toHaveAttribute("href", /\/original$/);
  const original = await page.request.get(`${wordURL}${await source.getByRole("link", { name: "下载 Word 原件" }).getAttribute("href")}`);
  expect(original.ok()).toBeTruthy();
  expect((await original.body()).subarray(0, 4).toString()).toBe("PK\u0003\u0004");

  await source.getByRole("button", { name: "关闭" }).click();
  await page.getByRole("link", { name: "知识问答" }).click();
  await page.locator(".composer textarea").fill("Why must Python files close after a with block?");
  await page.getByRole("button", { name: "发送问题" }).click();
  await expect(page.locator(".message--assistant").getByText(/Python files must close after a with block/)).toBeVisible();
  await expect(page.locator(".evidence-panel").getByText(/表格 1 · 第 2 行/).first()).toBeVisible();
});
