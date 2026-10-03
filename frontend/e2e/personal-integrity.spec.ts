import { expect, test } from "@playwright/test";

const integrityURL = process.env.E2E_INTEGRITY_BASE_URL;

test("personal lists paginate and updated sources support search and follow-ups", async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  test.skip(!integrityURL, "Set E2E_INTEGRITY_BASE_URL for an empty isolated offline server");
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${integrityURL}/sources`);
  await page.locator(".source-library").getByRole("button", { name: "导入资料" }).click();
  await page.getByRole("combobox", { name: "专题" }).fill("Python");
  await page.locator('input[type="file"]').setInputFiles(Array.from({ length: 35 }, (_, index) => ({
    name: `directory-${String(index + 1).padStart(3, "0")}.md`,
    mimeType: "text/markdown",
    buffer: Buffer.from(`Directory entry ${index + 1}: retained source information. ${index === 34 ? "tail-only-needle" : "Archive material"}.`),
  })));
  await page.getByRole("button", { name: "导入并生成知识" }).click();
  const task = page.getByRole("dialog", { name: "知识生成任务" });
  await expect(task.getByRole("heading", { name: "确认本次知识变更" })).toBeVisible();
  await task.getByRole("button", { name: "确认并发布知识版本" }).click();
  await expect.poll(async () => (await (await page.request.get(`${integrityURL}/api/v1/bootstrap`)).json()).snapshot?.knowledgeCount).toBe(35);
  await task.getByRole("button", { name: "关闭" }).click();
  await page.getByRole("tablist", { name: "资料管理视图" }).getByRole("button", { name: /已入库资料/ }).click();

  await expect(page.locator(".data-table__row")).toHaveCount(30);
  await page.getByRole("button", { name: "下一页资料" }).click();
  await expect(page.locator(".data-table__row")).toHaveCount(5);
  await expect(page.getByRole("button", { name: "下一页资料" })).toBeDisabled();
  await page.getByPlaceholder("搜索资料名称或文件名").fill("directory-035");
  await expect(page.locator(".data-table__row")).toHaveCount(1);
  const sources = await (await page.request.get(`${integrityURL}/api/v1/sources?query=directory-035`)).json();
  const oldVersionId: string = sources.items[0].currentVersionId;
  const original = await (await page.request.get(`${integrityURL}/api/v1/source-versions/${oldVersionId}/original`)).body();
  await page.screenshot({ path: testInfo.outputPath("sources-search.png"), fullPage: true, animations: "disabled" });

  await page.getByRole("link", { name: "知识页面" }).click();
  await expect(page.locator(".knowledge-index__list > button")).toHaveCount(30);
  const directory = await page.locator(".knowledge-index__list").boundingBox();
  const pagination = await page.locator(".knowledge-index .directory-pagination").boundingBox();
  expect(directory!.y + directory!.height).toBeLessThanOrEqual(pagination!.y);
  await expect(page.locator(".dialog-overlay")).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("knowledge-page-desktop.png"), fullPage: true, animations: "disabled" });
  await page.getByRole("button", { name: "下一页知识" }).click();
  await expect(page.locator(".knowledge-index__list > button")).toHaveCount(5);
  await page.getByPlaceholder("搜索知识标题或内容").last().fill("tail-only-needle");
  await expect(page.locator(".knowledge-index__list > button")).toHaveCount(1);
  await expect(page.locator(".knowledge-reader")).toContainText("directory-035");
  await page.locator(".knowledge-article .evidence-reference").click();
  await expect(page.getByRole("dialog", { name: "来源证据" })).toContainText("tail-only-needle");
  await page.getByRole("dialog", { name: "来源证据" }).getByRole("button", { name: "关闭" }).click();
  await expect(page.locator(".side-panel")).toHaveCount(0);
  await expect(page.locator(".dialog-overlay")).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("knowledge-search.png"), fullPage: true, animations: "disabled" });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("button", { name: "下一页知识" })).toBeInViewport();
  await expect.poll(() => page.locator(".sidebar").evaluate((element) => element.getBoundingClientRect().right)).toBeLessThanOrEqual(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: testInfo.outputPath("knowledge-page-mobile.png"), fullPage: true, animations: "disabled" });
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.getByRole("textbox", { name: "搜索当前知识" }).fill("directory-001");
  await page.getByRole("textbox", { name: "搜索当前知识" }).press("Enter");
  await expect(page.locator(".knowledge-index input")).toHaveValue("directory-001");
  await expect(page.locator(".knowledge-index__list > button")).toHaveCount(1);
  await expect(page.locator(".knowledge-reader")).toContainText("directory-001");

  await page.getByRole("link", { name: "资料管理" }).click();
  await page.getByRole("button", { name: "导入资料", exact: true }).first().click();
  await page.getByRole("combobox", { name: "专题" }).fill("Python");
  await page.locator('input[type="file"]').setInputFiles({
    name: "directory-035.md", mimeType: "text/markdown",
    buffer: Buffer.from("Directory entry 35: revised-only-needle is the current value after updating this source."),
  });
  await page.getByRole("button", { name: "导入并生成知识" }).click();
  await expect(task.getByRole("heading", { name: "确认本次知识变更" })).toBeVisible();
  await task.getByRole("button", { name: "确认并发布知识版本" }).click();
  await expect.poll(async () => {
    const current = await (await page.request.get(`${integrityURL}/api/v1/knowledge?query=revised-only-needle`)).json();
    return current.total;
  }).toBe(1);
  await task.getByRole("button", { name: "关闭" }).click();
  expect((await (await page.request.get(`${integrityURL}/api/v1/knowledge?query=tail-only-needle`)).json()).total).toBe(0);
  expect(await (await page.request.get(`${integrityURL}/api/v1/source-versions/${oldVersionId}/original`)).body()).toEqual(original);
  const graph = await (await page.request.get(`${integrityURL}/api/v1/graph`)).json();
  expect(graph.counts.nodes).toBe(35);

  await page.getByRole("link", { name: "知识问答" }).click();
  await page.locator(".composer textarea").fill("revised-only-needle");
  await page.getByRole("button", { name: "发送问题" }).click();
  await expect(page.locator(".message--assistant")).toContainText("current value");
  await expect(page.locator(".message--assistant .citation-marker")).toHaveCount(1);
  await page.locator(".composer textarea").fill("那它更新后呢？");
  await page.getByRole("button", { name: "发送问题" }).click();
  await expect(page.locator(".message--assistant")).toHaveCount(2);
  await expect(page.locator(".message--assistant").last()).toContainText("current value");
  await expect(page.locator(".message--assistant").last().locator(".citation-marker")).toHaveCount(1);
  await page.screenshot({ path: testInfo.outputPath("follow-up.png"), fullPage: true, animations: "disabled" });
  expect(errors).toEqual([]);
});
