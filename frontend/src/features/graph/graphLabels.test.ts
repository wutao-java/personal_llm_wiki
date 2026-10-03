import { describe, expect, it } from "vitest";
import type { GraphNode } from "../../api/types";
import { layoutGraphLabels, selectGraphLabelNodes, type LabelCandidate } from "./graphLabelLayout";

const bounds = { x: 0, y: 0, width: 600, height: 400 };
const candidate = (id: string, x: number, y: number, priority = 1): LabelCandidate => ({
  id, name: id, x, y, width: 100, priority, color: "#0891b2",
});

describe("graph label candidates", () => {
  const nodes: GraphNode[] = Array.from({ length: 20 }, (_, index) => ({
    id: `K-${index}`, knowledgeId: `K-${index}`, name: `知识 ${index}`, summary: "",
    type: "concept", domain: 0, domainId: "knowledge", hub: false,
    degree: index, sourceCount: 1, reviewStatus: "ready", index,
  }));

  it("labels the most connected real nodes when a sparse graph has no hubs", () => {
    expect(selectGraphLabelNodes(nodes, new Set(), "").map((node) => node.id))
      .toEqual(["K-19", "K-18", "K-17", "K-16", "K-15", "K-14", "K-13", "K-12"]);
    expect(nodes[0].id).toBe("K-0");
    expect(nodes.every((node) => !node.hub)).toBe(true);
  });

  it("keeps hub-led overviews and includes a searched isolated node", () => {
    const withHub = nodes.map((node) => ({ ...node, hub: node.id === "K-19" }));
    expect(selectGraphLabelNodes(withHub, new Set(), "").map((node) => node.id)).toEqual(["K-19"]);
    expect(selectGraphLabelNodes(withHub, new Set(), "知识 0").map((node) => node.id)).toEqual(["K-19", "K-0"]);
  });

  it("keeps a selected isolated node readable instead of unrelated overview names", () => {
    expect(selectGraphLabelNodes(nodes, new Set(["K-0"]), "").map((node) => node.id)).toEqual(["K-0"]);
  });
});

describe("graph label layout", () => {
  it("keeps selected labels ahead of colliding overview labels", () => {
    const labels = layoutGraphLabels([
      candidate("hub", 300, 200),
      candidate("selected", 300, 200, 4),
    ], bounds, [], 1);
    expect(labels.map((label) => label.id)).toEqual(["selected"]);
  });

  it("places labels without overlapping each other", () => {
    const labels = layoutGraphLabels([
      candidate("one", 300, 200),
      candidate("two", 300, 200),
    ], bounds);
    expect(labels).toHaveLength(2);
    const [one, two] = labels;
    expect(one.x + one.width <= two.x || two.x + two.width <= one.x ||
      one.y + one.height <= two.y || two.y + two.height <= one.y).toBe(true);
  });

  it("moves a label to the left when the node is near the right edge", () => {
    const [label] = layoutGraphLabels([candidate("edge", 590, 200)], bounds);
    expect(label.x + label.width).toBeLessThan(590);
    expect(label.x).toBeGreaterThanOrEqual(0);
  });

  it("avoids controls and drops labels that cannot fit", () => {
    const obstacles = [{ x: 0, y: 0, width: 600, height: 100 }];
    const labels = layoutGraphLabels([
      candidate("blocked", 300, 40),
      candidate("visible", 300, 200),
    ], bounds, obstacles);
    expect(labels.map((label) => label.id)).toEqual(["visible"]);
  });

  it("does not show offscreen or invalid node projections", () => {
    expect(layoutGraphLabels([
      candidate("outside", -10, 100),
      candidate("invalid", Number.NaN, 100),
    ], bounds)).toEqual([]);
  });
});
