import { useQuery } from "@tanstack/react-query";
import ForceGraph3D, {
  type ForceGraph3DInstance,
  type LinkObject,
  type NodeObject,
} from "3d-force-graph";
import {
  ArrowRight,
  BookOpenText,
  FileText,
  Focus,
  Maximize2,
  MessageSquareText,
  Network,
  Pause,
  Play,
  RotateCcw,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box3, Color, PerspectiveCamera, Vector2, Vector3 } from "three";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { api } from "../../api/client";
import type { GraphDomain, GraphEdge, GraphNode } from "../../api/types";
import { ErrorState, LoadingState } from "../../components/AsyncState";
import { StatusBadge } from "../../components/StatusBadge";
import { useUIStore } from "../../state/ui";
import { GraphLabels } from "./GraphLabels";

type VisualNode = GraphNode & NodeObject;
type VisualLink = Omit<GraphEdge, "source" | "target"> &
  LinkObject<VisualNode> & {
    source: string | number | VisualNode;
    target: string | number | VisualNode;
  };
type GraphInstance = ForceGraph3DInstance<VisualNode, VisualLink>;

const GRAPH_BACKGROUND = { light: "#f7fafb", dark: "#04060d" } as const;
const ORBIT_RADIUS = 650;

export function GraphPage() {
  const navigate = useNavigate();
  const stageRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<GraphInstance | null>(null);
  const orbitingRef = useRef(false);
  const [query, setQuery] = useState("");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedRelationId, setSelectedRelationId] = useState<string | null>(null);
  const [orbiting, setOrbiting] = useState(false);
  const [particlesEnabled, setParticlesEnabled] = useState(true);
  const [renderError, setRenderError] = useState<string | null>(null);
  const selectedId = useUIStore((state) => state.graphSelectedId);
  const setSelectedId = useUIStore((state) => state.setGraphSelectedId);
  const selectedDomain = useUIStore((state) => state.graphDomain);
  const setSelectedDomain = useUIStore((state) => state.setGraphDomain);
  const resolvedTheme = useUIStore((state) => state.resolvedTheme);
  const reduceMotion = useUIStore((state) => state.reduceMotion);
  const setChatDraft = useUIStore((state) => state.setChatDraft);

  const graph = useQuery({ queryKey: ["graph"], queryFn: api.graph });
  const selectedKnowledge = useQuery({
    queryKey: ["knowledge-detail", selectedId],
    queryFn: () => api.knowledgeDetail(selectedId!),
    enabled: Boolean(selectedId),
  });
  const selectedRelation = useQuery({
    queryKey: ["relation", selectedRelationId],
    queryFn: () => api.relation(selectedRelationId!),
    enabled: Boolean(selectedRelationId),
  });

  const domainById = useMemo(
    () => new Map((graph.data?.domains ?? []).map((domain) => [domain.id, {
      ...domain,
      color: resolvedTheme === "light" && domain.color.toLowerCase() === "#65a30d"
        ? "#629f0d" : domain.color,
    }])),
    [graph.data?.domains, resolvedTheme],
  );
  const nodeById = useMemo(
    () => new Map((graph.data?.nodes ?? []).map((node) => [node.id, node])),
    [graph.data?.nodes],
  );
  const neighbors = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const edge of graph.data?.edges ?? []) {
      const source = endpointId(edge.source);
      const target = endpointId(edge.target);
      if (!map.has(source)) map.set(source, new Set());
      if (!map.has(target)) map.set(target, new Set());
      map.get(source)!.add(target);
      map.get(target)!.add(source);
    }
    return map;
  }, [graph.data?.edges]);

  const visualGraph = useMemo(() => {
    if (!graph.data) return { nodes: [] as VisualNode[], links: [] as VisualLink[] };
    return {
      nodes: graph.data.nodes.map((node) => ({ ...node } as VisualNode)),
      links: graph.data.edges.map((edge) => ({
        ...edge,
        source: endpointId(edge.source),
        target: endpointId(edge.target),
      } as VisualLink)),
    };
  }, [graph.data]);

  const filteredData = useMemo(() => {
    if (!graph.data) return { nodes: [] as VisualNode[], links: [] as VisualLink[] };
    const normalized = query.trim().toLocaleLowerCase();
    const directMatches = new Set(
      graph.data.nodes
        .filter((node) => !normalized || `${node.name} ${node.summary} ${node.type}`.toLocaleLowerCase().includes(normalized))
        .map((node) => node.id),
    );
    const visibleIds = new Set<string>();
    for (const node of graph.data.nodes) {
      if (selectedDomain && node.domainId !== selectedDomain) continue;
      if (
        !normalized ||
        directMatches.has(node.id) ||
        Array.from(neighbors.get(node.id) ?? []).some((id) => directMatches.has(id))
      ) {
        visibleIds.add(node.id);
      }
    }
    return {
      nodes: visualGraph.nodes.filter((node) => visibleIds.has(node.id)),
      links: visualGraph.links.filter(
        (edge) => visibleIds.has(endpointId(edge.source)) && visibleIds.has(endpointId(edge.target)),
      ),
    };
  }, [graph.data, neighbors, query, selectedDomain, visualGraph]);

  const focusId = selectedId ?? (selectedRelationId ? null : hoveredId);
  const focusIds = useMemo(() => {
    if (focusId) return new Set([focusId, ...(neighbors.get(focusId) ?? [])]);
    const relation = graph.data?.edges.find((edge) => edge.relationId === selectedRelationId);
    return new Set(relation ? [endpointId(relation.source), endpointId(relation.target)] : []);
  }, [focusId, graph.data?.edges, neighbors, selectedRelationId]);
  const graphStyle = useMemo(() => ({
    domainById, nodeById, focusIds, focusId, selectedRelationId,
    particlesEnabled: particlesEnabled && !reduceMotion, theme: resolvedTheme,
  }), [domainById, focusId, focusIds, nodeById, particlesEnabled, reduceMotion, resolvedTheme, selectedRelationId]);

  useEffect(() => {
    orbitingRef.current = orbiting;
  }, [orbiting]);

  useEffect(() => {
    const instance = graphRef.current;
    if (!instance) return;
    applyGraphStyling(instance, graphStyle);
    if (stageRef.current) {
      stageRef.current.dataset.focusedNodeCount = String(filteredData.nodes.filter((node) => focusIds.has(node.id)).length);
      stageRef.current.dataset.focusedLinkCount = String(filteredData.links.filter((link) => isFocusedLink(link, focusId, selectedRelationId)).length);
    }
    instance.refresh();
  }, [filteredData, focusId, focusIds, graphStyle, selectedRelationId]);

  useEffect(() => {
    if (!reduceMotion) return;
    setOrbiting(false);
    setParticlesEnabled(false);
  }, [reduceMotion]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !graph.data || graph.data.nodes.length === 0) return;

    setRenderError(null);
    stage.replaceChildren();
    let bloomPass: UnrealBloomPass | null = null;
    let outputPass: OutputPass | null = null;
    let destroyed = false;
    let orbitAngle = 0;
    const orbitRadius = stage.clientWidth < 600 ? 1800 : ORBIT_RADIUS;

    try {
      const createGraph = ForceGraph3D as unknown as () => (element: HTMLElement) => GraphInstance;
      const instance = createGraph()(stage);
      graphRef.current = instance;
      instance
        .width(Math.max(stage.clientWidth, 1))
        .height(Math.max(stage.clientHeight, 1))
        .backgroundColor(GRAPH_BACKGROUND[resolvedTheme])
        .showNavInfo(false)
        .nodeLabel((node) => nodeTooltip(node, domainById.get(node.domainId)))
        .nodeResolution(16)
        .nodeRelSize(4)
        .nodeOpacity(1)
        .linkLabel((link) => linkTooltip(link))
        .linkOpacity(1)
        .linkDirectionalParticleWidth(1.2)
        .linkDirectionalParticleSpeed(0.006)
        .linkDirectionalParticleOffset((link) => seededFraction(`${graph.data!.layoutSeed}:${link.relationId}`))
        .linkDirectionalParticleResolution(6)
        .d3AlphaDecay(0.025)
        .d3VelocityDecay(0.32)
        .warmupTicks(80)
        .cooldownTicks(reduceMotion ? 60 : 220)
        .enableNodeDrag(!reduceMotion)
        .onNodeHover((node) => setHoveredId(node?.id ?? null))
        .onNodeClick((node) => {
          orbitingRef.current = false;
          setOrbiting(false);
          setSelectedRelationId(null);
          setSelectedId(node.id);
          focusNode(node, instance, neighbors, reduceMotion);
        })
        .onLinkClick((link) => {
          orbitingRef.current = false;
          setOrbiting(false);
          setSelectedId(null);
          setSelectedRelationId(link.relationId);
          fitGraph(instance, reduceMotion, new Set([endpointId(link.source), endpointId(link.target)]));
        })
        .onBackgroundClick(() => {
          setSelectedId(null);
          setSelectedRelationId(null);
        });

      const charge = instance.d3Force("charge");
      if (charge?.strength) charge.strength(-42);
      if (charge?.distanceMax) charge.distanceMax(180);
      const link = instance.d3Force("link");
      if (link?.distance) link.distance(72);
      applyGraphStyling(instance, graphStyle);
      instance.graphData(filteredData);

      // Clear in scene color space before bloom; renderer-only clearing brightens the background.
      instance.scene().background = new Color(GRAPH_BACKGROUND[resolvedTheme]);
      const renderer = instance.renderer();
      renderer.info.autoReset = false;

      if (resolvedTheme === "dark") {
        bloomPass = new UnrealBloomPass(
          new Vector2(Math.max(stage.clientWidth, 1), Math.max(stage.clientHeight, 1)),
          0.65,
          0.35,
          0.4,
        );
        outputPass = new OutputPass();
        instance.postProcessingComposer().addPass(bloomPass);
        instance.postProcessingComposer().addPass(outputPass);
      }
      instance.resumeAnimation();
      stage.dataset.bloomEnabled = String(Boolean(bloomPass));
      stage.dataset.nodeCount = String(filteredData.nodes.length);
      stage.dataset.linkCount = String(filteredData.links.length);

      instance.cameraPosition({ x: 0, y: 36, z: orbitRadius });
      aimGraphCamera(instance, { x: 0, y: 0, z: 0 });

      const recordRenderState = () => {
        if (destroyed) return;
        let sceneObjects = 0;
        let meshObjects = 0;
        let visibleMeshObjects = 0;
        instance.scene().traverse((object) => {
          sceneObjects += 1;
          if ("isMesh" in object && object.isMesh) {
            meshObjects += 1;
            if (object.visible) visibleMeshObjects += 1;
          }
        });
        const liveNodes = instance.graphData().nodes;
        const positionedNodes = liveNodes.filter(
          (node) => Number.isFinite(node.x) && Number.isFinite(node.y) && Number.isFinite(node.z),
        );
        const maxNodeRadius = positionedNodes.reduce(
          (maximum, node) => Math.max(maximum, Math.hypot(node.x ?? 0, node.y ?? 0, node.z ?? 0)),
          0,
        );
        const camera = instance.cameraPosition();
        const cameraWithTarget = camera as typeof camera & { lookAt?: { x: number; y: number; z: number } };
        const projectedNodes = positionedNodes.map((node) => instance.graph2ScreenCoords(node.x!, node.y!, node.z!));
        const onScreenNodes = projectedNodes.filter(
          (point) => Number.isFinite(point.x) && Number.isFinite(point.y) && point.x >= 0 && point.x <= stage.clientWidth && point.y >= 0 && point.y <= stage.clientHeight,
        ).length;
        const nodesInFrustum = positionedNodes.filter((node) => {
          const projected = new Vector3(node.x!, node.y!, node.z!).project(instance.camera());
          return projected.x >= -1 && projected.x <= 1 && projected.y >= -1 && projected.y <= 1 && projected.z >= -1 && projected.z <= 1;
        }).length;
        const contextLost = renderer.getContext().isContextLost();
        stage.dataset.sceneObjects = String(sceneObjects);
        stage.dataset.sceneVisible = String(instance.scene().visible);
        stage.dataset.meshObjects = String(meshObjects);
        stage.dataset.visibleMeshObjects = String(visibleMeshObjects);
        stage.dataset.sceneChildren = instance.scene().children.map((child) => `${child.type}:${child.visible}`).join(",");
        stage.dataset.positionedNodes = String(positionedNodes.length);
        stage.dataset.onScreenNodes = String(onScreenNodes);
        stage.dataset.nodesInFrustum = String(nodesInFrustum);
        stage.dataset.maxNodeRadius = maxNodeRadius.toFixed(2);
        stage.dataset.cameraDistance = Math.hypot(camera.x, camera.y, camera.z).toFixed(2);
        stage.dataset.cameraTarget = cameraWithTarget.lookAt ? `${cameraWithTarget.lookAt.x.toFixed(2)},${cameraWithTarget.lookAt.y.toFixed(2)},${cameraWithTarget.lookAt.z.toFixed(2)}` : "unknown";
        stage.dataset.renderCalls = String(renderer.info.render.calls);
        stage.dataset.renderTriangles = String(renderer.info.render.triangles);
        stage.dataset.contextLost = String(contextLost);
        stage.dataset.ready = liveNodes.length > 0 && positionedNodes.length === liveNodes.length && onScreenNodes > 0 && visibleMeshObjects > 0 && renderer.info.render.calls > 0 && !contextLost ? "true" : "false";
      };
      const renderTimers = [
        window.setTimeout(recordRenderState, 1800),
        window.setTimeout(recordRenderState, 3600),
      ];

      const resizeObserver = new ResizeObserver(([entry]) => {
        const width = Math.max(1, entry.contentRect.width);
        const height = Math.max(1, entry.contentRect.height);
        instance.width(width).height(height);
      });
      resizeObserver.observe(stage);

      const stopOrbit = () => {
        if (!orbitingRef.current) return;
        orbitingRef.current = false;
        setOrbiting(false);
      };
      stage.addEventListener("pointerdown", stopOrbit);
      stage.addEventListener("wheel", stopOrbit, { passive: true });

      const orbitTimer = window.setInterval(() => {
        if (!orbitingRef.current || reduceMotion) return;
        instance.cameraPosition({
          x: orbitRadius * Math.sin(orbitAngle),
          y: 92 * Math.sin(orbitAngle * 0.35),
          z: orbitRadius * Math.cos(orbitAngle),
        });
        aimGraphCamera(instance, { x: 0, y: 0, z: 0 });
        orbitAngle += Math.PI / 700;
      }, 25);

      return () => {
        destroyed = true;
        renderTimers.forEach(window.clearTimeout);
        window.clearInterval(orbitTimer);
        resizeObserver.disconnect();
        stage.removeEventListener("pointerdown", stopOrbit);
        stage.removeEventListener("wheel", stopOrbit);
        if (bloomPass) {
          instance.postProcessingComposer().removePass(bloomPass);
          bloomPass.dispose();
        }
        if (outputPass) {
          instance.postProcessingComposer().removePass(outputPass);
          outputPass.dispose();
        }
        instance._destructor();
        graphRef.current = null;
        stage.replaceChildren();
      };
    } catch (error) {
      graphRef.current = null;
      setRenderError(error instanceof Error ? error.message : "图谱渲染器未能启动");
      return undefined;
    }
  }, [graph.data?.snapshotId, resolvedTheme]);

  useEffect(() => {
    const instance = graphRef.current;
    const stage = stageRef.current;
    if (!instance || !stage) return;
    instance.graphData(filteredData);
    applyGraphStyling(instance, graphStyle);
    stage.dataset.nodeCount = String(filteredData.nodes.length);
    stage.dataset.linkCount = String(filteredData.links.length);
    const reheatTimer = window.setTimeout(() => {
      if (graphRef.current === instance) instance.d3ReheatSimulation();
    }, 30);
    const fitTimer = window.setTimeout(() => {
      if (!orbitingRef.current && !selectedId && !selectedRelationId && filteredData.nodes.length) fitGraph(instance, reduceMotion);
    }, 550);
    return () => {
      window.clearTimeout(reheatTimer);
      window.clearTimeout(fitTimer);
    };
  }, [filteredData, resolvedTheme]);

  useEffect(() => {
    if (!selectedId || !graphRef.current) return;
    orbitingRef.current = false;
    setOrbiting(false);
    const timer = window.setTimeout(() => {
      const node = visualGraph.nodes.find((item) => item.id === selectedId);
      if (node?.x == null || node.y == null || node.z == null) return;
      focusNode(node, graphRef.current!, neighbors, reduceMotion);
    }, 220);
    return () => window.clearTimeout(timer);
  }, [neighbors, reduceMotion, resolvedTheme, selectedId, visualGraph.nodes]);

  const resetView = () => {
    setSelectedId(null);
    setSelectedRelationId(null);
    setSelectedDomain(null);
    setQuery("");
    orbitingRef.current = false;
    setOrbiting(false);
    if (graphRef.current) fitGraph(graphRef.current, reduceMotion);
  };

  const fitView = () => {
    orbitingRef.current = false;
    setOrbiting(false);
    if (graphRef.current) fitGraph(graphRef.current, reduceMotion);
  };

  const selectNode = (id: string) => {
    orbitingRef.current = false;
    setOrbiting(false);
    setHoveredId(null);
    setSelectedRelationId(null);
    setSelectedId(id);
  };

  const panelOpen = Boolean(selectedId || selectedRelationId);
  const emptyGraph = !graph.isLoading && !graph.isError && !renderError && graph.data?.nodes.length === 0;
  return (
    <div className={`graph-page graph-page--${resolvedTheme}${panelOpen ? " graph-page--panel" : ""}${emptyGraph ? " graph-page--empty" : ""}`}>
      <div className="graph-stage" ref={stageRef} aria-label="三维知识关系图谱" />
      <GraphLabels graphRef={graphRef} stageRef={stageRef} nodes={filteredData.nodes} domains={domainById}
        focusIds={focusIds} focusId={focusId} query={query} onSelect={selectNode} />

      {graph.isLoading ? <div className="graph-state"><LoadingState label="正在载入知识关系" /></div> : null}
      {graph.isError ? <div className="graph-state"><ErrorState message={graph.error.message} onRetry={() => graph.refetch()} /></div> : null}
      {renderError ? <div className="graph-state"><ErrorState message={renderError} /></div> : null}

      <header className="graph-hud graph-hud--top">
        <div className="graph-title">
          <span className="graph-kicker">当前知识版本 · 关系可视化</span>
          <h1>{emptyGraph ? "知识图谱" : <>知识关系<em>图谱</em></>}</h1>
          {emptyGraph ? <p>探索知识与来源之间的关系。</p> : null}
        </div>
        <div className="graph-hud__tools">
          <label className="graph-search">
            <Search size={15} />
            <input
              aria-label="搜索知识节点"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索节点或内容"
            />
            {query ? <button onClick={() => setQuery("")} type="button" aria-label="清除搜索"><X size={14} /></button> : null}
          </label>
          <div className="graph-toolbar">
            <button onClick={fitView} type="button" disabled={!filteredData.nodes.length} title="适应画布" aria-label="适应画布"><Maximize2 size={16} /></button>
            <button onClick={resetView} type="button" disabled={!graph.data?.nodes.length} title="重置视图" aria-label="重置视图"><RotateCcw size={16} /></button>
          </div>
        </div>
      </header>

      <div className="graph-legend" aria-label="知识领域筛选">
        <button className={!selectedDomain ? "is-active" : ""} type="button" onClick={() => setSelectedDomain(null)}>
          <i className="graph-legend__all" />全部 <small>{graph.data?.nodes.length ?? 0}</small>
        </button>
        {graph.data?.domains.map((domain) => (
          <button
            className={selectedDomain === domain.id ? "is-active" : ""}
            key={domain.id}
            type="button"
            onClick={() => setSelectedDomain(selectedDomain === domain.id ? null : domain.id)}
            style={{ "--domain-color": domainById.get(domain.id)?.color ?? domain.color } as React.CSSProperties}
          >
            <i />{domain.name}<small>{graph.data.nodes.filter((node) => node.domainId === domain.id).length}</small>
          </button>
        ))}
      </div>

      <div className="graph-readout">
        <div>
          <strong>{filteredData.nodes.length}</strong> 个节点
          <span>·</span>
          <strong>{filteredData.links.length}</strong> 条关系
        </div>
        <div className="graph-controls">
          <button
            className={orbiting ? "is-active" : ""}
            aria-pressed={orbiting}
            type="button"
            disabled={reduceMotion || !filteredData.nodes.length}
            onClick={() => setOrbiting((value) => !value)}
          >
            {orbiting ? <Pause size={13} /> : <Play size={13} />}{orbiting ? "停止旋转" : "自动旋转"}
          </button>
          <button
            className={particlesEnabled ? "is-active" : ""}
            aria-pressed={particlesEnabled}
            type="button"
            disabled={reduceMotion || !filteredData.nodes.length}
            onClick={() => setParticlesEnabled((value) => !value)}
          >
            <Sparkles size={13} />关系流动
          </button>
        </div>
      </div>

      {!graph.isLoading && !graph.isError && !renderError && filteredData.nodes.length === 0 ? (
        <div className="graph-empty">
          {graph.data?.nodes.length ? (
            <>
              <Search size={22} />
              <strong>没有匹配的知识节点</strong>
              <span>调整搜索内容或领域筛选。</span>
              <button onClick={resetView} type="button">清除筛选</button>
            </>
          ) : (
            <>
              <Network size={25} />
              <strong>尚无已发布的知识</strong>
              <span>导入资料并确认结果后，即可查看知识关系。</span>
              <button onClick={() => navigate("/sources")} type="button">导入资料 <ArrowRight size={15} /></button>
            </>
          )}
        </div>
      ) : null}

      {panelOpen ? (
        <aside className="graph-detail-panel">
          <button className="graph-detail-panel__close" type="button" onClick={() => { setSelectedId(null); setSelectedRelationId(null); }} aria-label="关闭详情"><X size={17} /></button>
          {selectedId ? (
            selectedKnowledge.isLoading ? <LoadingState label="正在读取节点信息" /> : selectedKnowledge.data ? <NodePanel
              node={nodeById.get(selectedId)}
              domain={domainById.get(nodeById.get(selectedId)?.domainId ?? "")}
              detail={selectedKnowledge.data}
              onFocus={() => { const node = visualGraph.nodes.find((item) => item.id === selectedId); if (node && graphRef.current) focusNode(node, graphRef.current, neighbors, reduceMotion); }}
              onRead={() => navigate(`/knowledge/${selectedId}`)}
              onAsk={() => { setChatDraft(`请结合来源说明“${selectedKnowledge.data.title}”的核心内容、适用范围和相关规则。`); navigate("/"); }}
              onRelated={(id) => { setSelectedDomain(null); setSelectedId(id); }}
            /> : <ErrorState message={selectedKnowledge.error?.message ?? "节点内容不可用"} />
          ) : null}
          {selectedRelationId ? (
            selectedRelation.isLoading ? <LoadingState label="正在读取关系依据" /> : selectedRelation.data ? <RelationPanel relation={selectedRelation.data} onSelect={(id) => { setSelectedRelationId(null); setSelectedDomain(null); setSelectedId(id); }} onSource={(sourceId, versionId) => navigate(`/sources?source=${encodeURIComponent(sourceId)}&version=${encodeURIComponent(versionId)}`)} /> : <ErrorState message={selectedRelation.error?.message ?? "关系内容不可用"} />
          ) : null}
        </aside>
      ) : null}
    </div>
  );
}

