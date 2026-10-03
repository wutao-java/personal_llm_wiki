import { useEffect, useState, type RefObject } from "react";
import { Vector3 } from "three";
import type { GraphDomain, GraphNode } from "../../api/types";
import { layoutGraphLabels, selectGraphLabelNodes, type GraphLabel, type LabelCandidate } from "./graphLabelLayout";

interface LabelGraph {
  camera(): import("three").Camera;
  graph2ScreenCoords(x: number, y: number, z: number): { x: number; y: number };
}

export function GraphLabels({ graphRef, stageRef, nodes, domains, focusIds, focusId, query, onSelect }: {
  graphRef: RefObject<LabelGraph | null>;
  stageRef: RefObject<HTMLDivElement | null>;
  nodes: GraphNode[];
  domains: Map<string, GraphDomain>;
  focusIds: Set<string>;
  focusId: string | null;
  query: string;
  onSelect: (id: string) => void;
}) {
  const [labels, setLabels] = useState<GraphLabel[]>([]);

  useEffect(() => {
    const normalized = query.trim().toLocaleLowerCase();
    const candidates = selectGraphLabelNodes(nodes, focusIds, query);
    const context = document.createElement("canvas").getContext("2d");
    if (context && stageRef.current) context.font = `12px ${getComputedStyle(stageRef.current).fontFamily}`;
    const widths = new Map(candidates.map((node) => [node.id,
      Math.min(220, Math.max(54, Math.ceil(context?.measureText(node.name).width ?? node.name.length * 12) + 34)),
    ]));
    const projected = new Vector3();
    let frame = 0;
    let lastUpdate = 0;
    const update = (time: number) => {
      frame = requestAnimationFrame(update);
      const graph = graphRef.current;
      const stage = stageRef.current;
      if (!graph || !stage || time - lastUpdate < 100) return;
      lastUpdate = time;
      const stageRect = stage.getBoundingClientRect();
      const obstacles = Array.from(stage.parentElement!.querySelectorAll<HTMLElement>(
        ".graph-hud--top, .graph-legend, .graph-readout",
      )).map((element) => {
        const rect = element.getBoundingClientRect();
        return { x: rect.x - stageRect.x - 8, y: rect.y - stageRect.y - 8, width: rect.width + 16, height: rect.height + 16 };
      });
      const visible: LabelCandidate[] = [];
      for (const node of candidates) {
        if (node.x == null || node.y == null || node.z == null) continue;
        projected.set(node.x, node.y, node.z).project(graph.camera());
        if (projected.z < -1 || projected.z > 1) continue;
        const point = graph.graph2ScreenCoords(node.x, node.y, node.z);
        visible.push({
          id: node.id, name: node.name, color: domains.get(node.domainId)?.color ?? "#0891b2",
          x: point.x, y: point.y, width: widths.get(node.id)!,
          priority: node.id === focusId ? 4 : normalized && node.name.toLocaleLowerCase().includes(normalized) ? 3 : focusIds.has(node.id) ? 2 : 1,
        });
      }
      setLabels(layoutGraphLabels(visible, { x: 8, y: 8, width: stageRect.width - 16, height: stageRect.height - 16 }, obstacles));
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [domains, focusId, focusIds, graphRef, nodes, query, stageRef]);

  return <div className="graph-labels" aria-label="知识节点名称">
    {labels.map((label) => <button
      key={label.id}
      type="button"
      className={`graph-label${label.id === focusId ? " is-focused" : ""}`}
      style={{ left: label.x, top: label.y, width: label.width, "--domain-color": label.color } as React.CSSProperties}
      title={label.name}
      aria-label={`选择知识节点：${label.name}`}
      onClick={() => onSelect(label.id)}
    ><i /><span>{label.name}</span></button>)}
  </div>;
}
