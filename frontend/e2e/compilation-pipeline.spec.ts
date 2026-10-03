import { expect, test } from "@playwright/test";

const pipelineURL = process.env.E2E_PIPELINE_BASE_URL;

test("knowledge compilation reports real progress and resumes validated batches", async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  test.skip(!pipelineURL, "Set E2E_PIPELINE_BASE_URL for an empty isolated server with one group per batch");
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const content = Array.from({ length: 6 }, (_, index) =>
    `### Pipeline check ${index}?\n\nRetained pipeline evidence for question ${index} stays with its question.`,
  ).join("\n\n");
  await page.goto(`${pipelineURL}/sources`);
  await page.locator(".source-library").getByRole("button", { name: "导入资料" }).click();
  await page.getByRole("combobox", { name: "专题" }).fill("Python");
  await page.locator('input[type="file"]').setInputFiles({
    name: "pipeline-notes.md", mimeType: "text/markdown", buffer: Buffer.from(content),
  });
  await page.getByRole("button", { name: "导入并生成知识" }).click();
  const task = page.getByRole("dialog", { name: "知识生成任务" });
  const progress = task.getByRole("progressbar", { name: "知识生成进度" });
  await expect(progress).toHaveAttribute("aria-valuemax", "6");
  await expect(task).toContainText("3 批处理中");
  await expect(task).toContainText("读取耗时");
  await page.screenshot({ path: testInfo.outputPath("compilation-running-desktop.png"), fullPage: true });
  const first = (await (await page.request.get(`${pipelineURL}/api/v1/compile-runs`)).json()).items[0];
  await expect.poll(async () =>
    (await (await page.request.get(`${pipelineURL}/api/v1/compile-runs/${first.runId}`)).json()).status,
  ).toBe("failed");
  const failed = await (await page.request.get(`${pipelineURL}/api/v1/compile-runs/${first.runId}`)).json();
  expect(failed.counts.batchesCompleted).toBe(2);
  expect(failed.counts.batchesInFlight).toBe(0);
  await expect(progress).toHaveAttribute("aria-valuenow", "2");
  expect((await (await page.request.get(`${pipelineURL}/api/v1/bootstrap`)).json()).snapshot).toBeNull();
  const review = await (await page.request.get(`${pipelineURL}/api/v1/compile-runs/${first.runId}/review`)).json();
  expect(review.knowledgeItems).toEqual([]);
  expect((await page.request.post(`${pipelineURL}/api/v1/compile-runs/${first.runId}/accept`)).status()).toBe(400);
  await expect(task).not.toContainText("确认本次知识变更");
  await page.screenshot({ path: testInfo.outputPath("compilation-failed-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  const overflowing = await task.locator(".run-card__stats span").evaluateAll((elements) =>
    elements.filter((element) => element.scrollWidth > element.clientWidth + 1).map((element) => element.textContent),
  );
  expect(overflowing).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("compilation-failed-mobile.png"), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 960 });
  await task.getByRole("button", { name: "重新处理", exact: true }).click();
  await expect(task).toContainText("已复用 2 批");
  await expect(task.getByRole("heading", { name: "确认本次知识变更" })).toBeVisible();
  await expect(progress).toHaveAttribute("aria-valuenow", "6");
  await expect(task).toContainText("生成耗时");
  await expect(task).toContainText("最近一批");
  const runs = await (await page.request.get(`${pipelineURL}/api/v1/compile-runs`)).json();
  const resumed = runs.items.find((run: { runId: string }) => run.runId !== first.runId);
  expect(resumed.counts.batchesReused).toBe(2);
  expect(resumed.counts.batchesRetried).toBe(0);
  expect((await (await page.request.get(`${pipelineURL}/api/v1/bootstrap`)).json()).snapshot).toBeNull();
  await page.screenshot({ path: testInfo.outputPath("compilation-resumed-desktop.png"), fullPage: true });
  await task.getByRole("button", { name: "确认并发布知识版本" }).click();
  await expect.poll(async () =>
    (await (await page.request.get(`${pipelineURL}/api/v1/bootstrap`)).json()).snapshot?.knowledgeCount,
  ).toBe(6);
  const graph = await (await page.request.get(`${pipelineURL}/api/v1/graph`)).json();
  expect(graph.counts.nodes).toBe(6);
  const version = (await (await page.request.get(`${pipelineURL}/api/v1/sources`)).json()).items[0].currentVersionId;
  const original = await (await page.request.get(`${pipelineURL}/api/v1/source-versions/${version}/original`)).body();
  expect(original).toEqual(Buffer.from(content));
  expect(errors).toEqual([]);
});