function applyGraphStyling(
  instance: GraphInstance,
  { domainById, nodeById, particlesEnabled, focusIds, focusId, selectedRelationId, theme }: {
    domainById: Map<string, GraphDomain>;
    nodeById: Map<string, GraphNode>;
    particlesEnabled: boolean;
    focusIds: Set<string>;
    focusId: string | null;
    selectedRelationId: string | null;
    theme: "light" | "dark";
  },
) {
  const nodeColor = (node: GraphNode) => domainById.get(node.domainId)?.color ?? "#0891b2";
  const linkColor = (link: VisualLink) => {
    const source = nodeById.get(endpointId(link.source));
    return domainById.get(source?.domainId ?? "")?.color ?? "#0891b2";
  };
  instance
    .nodeColor((node) => withOpacity(nodeColor(node), focusIds.size && !focusIds.has(node.id) ? 0.16 : 1))
    .nodeVal((node) => {
      const base = node.hub ? 14 : 1.5 + node.degree * 0.6;
      return node.id === focusId ? base * 1.35 : base;
    })
    .linkColor((link) => withOpacity(linkColor(link),
      isFocusedLink(link, focusId, selectedRelationId) ? 0.85 :
        focusIds.size ? 0.035 : theme === "light" ? 0.3 : 0.18))
    .linkWidth((link) => {
      return isFocusedLink(link, focusId, selectedRelationId) ? 1.5 : link.weight >= 2 ? 0.6 : 0.25;
    })
    .linkDirectionalArrowLength((link) => link.directed && isFocusedLink(link, focusId, selectedRelationId) ? 4 : 0)
    .linkDirectionalArrowColor((link) => linkColor(link))
    .linkDirectionalParticles((link) => {
      if (!particlesEnabled || !link.directed) return 0;
      if (focusIds.size && !isFocusedLink(link, focusId, selectedRelationId)) return 0;
      return isFocusedLink(link, focusId, selectedRelationId) ? 3 : link.weight >= 1.5 ? 2 : 1;
    })
    .linkDirectionalParticleColor((link) => {
      const sourceId = endpointId(link.source);
      const source = nodeById.get(sourceId);
      return domainById.get(source?.domainId ?? "")?.color ?? "#0891b2";
    });
}

