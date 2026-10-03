import { act, cleanup, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { PerspectiveCamera } from "three";
import { afterEach, expect, it, vi } from "vitest";
import type { GraphNode } from "../../api/types";
import { GraphLabels } from "./GraphLabels";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it("passes the visible controls to label placement", () => {
  let update: FrameRequestCallback = () => {};
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => { update = callback; return 1; });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  const rect = (x: number, y: number, width: number, height: number) =>
    ({ x, y, width, height, top: y, left: x, right: x + width, bottom: y + height, toJSON: () => ({}) });
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    return this.classList.contains("graph-hud--top") ? rect(0, 0, 600, 100) : rect(0, 0, 600, 400);
  });
  const stageRef = createRef<HTMLDivElement>();
  const camera = new PerspectiveCamera(50, 1.5, 0.1, 1000);
  const graphRef = { current: { camera: () => camera, graph2ScreenCoords: () => ({ x: 300, y: 40 }) } };
  const node: GraphNode = {
    id: "K-1", knowledgeId: "K-1", name: "订单", summary: "", type: "concept",
    domain: 0, domainId: "order", reviewStatus: "ready", index: 0,
    degree: 1, sourceCount: 1, hub: true, x: 0, y: 0, z: -20,
  };
  render(<div>
    <div ref={stageRef} />
    <header className="graph-hud--top" />
    <GraphLabels graphRef={graphRef} stageRef={stageRef} nodes={[node]} domains={new Map()}
      focusIds={new Set()} focusId={null} query="" onSelect={() => {}} />
  </div>);
  act(() => update(100));
  expect(screen.queryByRole("button", { name: "选择知识节点：订单" })).not.toBeInTheDocument();
});
