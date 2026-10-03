import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

const journeyURL = process.env.E2E_RECOVERY_BASE_URL;

test("review survives refresh and published knowledge supports cited answers", async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  test.skip(!journeyURL, "Set E2E_RECOVERY_BASE_URL for the isolated offline test server");

  await page.goto(`${journeyURL}/sources`);
  await page.locator(".source-library").getByRole("button", { name: "导入资料" }).click();
  await page.getByRole("combobox", { name: "专题" }).fill("Python");
  await page.locator('input[type="file"]').setInputFiles({
    name: `python-${Date.now()}.pdf`,
    mimeType: "application/pdf",
    buffer: Buffer.concat([
      readFileSync(resolve("e2e/fixtures/python-two-page.pdf")),
      Buffer.from(`\n% recovery-${Date.now()}\n`),
    ]),
  });
  await page.getByRole("button", { name: "导入并生成知识" }).click();
  await expect(page.getByRole("dialog", { name: "知识生成任务" }).getByRole("heading", { name: "确认本次知识变更" })).toBeVisible();

  await page.reload();
  const task = page.getByRole("dialog", { name: "知识生成任务" });
  await expect(task.getByRole("heading", { name: "确认本次知识变更" })).toBeVisible();
  await expect(task.getByText("新增", { exact: true }).first()).toBeVisible();
  await task.getByRole("button", { name: "确认并发布知识版本" }).click();
  await expect.poll(async () => {
    const response = await page.request.get(`${journeyURL}/api/v1/bootstrap`);
    return (await response.json()).snapshot?.knowledgeCount;
  }).toBe(2);
  await task.getByRole("button", { name: "关闭" }).click();

  await page.getByRole("link", { name: "知识页面" }).click();
  await expect(page.getByRole("heading", { name: "知识目录" })).toBeVisible();
  await expect(page.getByText("Python context managers").first()).toBeVisible();
  await expect(page.getByText("Closing file handles").first()).toBeVisible();

  await page.getByRole("link", { name: "知识图谱" }).click();
  await expect(page.locator("canvas")).toBeVisible();
  await expect.poll(async () => page.locator(".graph-stage").getAttribute("data-ready")).toBe("true");
  await expect(page.locator(".graph-stage")).toHaveAttribute("data-node-count", "2");
  await expect(page.locator(".graph-stage")).toHaveAttribute("data-link-count", "1");
  await expect.poll(async () => Number(await page.locator(".graph-stage").getAttribute("data-render-calls"))).toBeGreaterThan(0);
  for (const viewport of [{ width: 1440, height: 960 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    for (const themePreference of ["light", "dark"]) {
      await page.request.put(`${journeyURL}/api/v1/settings/appearance`, {
        data: { themePreference, reduceMotion: false },
      });
      await page.reload();
      await expect(page.locator(".graph-stage")).toHaveAttribute("data-ready", "true");
      const prefix = `graph-${viewport.width}-${themePreference}`;
      const canvas = page.locator("canvas");
      const before = await canvas.screenshot({ path: testInfo.outputPath(`${prefix}-canvas.png`) });
      const after = await canvas.screenshot();
      expect(after.equals(before)).toBe(false);
      await page.getByRole("button", { name: "停止旋转" }).click();
      await expect(page.getByRole("button", { name: "自动旋转" })).toBeVisible();
      const particles = page.getByRole("button", { name: "关系流动" });
      await particles.click();
      await expect(particles).not.toHaveClass(/is-active/);
      await particles.click();
      await expect(particles).toHaveClass(/is-active/);
      await page.getByRole("button", { name: "适应画布" }).click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
      await page.screenshot({ path: testInfo.outputPath(`${prefix}.png`), fullPage: true });
    }
  }
  await page.request.put(`${journeyURL}/api/v1/settings/appearance`, {
    data: { themePreference: "light", reduceMotion: false },
  });
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.reload();
  const graph = await page.evaluate(async () => (await (await fetch("/api/v1/graph")).json()) as { counts: { nodes: number; edges: number } });
  expect(graph.counts).toEqual({ nodes: 2, edges: 1 });

  await page.getByRole("link", { name: "知识问答" }).click();
  await page.locator(".composer textarea").fill("What do Python context managers do?");
  await page.getByRole("button", { name: "发送问题" }).click();
  await expect(page.locator(".message--assistant").getByText(/close resources after a with block/)).toBeVisible();
  await expect(page.locator(".evidence-panel").getByText(/第 1 页/).first()).toBeVisible();
});