function isFocusedLink(link: VisualLink, focusId: string | null, relationId: string | null) {
  return relationId === link.relationId || Boolean(focusId &&
    (endpointId(link.source) === focusId || endpointId(link.target) === focusId));
}

function withOpacity(color: string, opacity: number) {
  return `#${new Color(color).getHexString()}${Math.round(opacity * 255).toString(16).padStart(2, "0")}`;
}

function NodePanel({ node, domain, detail, onFocus, onRead, onAsk, onRelated }: { node?: GraphNode; domain?: GraphDomain; detail: Awaited<ReturnType<typeof api.knowledgeDetail>>; onFocus: () => void; onRead: () => void; onAsk: () => void; onRelated: (id: string) => void }) {
  return <div className="node-panel"><div className="node-panel__symbol" style={{ color: domain?.color, boxShadow: `0 0 40px ${domain?.color ?? "transparent"}` }}><Network size={24} /></div><span className="eyebrow">{domain?.name ?? detail.domain} · {detail.type}</span><h2>{detail.title}</h2><p>{detail.summary}</p><div className="node-panel__meta"><StatusBadge status={detail.reviewStatus} /><span>{node?.degree ?? detail.relations.length} 条关系</span><span>{detail.sourceCount} 个来源</span></div><div className="node-panel__actions"><button className="button button--primary" onClick={onRead} type="button"><BookOpenText size={15} />阅读知识页面</button><button className="button button--secondary" onClick={onAsk} type="button"><MessageSquareText size={15} />围绕它提问</button><button className="button button--ghost" onClick={onFocus} type="button"><Focus size={15} />聚焦节点</button></div><section><header><strong>来源依据</strong><span>{detail.evidence.length}</span></header>{detail.evidence.slice(0, 3).map((evidence) => <div className="node-evidence" key={evidence.evidenceId}><FileText size={14} /><div><strong>{evidence.sourceTitle}</strong><p>{evidence.quote}</p></div></div>)}</section><section><header><strong>直接关联</strong><span>{detail.relations.length}</span></header><div className="node-relations">{detail.relations.slice(0, 10).map((relation) => relation.relatedKnowledge ? <button key={relation.relationId} onClick={() => onRelated(relation.relatedKnowledge!.knowledgeId)} type="button"><i style={{ backgroundColor: domain?.color ?? "#0891b2" }} /><div><strong>{relation.relatedKnowledge.title}</strong><small>{relation.type}</small></div><ArrowRight size={13} /></button> : null)}</div></section></div>;
}

