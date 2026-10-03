import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

const recoveryURL = process.env.E2E_PROJECT_RECOVERY_BASE_URL;

test("answers reconnect and stop, and confirmed project backups preserve evidence and local settings", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  test.skip(!recoveryURL, "Set E2E_PROJECT_RECOVERY_BASE_URL for an empty isolated offline server");
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto(`${recoveryURL}/sources`);
  await page.locator(".source-library").getByRole("button", { name: "导入资料" }).click();
  await page.getByRole("combobox", { name: "专题" }).fill("Python");
  const original = readFileSync(resolve("e2e/fixtures/python-two-page.pdf"));
  await page.locator('input[type="file"]').setInputFiles({
    name: "python-recovery.pdf", mimeType: "application/pdf", buffer: original,
  });
  await page.getByRole("button", { name: "导入并生成知识" }).click();
  const task = page.getByRole("dialog", { name: "知识生成任务" });
  await expect(task.getByRole("heading", { name: "确认本次知识变更" })).toBeVisible();
  await task.getByRole("button", { name: "确认并发布知识版本" }).click();
  await expect.poll(async () => (await (await page.request.get(`${recoveryURL}/api/v1/bootstrap`)).json()).snapshot?.knowledgeCount).toBe(2);
  await task.getByRole("button", { name: "关闭" }).click();

  await page.getByRole("link", { name: "知识问答" }).click();
  await page.getByRole("textbox", { name: "输入问题" }).fill("Python slow recovery");
  await page.getByRole("button", { name: "发送问题" }).click();
  await expect(page.locator(".message--streaming")).toContainText("Python context managers");
  const conversationURL = page.url().split("?")[0];
  const conversationId = conversationURL.split("/").at(-1)!;
  const active = (await (await page.request.get(`${recoveryURL}/api/v1/conversations/${conversationId}`)).json()).activeAnswer;
  expect((await page.request.get(`${recoveryURL}/api/v1/project/backup`)).status()).toBe(400);
  await page.goto(conversationURL);
  await expect(page.getByRole("button", { name: "停止回答" })).toBeVisible();
  await expect(page.locator(".message--streaming")).toContainText("Python context managers");
  await page.getByRole("button", { name: "停止回答" }).click();
  await expect(page.locator(".answer-error")).toContainText("回答已停止");
  expect((await (await page.request.get(`${recoveryURL}/api/v1/answers/${active.answerId}`)).json()).error.code).toBe("answer_cancelled");
  await page.reload();
  await expect(page.locator(".answer-error")).toContainText("回答已停止");
  await expect(page.getByRole("button", { name: "发送问题" })).toBeVisible();
  await page.getByRole("button", { name: "重新生成", exact: true }).click();
  await expect(page.getByRole("button", { name: "停止回答" })).toBeVisible();
  await expect(page.locator(".message--assistant").last()).toContainText("close resources after a with block", { timeout: 20_000 });
  await expect(page.locator(".message--assistant").last().locator(".citation-marker")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "停止回答" })).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".message--assistant")).toHaveCount(2);
  const saved = await (await page.request.get(`${recoveryURL}/api/v1/conversations/${conversationId}`)).json();
  const citations = saved.messages.at(-1).answer.citations;
  expect(citations).toHaveLength(1);
  await page.locator(".evidence-panel").getByRole("button", { name: "查看原始资料" }).click();
  await expect(page.locator(".document-reader")).toContainText("Python");
  await page.getByRole("dialog").getByRole("button", { name: "关闭" }).click();
  await page.screenshot({ path: testInfo.outputPath("answer-recovered.png"), fullPage: true, animations: "disabled" });

  await page.getByRole("link", { name: "设置", exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出项目备份" }).click();
  const download = await downloadPromise;
  const packagePath = testInfo.outputPath("project-backup.zip");
  await download.saveAs(packagePath);
  const packageBytes = readFileSync(packagePath);
  expect(packageBytes.subarray(0, 2).toString()).toBe("PK");
  expect((await page.request.post(`${recoveryURL}/api/v1/project/restore`, {
    multipart: { file: { name: "project.zip", mimeType: "application/zip", buffer: packageBytes } },
  })).status()).toBe(422);
  const chooseBackup = () => page.getByLabel("选择项目备份").setInputFiles(packagePath);
  await chooseBackup();
  const confirmation = page.getByRole("dialog", { name: "恢复项目备份" });
  await expect(confirmation).toContainText("无法撤销");
  await confirmation.getByRole("button", { name: "返回" }).click();
  await expect(confirmation).toHaveCount(0);
  expect((await (await page.request.get(`${recoveryURL}/api/v1/conversations/${conversationId}`)).json()).messages).toHaveLength(4);

  const source = (await (await page.request.get(`${recoveryURL}/api/v1/sources`)).json()).items[0];
  expect((await page.request.delete(`${recoveryURL}/api/v1/sources/${source.sourceId}`)).ok()).toBe(true);
  await page.request.put(`${recoveryURL}/api/v1/settings/appearance`, { data: { themePreference: "light", reduceMotion: false } });
  const modelsBefore = await (await page.request.get(`${recoveryURL}/api/v1/settings/models`)).json();
  await page.reload();
  await page.getByLabel("选择项目备份").setInputFiles({
    name: "broken.zip", mimeType: "application/zip", buffer: Buffer.from("broken package"),
  });
  await expect(page.getByRole("alert")).toContainText("备份无法恢复");
  expect((await (await page.request.get(`${recoveryURL}/api/v1/sources`)).json()).total).toBe(0);
  await chooseBackup();
  await expect(confirmation).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("restore-confirmation.png"), fullPage: true, animations: "disabled" });
  await confirmation.getByRole("button", { name: "确认替换并恢复" }).click();
  await expect(page.getByRole("status")).toContainText("项目已恢复");
  expect(await (await page.request.get(`${recoveryURL}/api/v1/settings/models`)).json()).toEqual(modelsBefore);
  expect((await (await page.request.get(`${recoveryURL}/api/v1/settings/appearance`)).json()).themePreference).toBe("light");
  expect(await (await page.request.get(`${recoveryURL}/api/v1/source-versions/${source.currentVersionId}/original`)).body()).toEqual(original);
  expect((await (await page.request.get(`${recoveryURL}/api/v1/conversations/${conversationId}`)).json()).messages.at(-1).answer.citations).toEqual(citations);
  expect((await (await page.request.get(`${recoveryURL}/api/v1/graph`)).json()).counts).toEqual({ nodes: 2, edges: 1 });

  for (const viewport of [{ width: 1440, height: 960 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    for (const themePreference of ["light", "dark"]) {
      await page.request.put(`${recoveryURL}/api/v1/settings/appearance`, { data: { themePreference, reduceMotion: false } });
      await page.goto(`${recoveryURL}/settings`);
      await expect(page.getByRole("button", { name: "导出项目备份" })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
      await page.screenshot({ path: testInfo.outputPath(`settings-${viewport.width}-${themePreference}.png`), fullPage: true, animations: "disabled" });
      const sidebar = await page.locator(".sidebar").boundingBox();
      expect(sidebar).not.toBeNull();
      if (viewport.width > 760) {
        const sidebarWidth = await page.locator(".app-shell").evaluate((element) =>
          Number.parseFloat(getComputedStyle(element).getPropertyValue("--sidebar-width")));
        expect(sidebar!.x).toBe(0);
        expect(sidebar!.width).toBe(sidebarWidth);
      } else {
        expect(sidebar!.x + sidebar!.width).toBeLessThanOrEqual(0);
      }
      await chooseBackup();
      await expect(confirmation).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
      await page.screenshot({ path: testInfo.outputPath(`confirmation-${viewport.width}-${themePreference}.png`), fullPage: true, animations: "disabled" });
      await confirmation.getByRole("button", { name: "返回" }).click();
      await page.goto(`${recoveryURL}/graph`);
      await expect(page.locator(".graph-stage")).toHaveAttribute("data-ready", "true");
      await expect(page.locator(".graph-stage")).toHaveAttribute("data-node-count", "2");
      await expect(page.locator(".graph-stage")).toHaveAttribute("data-link-count", "1");
      const canvas = page.locator("canvas");
      const before = await canvas.screenshot();
      expect((await canvas.screenshot()).equals(before)).toBe(false);
      await page.getByRole("button", { name: "停止旋转" }).click();
      await expect(page.getByRole("button", { name: "自动旋转" })).toBeVisible();
      const particles = page.getByRole("button", { name: "关系流动" });
      await particles.click();
      await expect(particles).not.toHaveClass(/is-active/);
      await particles.click();
      await expect(particles).toHaveClass(/is-active/);
      await page.getByRole("button", { name: "适应画布" }).click();
      // The fit control completes a 700 ms camera transition.
      await page.waitForTimeout(900);
      await canvas.screenshot({ path: testInfo.outputPath(`canvas-${viewport.width}-${themePreference}.png`) });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
      await page.screenshot({ path: testInfo.outputPath(`graph-${viewport.width}-${themePreference}.png`), fullPage: true, animations: "disabled" });
    }
  }
  expect(errors.filter((message) => !message.includes("400 (Bad Request)"))).toEqual([]);
});
