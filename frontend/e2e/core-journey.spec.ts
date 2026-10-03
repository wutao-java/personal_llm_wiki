import { expect, test } from "@playwright/test";

test("default entry exposes real cited-question workflow", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("FF - LLM Wiki知识库", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "从已有资料中获得可追溯的答案" })).toBeVisible();
  await expect(page.getByRole("button", { name: /推荐问题/ }).first()).toBeVisible();
  await expect(page.getByText("@2026 赋范空间 独家自研")).toBeVisible();
});

test("source reader and knowledge reader share the working application shell", async ({ page }) => {
  await page.goto("/sources");
  await expect(page.getByRole("heading", { name: "资料与知识生成" })).toBeVisible();
  const firstSource = page.locator(".data-table__row").first();
  await expect(firstSource).toBeVisible();
  await firstSource.click();
  await expect(page.getByText("原始资料 · 只读")).toBeVisible();
  await page.keyboard.press("Escape");

  await page.getByRole("link", { name: "知识页面" }).click();
  await expect(page.getByRole("heading", { name: "知识目录" })).toBeVisible();
  await expect(page.locator(".knowledge-article")).toBeVisible();
  await expect(page.getByText("来源依据").first()).toBeVisible();
});

test("graph and theme controls are available in both color modes", async ({ page }) => {
  await page.goto("/settings");
  await page.getByRole("button", { name: /深色/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("link", { name: "知识图谱" }).click();
  await expect(page.getByRole("heading", { name: "知识关系图谱" })).toBeVisible();
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.getByText(/个节点/)).toBeVisible();

  await page.getByRole("link", { name: "设置" }).click();
  await page.getByRole("button", { name: /浅色/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});