function RelationPanel({ relation, onSelect, onSource }: { relation: Awaited<ReturnType<typeof api.relation>>; onSelect: (id: string) => void; onSource: (sourceId: string, versionId: string) => void }) {
  return <div className="relation-panel"><div className="relation-panel__icon"><Network size={23} /></div><span className="eyebrow">知识关系</span><h2>{relation.type}</h2><div className="relation-endpoints"><button onClick={() => onSelect(relation.source.knowledgeId)} type="button"><span>起点</span><strong>{relation.source.title}</strong></button><div><i />{relation.directed ? <ArrowRight size={17} /> : <Network size={17} />}<small>{relation.directed ? "有向关系" : "双向关系"}</small></div><button onClick={() => onSelect(relation.target.knowledgeId)} type="button"><span>终点</span><strong>{relation.target.title}</strong></button></div><div className="node-panel__meta"><StatusBadge status={relation.reviewStatus} /><span>权重 {relation.weight.toFixed(1)}</span><span>{relation.evidence.length} 个依据</span></div><section><header><strong>关系依据</strong><span>{relation.evidence.length}</span></header>{relation.evidence.map((evidence) => <button className="relation-evidence" key={evidence.evidenceId} type="button" onClick={() => onSource(evidence.sourceId, evidence.sourceVersionId)}><FileText size={15} /><div><strong>{evidence.sourceTitle}</strong><p>{evidence.quote}</p></div><ArrowRight size={13} /></button>)}</section></div>;
}

