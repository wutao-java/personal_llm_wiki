import { expect, test, type Page } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 900 } });

async function inspectGraphPixels(page: Page) {
  const image = await page.locator(".graph-stage canvas").screenshot({
    style: ".graph-labels, .graph-hud, .graph-legend, .graph-readout { visibility: hidden !important; }",
  });
  return page.evaluate(async (base64) => {
    const image = new Image();
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext("2d")!;
    context.drawImage(image, 0, 0);
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    let colored = 0;
    for (let index = 0; index < data.length; index += 4) {
      const colors = [data[index], data[index + 1], data[index + 2]];
      if (Math.max(...colors) - Math.min(...colors) > 40 && Math.max(...colors) > 60) colored += 1;
    }
    return { colored, background: Array.from(data.slice(0, 3)) };
  }, image.toString("base64"));
}

test("knowledge graph renders visible WebGL content without runtime errors", async ({ page }) => {
  test.setTimeout(60_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  for (const themePreference of ["light", "dark"] as const) {
    await page.request.put("/api/v1/settings/appearance", {
      data: { themePreference, reduceMotion: false },
    });
    await page.goto("/graph");
    await expect(page.getByRole("heading", { name: "知识关系图谱" })).toBeVisible();
    await expect(page.locator("canvas")).toBeVisible();
    await page.waitForTimeout(4000);
    await expect(page.getByRole("button", { name: /履约与售后.*19/ }))
      .toHaveCSS("--domain-color", themePreference === "light" ? "#629f0d" : "#65a30d");

    const renderState = await page.locator(".graph-stage").evaluate((element) => ({
      ready: element.getAttribute("data-ready"),
      nodeCount: Number(element.getAttribute("data-node-count")),
      linkCount: Number(element.getAttribute("data-link-count")),
      sceneObjects: Number(element.getAttribute("data-scene-objects")),
      sceneVisible: element.getAttribute("data-scene-visible"),
      meshObjects: Number(element.getAttribute("data-mesh-objects")),
      visibleMeshObjects: Number(element.getAttribute("data-visible-mesh-objects")),
      sceneChildren: element.getAttribute("data-scene-children"),
      positionedNodes: Number(element.getAttribute("data-positioned-nodes")),
      onScreenNodes: Number(element.getAttribute("data-on-screen-nodes")),
      nodesInFrustum: Number(element.getAttribute("data-nodes-in-frustum")),
      maxNodeRadius: Number(element.getAttribute("data-max-node-radius")),
      cameraDistance: Number(element.getAttribute("data-camera-distance")),
      cameraTarget: element.getAttribute("data-camera-target"),
      renderCalls: Number(element.getAttribute("data-render-calls")),
      renderTriangles: Number(element.getAttribute("data-render-triangles")),
      contextLost: element.getAttribute("data-context-lost"),
    }));
    expect(renderState.ready, `${themePreference}: ${JSON.stringify(renderState)}`).toBe("true");
    expect(renderState.nodeCount, `${themePreference}: ${JSON.stringify(renderState)}`).toBe(150);
    expect(renderState.linkCount, `${themePreference}: ${JSON.stringify(renderState)}`).toBe(450);
    expect(renderState.sceneObjects, `${themePreference}: ${JSON.stringify(renderState)}`).toBeGreaterThan(150);
    expect(renderState.positionedNodes, `${themePreference}: ${JSON.stringify(renderState)}`).toBe(150);
    expect(renderState.renderCalls, `${themePreference}: ${JSON.stringify(renderState)}`).toBeGreaterThan(0);
    expect(renderState.renderTriangles, `${themePreference}: ${JSON.stringify(renderState)}`).toBeGreaterThan(10_000);
    expect(renderState.contextLost, `${themePreference}: ${JSON.stringify(renderState)}`).toBe("false");
    const pixels = await inspectGraphPixels(page);
    expect(pixels.colored, `${themePreference}: visible colored graph pixels`).toBeGreaterThan(1000);
    const background = themePreference === "dark" ? [4, 6, 13] : [247, 250, 251];
    for (let channel = 0; channel < 3; channel += 1) {
      expect(Math.abs(pixels.background[channel] - background[channel]),
        `${themePreference}: canvas background ${pixels.background}`).toBeLessThanOrEqual(3);
    }
    await page.screenshot({ path: `${test.info().outputDir}/graph-${themePreference}.png`, fullPage: true });

    const orbitButton = page.getByRole("button", { name: "自动旋转" });
    await expect(orbitButton).toHaveAttribute("aria-pressed", "false");
    await orbitButton.click();
    await expect(page.getByRole("button", { name: "停止旋转" })).toHaveAttribute("aria-pressed", "true");
    await page.waitForTimeout(500);
    const rotatingPositions = await page.locator(".graph-label").evaluateAll((elements) =>
      elements.map((element) => `${element.getAttribute("title")}:${element.getAttribute("style")}`));
    await page.waitForTimeout(700);
    const movedPositions = await page.locator(".graph-label").evaluateAll((elements) =>
      elements.map((element) => `${element.getAttribute("title")}:${element.getAttribute("style")}`));
    expect(movedPositions).not.toEqual(rotatingPositions);
    await page.getByRole("button", { name: "停止旋转" }).click();
    await expect(page.getByRole("button", { name: "自动旋转" })).toBeVisible();
    const particlesButton = page.getByRole("button", { name: "关系流动" });
    await particlesButton.click();
    await expect(particlesButton).not.toHaveClass(/is-active/);
    await particlesButton.click();
    await expect(particlesButton).toHaveClass(/is-active/);

    await page.getByRole("button", { name: /商品与库存 19/ }).click();
    await expect.poll(async () => Number(await page.locator(".graph-stage").getAttribute("data-node-count"))).toBe(19);
    await page.getByRole("button", { name: /全部 150/ }).click();
    await expect.poll(async () => Number(await page.locator(".graph-stage").getAttribute("data-node-count"))).toBe(150);
    await page.getByRole("button", { name: "适应画布" }).click();
  }

  expect(errors, errors.join("\n")).toEqual([]);
  await page.request.put("/api/v1/settings/appearance", {
    data: { themePreference: "light", reduceMotion: false },
  });
});

test("graph labels remain readable and selection preserves the real neighborhood", async ({ page }) => {
  test.setTimeout(60_000);
  const projection = await (await page.request.get("/api/v1/graph")).json();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });

  for (const themePreference of ["light", "dark"] as const) {
    await page.request.put("/api/v1/settings/appearance", { data: { themePreference, reduceMotion: false } });
    await page.goto("/graph");
    await expect.poll(() => page.locator(".graph-label").count()).toBeGreaterThan(3);
    await page.waitForTimeout(1800);
    const label = page.locator(".graph-label").first();
    const title = await label.getAttribute("title");
    const node = projection.nodes.find((item: { name: string }) => item.name === title);
    const edges = projection.edges.filter((edge: { source: string; target: string }) =>
      edge.source === node.id || edge.target === node.id);
    const neighborhood = new Set([node.id, ...edges.flatMap((edge: { source: string; target: string }) => [edge.source, edge.target])]);
    await label.click();
    await expect(page.locator(".graph-detail-panel h2")).toHaveText(title!);
    await expect(page.locator(".graph-stage")).toHaveAttribute("data-focused-node-count", String(neighborhood.size));
    await expect(page.locator(".graph-stage")).toHaveAttribute("data-focused-link-count", String(edges.length));
    await expect(page.locator(".graph-stage")).toHaveAttribute("data-node-count", String(projection.nodes.length));
    await expect(page.locator(".graph-label.is-focused")).toHaveAttribute("title", title!);
    await page.waitForTimeout(1000);
    await expect(page.locator(".graph-label.is-focused")).toHaveAttribute("title", title!);
    const legend = await page.locator(".graph-legend").boundingBox();
    const readout = await page.locator(".graph-readout").boundingBox();
    expect(legend!.x + legend!.width).toBeLessThanOrEqual(readout!.x);
    const rects = await page.locator(".graph-label, .graph-detail-panel, .graph-hud--top, .graph-legend, .graph-readout").evaluateAll((elements) =>
      elements.map((element) => ({ label: element.classList.contains("graph-label"), ...element.getBoundingClientRect().toJSON() })));
    for (const a of rects.filter((rect) => rect.label)) {
      for (const b of rects.filter((rect) => rect !== a)) {
        expect(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top).toBe(true);
      }
    }
    await page.screenshot({ path: `${test.info().outputDir}/focused-${themePreference}.png` });
    await page.getByRole("button", { name: "阅读知识页面" }).click();
    await expect(page).toHaveURL(new RegExp(`/knowledge/${node.id}$`));
    await expect(page.locator(".knowledge-article")).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test("small-screen selection keeps labels clear of the search and details", async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  for (const themePreference of ["light", "dark"] as const) {
    await page.request.put("/api/v1/settings/appearance", { data: { themePreference, reduceMotion: false } });
    await page.goto("/graph");
    await expect.poll(() => page.locator(".graph-label").count()).toBeGreaterThan(0);
    await page.waitForTimeout(1800);
    await page.screenshot({ path: `${test.info().outputDir}/overview-mobile-${themePreference}.png` });
    const title = await page.locator(".graph-label").first().getAttribute("title");
    await page.locator(".graph-label").first().click();
    await expect(page.locator(".graph-detail-panel h2")).toHaveText(title!);
    await expect(page.locator(".graph-label.is-focused")).toBeVisible();
    await page.waitForTimeout(1000);
    await expect(page.locator(".graph-label.is-focused")).toHaveAttribute("title", title!);
    const rects = await page.locator(".graph-label, .graph-hud--top, .graph-detail-panel").evaluateAll((elements) =>
      elements.map((element) => ({ label: element.classList.contains("graph-label"), ...element.getBoundingClientRect().toJSON() })));
    for (const label of rects.filter((rect) => rect.label)) {
      for (const other of rects.filter((rect) => rect !== label)) {
        expect(label.right <= other.left || other.right <= label.left ||
          label.bottom <= other.top || other.bottom <= label.top).toBe(true);
      }
    }
    expect((await inspectGraphPixels(page)).colored).toBeGreaterThan(300);
    await page.screenshot({ path: `${test.info().outputDir}/focused-mobile-${themePreference}.png` });
  }
  expect(errors).toEqual([]);
});

test("graph search and reduced motion preserve readable real nodes", async ({ page }) => {
  const projection = await (await page.request.get("/api/v1/graph")).json();
  const target = projection.nodes.find((node: { hub: boolean }) => !node.hub);
  await page.request.put("/api/v1/settings/appearance", { data: { themePreference: "light", reduceMotion: true } });
  try {
    await page.goto("/graph");
    await expect(page.getByRole("button", { name: "自动旋转" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "关系流动" })).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByRole("button", { name: "关系流动" })).toBeDisabled();
    const search = page.getByRole("textbox", { name: "搜索知识节点" });
    await search.fill(target.name);
    await expect(page.getByRole("button", { name: `选择知识节点：${target.name}`, exact: true })).toBeVisible();
    await page.getByRole("button", { name: `选择知识节点：${target.name}`, exact: true }).click();
    await expect(page.locator(".graph-detail-panel h2")).toHaveText(target.name);
    await page.getByRole("button", { name: "关闭详情" }).click();
    await search.fill("__no_graph_readability_match__");
    await expect(page.getByText("没有匹配的知识节点")).toBeVisible();
    await expect(page.locator(".graph-stage")).toHaveAttribute("data-node-count", "0");
    await expect(page.locator(".graph-label")).toHaveCount(0);
    await page.getByRole("button", { name: "清除筛选" }).click();
    await expect(page.locator(".graph-stage")).toHaveAttribute("data-node-count", String(projection.nodes.length));
  } finally {
    await page.request.put("/api/v1/settings/appearance", { data: { themePreference: "light", reduceMotion: false } });
  }
});

