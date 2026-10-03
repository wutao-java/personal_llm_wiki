import type { GraphNode } from "../../api/types";

export interface LabelRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LabelCandidate {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  width: number;
  priority: number;
}

export type GraphLabel = LabelCandidate & LabelRect;

export function selectGraphLabelNodes(nodes: GraphNode[], focusIds: Set<string>, query: string) {
  const normalized = query.trim().toLocaleLowerCase();
  const overview = new Set((nodes.some((node) => node.hub)
    ? nodes.filter((node) => node.hub)
    : [...nodes].sort((a, b) => b.degree - a.degree).slice(0, 8)).map((node) => node.id));
  return nodes.filter((node) => focusIds.size ? focusIds.has(node.id) :
    overview.has(node.id) || nodes.length <= 12 ||
    Boolean(normalized && `${node.name} ${node.summary} ${node.type}`.toLocaleLowerCase().includes(normalized)))
    .sort((a, b) => b.degree - a.degree);
}

export function layoutGraphLabels(
  candidates: LabelCandidate[],
  bounds: LabelRect,
  obstacles: LabelRect[] = [],
  limit = 16,
): GraphLabel[] {
  const placed: GraphLabel[] = [];
  for (const candidate of [...candidates].sort((a, b) => b.priority - a.priority)) {
    if (placed.length >= limit) break;
    const { x, y, width } = candidate;
    if (!Number.isFinite(x) || !Number.isFinite(y) ||
      x < bounds.x || y < bounds.y ||
      x > bounds.x + bounds.width || y > bounds.y + bounds.height) continue;
    const height = 28;
    const positions = [
      { x: x + 14, y: y - height / 2 },
      { x: x - width - 14, y: y - height / 2 },
      { x: x - width / 2, y: y + 16 },
      { x: x - width / 2, y: y - height - 16 },
    ];
    const position = positions.find((point) => {
      const rect = { ...point, width, height };
      return rect.x >= bounds.x && rect.y >= bounds.y &&
        rect.x + width <= bounds.x + bounds.width &&
        rect.y + height <= bounds.y + bounds.height &&
        ![...obstacles, ...placed].some((other) => overlaps(rect, other));
    });
    if (position) placed.push({ ...candidate, ...position, height });
  }
  return placed;
}

function overlaps(a: LabelRect, b: LabelRect) {
  const gap = 5;
  return a.x < b.x + b.width + gap && a.x + a.width + gap > b.x &&
    a.y < b.y + b.height + gap && a.y + a.height + gap > b.y;
}
