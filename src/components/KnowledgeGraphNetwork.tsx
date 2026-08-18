"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type Simulation,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from "d3-force";
import kgData from "@/data/kg_instances.json";

// =============================================================================
// Knowledge Graph — Network view (neo4j 스타일 force-directed)
// - d3-force로 좌표 계산, SVG로 직접 렌더링 (xyflow와 별도 트리)
// - 운영 BI 톤: glow·gradient 금지, 단색 + 미세 그림자만
// - 결손 노드는 dashed border + stone fill로 일관성 유지
// =============================================================================

// 3사 색상 토큰 — kg_instances.json·KnowledgeGraph.tsx와 동기화
const ENTITY_COLOR: Record<string, string> = {
  라이프: "#0095A9",
  용인공원: "#78716c",
  YPL: "#b45309",
  공통: "#a8a29e",
};

// 클래스별 카테고리 정의 (kg_instances.json instance 그룹)
type ClassKey =
  | "Member"
  | "SalesAgent"
  | "Contract"
  | "Zone"
  | "Channel"
  | "Department"
  | "Activity"
  | "Cost";

// SVG 사이즈 상수 — useEffect 안에서 측정해 동적 갱신
const NODE_RADIUS = 26;
const NODE_RADIUS_COUNTER = 20;

// =============================================================================
// 데이터 모델
// =============================================================================
interface NetworkNode extends SimulationNodeDatum {
  id: string;
  label: string;
  entity: string;
  kpi?: string;
  isCounter?: boolean;
  missing?: boolean;
  parentClass: ClassKey;
  radius: number;
  // d3-force가 채워주는 좌표 (x, y, vx, vy)는 SimulationNodeDatum에 포함
}

interface NetworkLink extends SimulationLinkDatum<NetworkNode> {
  id: string;
  label: string;
  // source/target은 d3가 시뮬레이션 시작 시 string → object 로 변환
}

interface RawInstance {
  id: string;
  label: string;
  entity: string;
  kpi?: string;
  isCounter?: boolean;
  missing?: boolean;
}

interface RawRelation {
  id: string;
  source: string;
  target: string;
  label: string;
}

// =============================================================================
// 메인 컴포넌트
// =============================================================================
export interface KnowledgeGraphNetworkProps {
  onSelect: (sel: { kind: "instance"; id: string } | null) => void;
  selectedId?: string | null;
}

