import { expect, test } from "@playwright/test";

test("answer quality is a primary destination with a working legacy link", async ({ page }) => {
  await page.goto("/sources");
  const navigation = page.getByRole("complementary", { name: "主导航" }).getByRole("navigation");
  await expect(navigation.getByRole("link")).toHaveCount(6);
  await expect(navigation.getByRole("link", { name: "资料管理" })).toHaveAttribute("href", "/sources");
  const qualityLink = navigation.getByRole("link", { name: "问答质量" });
  await expect(qualityLink).toHaveAttribute("href", "/answer-quality");
  await qualityLink.click();
  await expect(page).toHaveURL(/\/answer-quality$/);
  await expect(qualityLink).toHaveClass(/is-active/);
  await expect(navigation.getByRole("link", { name: "资料管理" })).not.toHaveClass(/is-active/);
  await expect(page.getByRole("heading", { name: "问答质量" })).toBeVisible();

  await page.goto("/sources/quality");
  await expect(page).toHaveURL(/\/answer-quality$/);
  await expect(qualityLink).toHaveClass(/is-active/);
});

test("mobile navigation keeps answer quality at the top level without overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/answer-quality");
  await expect(page.getByRole("heading", { name: "问答质量" })).toBeVisible();
  await page.getByRole("button", { name: "打开导航" }).click();
  const navigation = page.getByRole("complementary", { name: "主导航" }).getByRole("navigation");
  await expect(navigation.getByRole("link")).toHaveCount(6);
  await expect(navigation.getByRole("link", { name: "问答质量" })).toHaveClass(/is-active/);
  await page.getByRole("button", { name: "关闭导航" }).last().click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