function focusNode(node: VisualNode, graph: GraphInstance, neighbors: Map<string, Set<string>>, reduceMotion: boolean) {
  fitGraph(graph, reduceMotion, new Set([node.id, ...(neighbors.get(node.id) ?? [])]));
}

function fitGraph(graph: GraphInstance, reduceMotion: boolean, ids?: Set<string>) {
  const camera = graph.camera();
  if (!(camera instanceof PerspectiveCamera)) return;
  const points = graph.graphData().nodes
    .filter((node) => (!ids || ids.has(node.id)) && Number.isFinite(node.x) && Number.isFinite(node.y) && Number.isFinite(node.z))
    .map((node) => new Vector3(node.x!, node.y!, node.z!));
  if (!points.length) return;
  const center = new Box3().setFromPoints(points).getCenter(new Vector3());
  const inverseRotation = camera.quaternion.clone().invert();
  const padding = graph.width() < 600 ? 48 : 100;
  const verticalTangent = Math.tan(camera.fov * Math.PI / 360) * Math.max(0.3, 1 - padding * 2 / graph.height());
  const horizontalTangent = Math.tan(camera.fov * Math.PI / 360) * Math.max(0.3, (graph.width() - padding * 2) / graph.height());
  // Fit the real node bounds in camera space; the library fit always aims at the origin.
  const distance = points.reduce((maximum, point) => {
    const local = point.clone().sub(center).applyQuaternion(inverseRotation);
    return Math.max(maximum, (Math.abs(local.x) + 16) / horizontalTangent + local.z,
      (Math.abs(local.y) + 16) / verticalTangent + local.z);
  }, 240);
  const position = new Vector3(0, 0, distance).applyQuaternion(camera.quaternion).add(center);
  aimGraphCamera(graph, center);
  graph.cameraPosition(position, center, reduceMotion ? 0 : 700);
}