export function KnowledgeGraphNetwork({
  onSelect,
  selectedId,
}: KnowledgeGraphNetworkProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<Simulation<NetworkNode, NetworkLink> | null>(null);

  // 화면 크기 (반응형)
  const [dim, setDim] = useState<{ w: number; h: number }>({ w: 800, h: 600 });

  // 뷰포트 (zoom·pan)
  const [view, setView] = useState<{ x: number; y: number; k: number }>({
    x: 0,
    y: 0,
    k: 1,
  });

  // 호버 노드 (highlight 용)
  const [hoverId, setHoverId] = useState<string | null>(null);

  // 드래그 중인 노드
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // d3-force가 매 tick마다 갱신하는 좌표를 React state에 반영
  const [tick, setTick] = useState(0);

  // -----------------------------------------------------------------------------
  // 초기 노드·링크 데이터 빌드 (단 1회)
  // -----------------------------------------------------------------------------
  const { nodes, links } = useMemo(() => {
    const nodesList: NetworkNode[] = [];
    const instances = kgData.instances as Record<string, RawInstance[]>;

    Object.entries(instances).forEach(([cls, list]) => {
      list.forEach((inst) => {
        nodesList.push({
          id: inst.id,
          label: inst.label,
          entity: inst.entity,
          kpi: inst.kpi,
          isCounter: inst.isCounter,
          missing: inst.missing,
          parentClass: cls as ClassKey,
          radius: inst.isCounter ? NODE_RADIUS_COUNTER : NODE_RADIUS,
        });
      });
    });

    // class 그룹 간 relation을 인스턴스 간 엣지로 펼침
    // — 각 source 클래스의 인스턴스를 target 클래스의 대표 인스턴스에 연결
    const rels = kgData.relations as RawRelation[];
    const linksList: NetworkLink[] = [];

    rels.forEach((rel) => {
      const srcNodes = nodesList.filter((n) => n.parentClass === rel.source);
      const tgtNodes = nodesList.filter((n) => n.parentClass === rel.target);

      // 대표 연결: counter·missing이 아닌 노드 우선, 없으면 첫 노드
      const tgtPrimary =
        tgtNodes.find((n) => !n.isCounter && !n.missing) ?? tgtNodes[0];
      if (!tgtPrimary) return;

      // source의 정상 노드만 (counter는 시각적 과부하 방지 위해 제외)
      const srcSample = srcNodes.filter((n) => !n.isCounter);

      srcSample.forEach((s, idx) => {
        // missing source는 missing target과, normal source는 normal target과 연결
        let tgt: NetworkNode | undefined = tgtPrimary;
        if (s.missing) {
          const tgtMissing = tgtNodes.find((n) => n.missing);
          if (tgtMissing) tgt = tgtMissing;
        } else {
          // 다양성 위해 target을 약간 순환
          const tgtNormal = tgtNodes.filter((n) => !n.isCounter && !n.missing);
          if (tgtNormal.length > 0) {
            tgt = tgtNormal[idx % tgtNormal.length];
          }
        }
        if (!tgt || tgt.id === s.id) return;
        linksList.push({
          id: `${rel.id}-${s.id}-${tgt.id}`,
          source: s.id,
          target: tgt.id,
          label: rel.label,
        });
      });
    });

    return { nodes: nodesList, links: linksList };
  }, []);

  // -----------------------------------------------------------------------------
  // 컨테이너 사이즈 측정 (ResizeObserver)
  // -----------------------------------------------------------------------------
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setDim({ w: rect.width, h: rect.height });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // -----------------------------------------------------------------------------
  // d3-force 시뮬레이션 — 마운트 시 1회 설정, dim 변경 시 center force 갱신
  // -----------------------------------------------------------------------------
  useEffect(() => {
    if (dim.w === 0 || dim.h === 0) return;

    // 시뮬레이션 신규 생성
    const sim = forceSimulation<NetworkNode>(nodes)
      .force(
        "link",
        forceLink<NetworkNode, NetworkLink>(links)
          .id((d) => d.id)
          .distance(110)
          .strength(0.4)
      )
      .force("charge", forceManyBody<NetworkNode>().strength(-360))
      .force("center", forceCenter<NetworkNode>(dim.w / 2, dim.h / 2))
      .force(
        "collision",
        forceCollide<NetworkNode>().radius((d) => d.radius + 6).strength(0.9)
      )
      .alpha(0.9)
      .alphaDecay(0.035)
      .on("tick", () => {
        // React 리렌더 트리거 — tick counter 증가
        setTick((t) => (t + 1) % 1_000_000);
      });

    simulationRef.current = sim;

    return () => {
      sim.stop();
      simulationRef.current = null;
    };
    // 노드·링크는 mount 시 fix. dim 변경 시 center force만 별도 effect로 갱신.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, links]);

  // dim 변경 시 center force 갱신·reheat
  useEffect(() => {
    const sim = simulationRef.current;
    if (!sim || dim.w === 0 || dim.h === 0) return;
    sim.force("center", forceCenter<NetworkNode>(dim.w / 2, dim.h / 2));
    sim.alpha(0.3).restart();
  }, [dim]);

  // -----------------------------------------------------------------------------
  // 줌·팬 — wheel zoom, drag pan
  // React onWheel은 passive 등록이라 preventDefault가 무시됨 →
  // 네이티브 wheel 리스너를 { passive: false }로 직접 등록해 그래프 위에서
  // 페이지 스크롤을 막고 줌만 동작시킴.
  // -----------------------------------------------------------------------------
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const scaleFactor = e.deltaY < 0 ? 1.1 : 0.9;
      setView((v) => {
        const nextK = Math.max(0.3, Math.min(2.5, v.k * scaleFactor));
        // 마우스 위치 기준 줌
        const svg = svgRef.current;
        if (!svg) return { ...v, k: nextK };
        const rect = svg.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        // 줌 후에도 마우스 아래 지점이 그대로 있도록 x,y 보정
        const nx = mx - ((mx - v.x) / v.k) * nextK;
        const ny = my - ((my - v.y) / v.k) * nextK;
        return { x: nx, y: ny, k: nextK };
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // 팬 처리 — 빈 영역 mousedown 후 드래그
  const panStateRef = useRef<{
    panning: boolean;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  }>({ panning: false, startX: 0, startY: 0, origX: 0, origY: 0 });

  const onSvgMouseDown = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      // 노드를 클릭한 경우는 노드 핸들러가 처리
      const target = e.target as SVGElement;
      if (target.dataset.nodeId) return;
      panStateRef.current = {
        panning: true,
        startX: e.clientX,
        startY: e.clientY,
        origX: view.x,
        origY: view.y,
      };
    },
    [view.x, view.y]
  );

  // -----------------------------------------------------------------------------
  // 노드 드래그 — d3-force fx/fy 사용
  // -----------------------------------------------------------------------------
  const dragNodeRef = useRef<NetworkNode | null>(null);
  const dragStartRef = useRef<{ mx: number; my: number; nx: number; ny: number }>(
    { mx: 0, my: 0, nx: 0, ny: 0 }
  );

  const onNodeMouseDown = useCallback(
    (e: React.MouseEvent<SVGGElement>, node: NetworkNode) => {
      e.stopPropagation();
      const sim = simulationRef.current;
      if (!sim) return;
      sim.alphaTarget(0.25).restart();
      node.fx = node.x;
      node.fy = node.y;
      dragNodeRef.current = node;
      dragStartRef.current = {
        mx: e.clientX,
        my: e.clientY,
        nx: node.x ?? 0,
        ny: node.y ?? 0,
      };
      setDraggingId(node.id);
    },
    []
  );

  // 전역 mousemove·mouseup — pan과 node drag 모두 처리
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      // 노드 드래그
      const dragging = dragNodeRef.current;
      if (dragging) {
        const sim = simulationRef.current;
        if (!sim) return;
        const dx = (e.clientX - dragStartRef.current.mx) / view.k;
        const dy = (e.clientY - dragStartRef.current.my) / view.k;
        dragging.fx = dragStartRef.current.nx + dx;
        dragging.fy = dragStartRef.current.ny + dy;
        return;
      }
      // 팬
      if (panStateRef.current.panning) {
        const dx = e.clientX - panStateRef.current.startX;
        const dy = e.clientY - panStateRef.current.startY;
        setView((v) => ({
          ...v,
          x: panStateRef.current.origX + dx,
          y: panStateRef.current.origY + dy,
        }));
      }
    };
    const onUp = () => {
      const dragging = dragNodeRef.current;
      if (dragging) {
        const sim = simulationRef.current;
        if (sim) sim.alphaTarget(0);
        // 놓으면 free하게 — fx/fy 해제하면 force가 다시 재배치
        dragging.fx = null;
        dragging.fy = null;
        dragNodeRef.current = null;
        setDraggingId(null);
      }
      panStateRef.current.panning = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [view.k]);

  // -----------------------------------------------------------------------------
  // hover highlight — 연결된 노드·엣지 set
  // -----------------------------------------------------------------------------
  const adjacency = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    links.forEach((l) => {
      const sid = typeof l.source === "string" ? l.source : (l.source as NetworkNode).id;
      const tid = typeof l.target === "string" ? l.target : (l.target as NetworkNode).id;
      if (!map[sid]) map[sid] = new Set();
      if (!map[tid]) map[tid] = new Set();
      map[sid].add(tid);
      map[tid].add(sid);
    });
    return map;
  }, [links]);

  const activeId = hoverId ?? selectedId ?? null;
  const activeSet = useMemo(() => {
    if (!activeId) return null;
    const s = new Set<string>([activeId]);
    (adjacency[activeId] ?? new Set()).forEach((id) => s.add(id));
    return s;
  }, [activeId, adjacency]);

  // -----------------------------------------------------------------------------
  // 렌더 — tick에 의해 갱신됨 (좌표는 nodes 객체에 직접 들어있음)
  // -----------------------------------------------------------------------------
  // tick state를 참조해야 React가 재계산하도록 트리거 (linter 회피)
  void tick;

  // 헬퍼 — 엣지 source/target 좌표 추출
  function getLinkCoords(l: NetworkLink) {
    const s = (typeof l.source === "object" ? l.source : null) as NetworkNode | null;
    const t = (typeof l.target === "object" ? l.target : null) as NetworkNode | null;
    if (!s || !t) return null;
    return {
      x1: s.x ?? 0,
      y1: s.y ?? 0,
      x2: t.x ?? 0,
      y2: t.y ?? 0,
      sid: s.id,
      tid: t.id,
    };
  }

  // 곡선 path — quadratic curve, 중간점 약간 offset
  function curvedPath(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    offset = 18
  ): string {
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    // 수직 방향 normal로 살짝 옮김
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const cx = mx + nx * offset;
    const cy = my + ny * offset;
    return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
  }

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-[#fafaf7]">
      <svg
        ref={svgRef}
        width={dim.w}
        height={dim.h}
        onMouseDown={onSvgMouseDown}
        className={draggingId ? "cursor-grabbing" : "cursor-grab"}
        style={{ display: "block" }}
      >
        <defs>
          {/* 화살촉 — 활성·비활성 두 색 */}
          <marker
            id="kg-net-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#a8a29e" />
          </marker>
          <marker
            id="kg-net-arrow-active"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#44403c" />
          </marker>
          <marker
            id="kg-net-arrow-fade"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#d6d3d1" />
          </marker>
        </defs>

        {/* dots 배경 패턴 */}
        <rect width={dim.w} height={dim.h} fill="#fafaf7" />
        <g
          transform={`translate(${view.x}, ${view.y}) scale(${view.k})`}
          style={{ pointerEvents: "auto" }}
        >
          {/* 엣지 layer */}
          <g>
            {links.map((l) => {
              const c = getLinkCoords(l);
              if (!c) return null;
              const isMissing = l.label === "forZone"; // T-Box partial 관계
              const isActive =
                !activeSet ||
                (activeSet.has(c.sid) && activeSet.has(c.tid));
              const baseStroke = isMissing ? "#b45309" : "#a8a29e";
              const stroke = activeSet
                ? isActive
                  ? isMissing
                    ? "#92400e"
                    : "#44403c"
                  : "#e7e5e4"
                : baseStroke;
              const arrowMarker = activeSet
                ? isActive
                  ? "url(#kg-net-arrow-active)"
                  : "url(#kg-net-arrow-fade)"
                : "url(#kg-net-arrow)";
              const path = curvedPath(c.x1, c.y1, c.x2, c.y2, 14);
              return (
                <g key={l.id}>
                  <path
                    d={path}
                    fill="none"
                    stroke={stroke}
                    strokeWidth={isActive ? 1.4 : 1}
                    strokeDasharray={isMissing ? "5 4" : undefined}
                    markerEnd={arrowMarker}
                  />
                  {/* 엣지 라벨 — active 일 때만 표시해 시각 부담 줄임 */}
                  {isActive && (
                    <text
                      x={(c.x1 + c.x2) / 2}
                      y={(c.y1 + c.y2) / 2 - 4}
                      textAnchor="middle"
                      fontSize={10}
                      fill="#78716c"
                      style={{ pointerEvents: "none", userSelect: "none" }}
                    >
                      {l.label}
                    </text>
                  )}
                </g>
              );
            })}
          </g>

          {/* 노드 layer */}
          <g>
            {nodes.map((n) => {
              const color = ENTITY_COLOR[n.entity] ?? "#a8a29e";
              const cx = n.x ?? 0;
              const cy = n.y ?? 0;
              const isActive = !activeSet || activeSet.has(n.id);
              const opacity = isActive ? 1 : 0.25;

              const fill = n.missing
                ? "#f5f5f4"
                : n.isCounter
                ? "#fafaf7"
                : "#ffffff";
              const stroke = n.missing
                ? "#d6d3d1"
                : n.isCounter
                ? "#d6d3d1"
                : color;
              const strokeWidth =
                n.id === selectedId ? 2.5 : n.id === hoverId ? 2 : 1.5;
              const dash = n.missing ? "4 3" : undefined;
              const labelColor = n.missing
                ? "#a8a29e"
                : n.isCounter
                ? "#78716c"
                : "#1c1917";

              return (
                <g
                  key={n.id}
                  transform={`translate(${cx}, ${cy})`}
                  opacity={opacity}
                  onMouseEnter={() => setHoverId(n.id)}
                  onMouseLeave={() => setHoverId(null)}
                  onMouseDown={(e) => onNodeMouseDown(e, n)}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect({ kind: "instance", id: n.id });
                  }}
                  style={{ cursor: "pointer" }}
                  data-node-id={n.id}
                >
                  {/* 미세 그림자 (절제된 톤) */}
                  <circle
                    r={n.radius}
                    fill="rgba(0,0,0,0.05)"
                    transform="translate(0,1.5)"
                    data-node-id={n.id}
                  />
                  <circle
                    r={n.radius}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                    strokeDasharray={dash}
                    data-node-id={n.id}
                  />
                  {/* 클래스 dot — 가운데 작은 색 인디케이터 */}
                  {!n.missing && !n.isCounter && (
                    <circle
                      r={3.5}
                      fill={color}
                      cy={-n.radius + 8}
                      data-node-id={n.id}
                    />
                  )}
                  {/* 노드 라벨 — 짧게, 12자 넘으면 줄임 */}
                  <text
                    textAnchor="middle"
                    fontSize={10}
                    fill={labelColor}
                    fontWeight={500}
                    y={3}
                    style={{ pointerEvents: "none", userSelect: "none" }}
                  >
                    {truncate(n.label, 10)}
                  </text>
                  {/* 결손 표시 */}
                  {n.missing && (
                    <text
                      textAnchor="middle"
                      fontSize={8}
                      fill="#a8a29e"
                      y={n.radius + 11}
                      style={{ pointerEvents: "none", userSelect: "none" }}
                    >
                      결손
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </g>
      </svg>

      {/* 우상단 컨트롤 — zoom reset */}
      <div className="pointer-events-auto absolute right-3 top-3 flex flex-col gap-1">
        <button
          type="button"
          onClick={() => setView({ x: 0, y: 0, k: 1 })}
          className="rounded border border-stone-200/80 bg-white/95 px-2 py-1 text-[11px] text-stone-600 shadow-sm hover:bg-stone-50"
          title="원래 위치로"
        >
          Reset
        </button>
        <div className="rounded border border-stone-200/80 bg-white/95 px-2 py-1 text-[10px] text-stone-500 shadow-sm">
          zoom {Math.round(view.k * 100)}%
        </div>
      </div>

      {/* 하단 hint */}
      <div className="pointer-events-none absolute bottom-3 left-3 rounded bg-white/90 px-2 py-1 text-[10px] text-stone-500 shadow-sm">
        drag 노드 / wheel zoom / pan 빈 공간 drag
      </div>
    </div>
  );
}

// 라벨 truncate — 너무 길면 줄임표
function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + "…";
}