test("sparse graphs without hubs retain names and a real readable selection", async ({ page }) => {
  test.setTimeout(60_000);
  const projection = await (await page.request.get("/api/v1/graph")).json();
  test.skip(projection.nodes.length <= 12 || projection.nodes.some((node: { hub: boolean }) => node.hub),
    "Requires a published graph without hub nodes.");
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/graph");
    await page.waitForTimeout(4000);
    await expect.poll(() => page.locator(".graph-label").count())
      .toBeGreaterThanOrEqual(viewport.width < 600 ? 2 : 3);
    await expect(page.locator(".graph-stage")).toHaveAttribute("data-node-count", String(projection.nodes.length));
    await expect(page.locator(".graph-stage")).toHaveAttribute("data-link-count", String(projection.edges.length));
    expect((await inspectGraphPixels(page)).colored).toBeGreaterThan(viewport.width < 600 ? 300 : 1000);
    await page.screenshot({ path: `${test.info().outputDir}/sparse-overview-${viewport.width}.png` });
    const title = await page.locator(".graph-label").first().getAttribute("title");
    const node = projection.nodes.find((item: { name: string }) => item.name === title);
    const edges = projection.edges.filter((edge: { source: string; target: string }) =>
      edge.source === node.id || edge.target === node.id);
    await page.locator(".graph-label").first().click();
    await expect(page.locator(".graph-detail-panel h2")).toHaveText(title!);
    await page.waitForTimeout(1200);
    await expect(page.locator(".graph-label.is-focused")).toHaveAttribute("title", title!);
    await expect(page.locator(".graph-stage")).toHaveAttribute("data-focused-link-count", String(edges.length));
    const rects = await page.locator(".graph-label, .graph-detail-panel, .graph-hud--top, .graph-legend, .graph-readout").evaluateAll((elements) =>
      elements.map((element) => ({ label: element.classList.contains("graph-label"), ...element.getBoundingClientRect().toJSON() })));
    for (const a of rects.filter((rect) => rect.label)) {
      for (const b of rects.filter((rect) => rect !== a)) {
        expect(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top).toBe(true);
      }
    }
    await page.screenshot({ path: `${test.info().outputDir}/sparse-focused-${viewport.width}.png` });
  }
  await page.getByRole("button", { name: "阅读知识页面" }).click();
  await expect(page.locator(".knowledge-article")).toBeVisible();
  expect(errors).toEqual([]);
});