function aimGraphCamera(graph: GraphInstance, target: { x: number; y: number; z: number }) {
  const controls = graph.controls() as { target?: Vector3; update?: () => void };
  if (controls.target) controls.target.set(target.x, target.y, target.z);
  graph.camera().lookAt(target.x, target.y, target.z);
  graph.camera().updateMatrixWorld();
  controls.update?.();
}

function nodeTooltip(node: VisualNode, domain?: GraphDomain) {
  return `<div class="graph-node-tip" style="--tip-color:${domain?.color ?? "#0891b2"}"><b>${escapeHtml(node.name)}</b><small>${escapeHtml(domain?.name ?? node.domainId)} · ${node.degree} 条关系 · ${node.sourceCount} 个来源</small><p>${escapeHtml(node.summary)}</p></div>`;
}

function linkTooltip(link: VisualLink) {
  return `<div class="graph-node-tip graph-link-tip"><b>${escapeHtml(link.type)}</b><small>${link.evidenceCount} 个来源依据 · 权重 ${link.weight.toFixed(1)}</small></div>`;
}

function seededFraction(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967296;
}

function endpointId(value: string | number | GraphNode | VisualNode | undefined) {
  return typeof value === "object" && value ? value.id : String(value ?? "");
}

function escapeHtml(value: string) {
  return value.replace(/[&<>\"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '\"': "&quot;" })[character]!);
}
