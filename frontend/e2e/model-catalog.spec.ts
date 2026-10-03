import { expect, test } from "@playwright/test";

const settings = {
  activeProfileId: "openai-compatible",
  profiles: [
    {
      profileId: "deepseek-default", name: "DeepSeek 在线服务",
      baseUrl: "https://api.deepseek.com", modelId: "deepseek-chat", modelIds: ["deepseek-chat"],
      keyConfigured: false, credentialMask: null, status: "incomplete",
      lastTestedAt: null, lastLatencyMs: null, lastError: null,
    },
    {
      profileId: "openai-compatible", name: "OpenAI 兼容服务",
      baseUrl: "https://example.org/v1", modelId: "model-a", modelIds: ["model-a", "model-b"],
      keyConfigured: true, credentialMask: "••••••••", status: "available",
      lastTestedAt: null, lastLatencyMs: null, lastError: null,
    },
  ],
};

test("discovered models are all saved and selectable in the question composer", async ({ page }) => {
  const errors: string[] = [];
  let configured = structuredClone(settings);
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await page.route("**/api/v1/settings/models", (route) => route.fulfill({ json: configured }));
  await page.route("**/api/v1/settings/models/openai-compatible/discover", (route) =>
    route.fulfill({ json: { models: ["model-c", "model-d"] } }));
  await page.route("**/api/v1/settings/models/openai-compatible", (route) => {
    const payload = JSON.parse(route.request().postData() ?? "{}");
    const updated = { ...configured.profiles[1], ...payload, status: "untested" };
    configured = { ...configured, profiles: [configured.profiles[0], updated] };
    return route.fulfill({ json: updated });
  });
  await page.route("**/api/v1/settings/models/openai-compatible/test", (route) => {
    const updated = { ...configured.profiles[1], status: "available" };
    configured = { ...configured, profiles: [configured.profiles[0], updated] };
    return route.fulfill({ json: { ...updated, available: true, message: "模型服务连接可用" } });
  });

  await page.goto("/settings");
  await page.getByRole("button", { name: /OpenAI 兼容服务/ }).click();
  await expect(page.getByRole("textbox", { name: "模型标识", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "获取可用模型" }).click();
  const catalog = page.getByRole("list", { name: "可用模型列表" });
  await expect(catalog.getByRole("listitem")).toHaveCount(4);
  await page.getByRole("textbox", { name: "手动添加模型" }).fill("manual-model");
  await page.getByRole("button", { name: "添加模型" }).click();
  await expect(catalog.getByRole("listitem")).toHaveCount(5);
  await page.getByRole("button", { name: "保存配置" }).click();
  await expect(page.getByRole("button", { name: "测试连接" })).toBeEnabled();
  await page.getByRole("button", { name: "测试连接" }).click();
  await expect(page.getByText("连接测试通过")).toBeVisible();
  await page.screenshot({ path: "test-results/model-catalog-light.png", fullPage: true });

  await page.goto("/");
  await page.getByRole("button", { name: /选择问答模型/ }).click();
  const providers = page.locator(".model-picker__providers");
  await expect(providers.getByRole("button", { name: "OpenAI 兼容服务" })).toBeVisible();
  await expect(providers.getByRole("button", { name: "DeepSeek 在线服务" })).toHaveCount(0);
  await page.screenshot({ path: "test-results/model-picker-light.png" });
  for (const id of ["model-a", "model-b", "model-c", "model-d", "manual-model"]) {
    await expect(page.getByRole("button", { name: id, exact: true })).toBeVisible();
  }
  await page.getByRole("button", { name: "model-d", exact: true }).click();
  await expect(page.getByRole("button", { name: /选择问答模型：model-d/ })).toBeVisible();

  await page.addInitScript(() => localStorage.setItem("ff-theme-preference", "dark"));
  await page.route("**/api/v1/bootstrap", async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    await route.fulfill({ response, json: { ...body, appearance: { ...body.appearance, themePreference: "dark" } } });
  });
  await page.goto("/settings");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: /OpenAI 兼容服务/ }).click();
  await expect(page.getByRole("list", { name: "可用模型列表" }).getByRole("listitem")).toHaveCount(5);
  await page.screenshot({ path: "test-results/model-catalog-dark.png", fullPage: true });
  await page.goto("/");
  await page.getByRole("button", { name: /选择问答模型/ }).click();
  await expect(page.locator(".model-picker__providers").getByRole("button", { name: "DeepSeek 在线服务" })).toHaveCount(0);
  await page.screenshot({ path: "test-results/model-picker-dark.png" });
  expect(errors).toEqual([]);
});

test("both verified services remain selectable in the question composer", async ({ page }) => {
  await page.route("**/api/v1/settings/models", (route) => route.fulfill({
    json: {
      ...settings,
      profiles: [
        { ...settings.profiles[0], keyConfigured: true, status: "available" },
        settings.profiles[1],
      ],
    },
  }));
  await page.goto("/");
  await page.getByRole("button", { name: /选择问答模型/ }).click();
  const providers = page.locator(".model-picker__providers");
  await expect(providers.getByRole("button", { name: "DeepSeek 在线服务" })).toBeVisible();
  await expect(providers.getByRole("button", { name: "OpenAI 兼容服务" })).toBeVisible();
  await providers.getByRole("button", { name: "DeepSeek 在线服务" }).click();
  await expect(page.getByRole("button", { name: "deepseek-chat" })).toBeVisible();
});

test("the question composer offers settings when no service is verified", async ({ page }) => {
  await page.route("**/api/v1/settings/models", (route) => route.fulfill({
    json: { ...settings, profiles: [{ ...settings.profiles[0] }, { ...settings.profiles[1], status: "untested" }] },
  }));
  await page.goto("/");
  await page.getByRole("button", { name: /选择问答模型/ }).click();
  await expect(page.locator(".model-picker__providers")).toHaveCount(0);
  await expect(page.getByText("暂无通过连接测试的模型服务")).toBeVisible();
  await expect(page.getByRole("link", { name: "模型配置" })).toBeVisible();
});