test("waiting for the first batch updates elapsed time without advancing completion", async ({ page }, testInfo) => {
  test.skip(!pipelineURL, "Set E2E_PIPELINE_BASE_URL for an isolated offline server");
  await page.goto(`${pipelineURL}/sources`);
  await page.locator(".page-header").getByRole("button", { name: "导入资料" }).click();
  await page.getByRole("combobox", { name: "专题" }).fill("Python");
  await page.locator('input[type="file"]').setInputFiles({
    name: "waiting-notes.md", mimeType: "text/markdown",
    buffer: Buffer.from("### Waiting check?\n\nRetained evidence remains available while waiting for the model."),
  });
  await page.getByRole("button", { name: "导入并生成知识" }).click();
  const task = page.getByRole("dialog", { name: "知识生成任务" });
  const progress = task.getByRole("progressbar", { name: "知识生成进度" });
  await expect(progress).toHaveAttribute("aria-valuenow", "0");
  await expect(task).toContainText("1 批处理中");
  await expect(task).toContainText("生成耗时 5 秒");
  await expect(progress).toHaveAttribute("aria-valuenow", "0");
  await page.screenshot({ path: testInfo.outputPath("compilation-waiting-desktop.png"), fullPage: true });
  await page.reload();
  await expect(task.getByText("生成耗时 5 秒")).toBeVisible();
  await expect(task.getByRole("progressbar", { name: "知识生成进度" })).toHaveAttribute("aria-valuenow", "0");
  await expect(task.getByRole("heading", { name: "确认本次知识变更" })).toBeVisible();
});

test("invalid evidence gets one corrective retry before review and publication", async ({ page }, testInfo) => {
  test.skip(!pipelineURL, "Set E2E_PIPELINE_BASE_URL for an isolated offline server");
  const content = "### Reference check?\n\nRetained evidence must stay traceable after correcting the references.";
  await page.goto(`${pipelineURL}/sources`);
  const previousRuns = (await (await page.request.get(`${pipelineURL}/api/v1/compile-runs`)).json()).items;
  if (previousRuns.some((run: { status: string }) => run.status === "awaiting_review")) {
    await page.getByRole("dialog", { name: "知识生成任务" }).getByRole("button", { name: "关闭", exact: true }).click();
  }
  await page.locator(".page-header").getByRole("button", { name: "导入资料" }).click();
  await page.getByRole("combobox", { name: "专题" }).fill("Python");
  await page.locator('input[type="file"]').setInputFiles({
    name: "reference-notes.md", mimeType: "text/markdown", buffer: Buffer.from(content),
  });
  await page.getByRole("button", { name: "导入并生成知识" }).click();
  const task = page.getByRole("dialog", { name: "知识生成任务" });
  await expect(task).toContainText("已重试 1 次");
  await expect(task.getByRole("progressbar", { name: "知识生成进度" })).toHaveAttribute("aria-valuenow", "0");
  await expect(task.getByRole("heading", { name: "确认本次知识变更" })).toBeVisible();
  const run = (await (await page.request.get(`${pipelineURL}/api/v1/compile-runs`)).json()).items[0];
  expect(run.status).toBe("awaiting_review");
  expect(run.counts.batchesCompleted).toBe(1);
  expect(run.counts.batchesRetried).toBe(1);
  expect(run.counts.batchesInFlight).toBe(0);
  const before = (await (await page.request.get(`${pipelineURL}/api/v1/bootstrap`)).json()).snapshot?.knowledgeCount ?? 0;
  const review = await (await page.request.get(`${pipelineURL}/api/v1/compile-runs/${run.runId}/review`)).json();
  expect(review.knowledgeItems[0].evidenceIds.every((id: string) => id.startsWith("E-SV-"))).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("compilation-reference-corrected.png"), fullPage: true });
  await task.getByRole("button", { name: "确认并发布知识版本" }).click();
  await expect.poll(async () =>
    (await (await page.request.get(`${pipelineURL}/api/v1/bootstrap`)).json()).snapshot?.knowledgeCount,
  ).toBe(before + 1);
  const version = run.sourceVersionIds[0];
  expect(await (await page.request.get(`${pipelineURL}/api/v1/source-versions/${version}/original`)).body())
    .toEqual(Buffer.from(content));
});
