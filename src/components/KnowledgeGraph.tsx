"use client";

import { useMemo, useCallback } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Edge,
  Handle,
  MarkerType,
  MiniMap,
  Node,
  NodeProps,
  Position,
  ReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import tbox from "@/data/tbox.json";
import kgData from "@/data/kg_instances.json";

// =============================================================================
// Knowledge Graph 시각화 컴포넌트
// - Class layer: T-Box 클래스 노드만 (data-model 페이지 대비 RFI 메타 제거)
// - Instance layer: 클래스별 대표 인스턴스를 cluster된 형태로 노출
// - Entity facet(라이프·용인공원·YPL) 3사 색 분리
// - 결손 인스턴스는 dashed + gray + "결손" 라벨
// =============================================================================

// 3사 색상 토큰 — kg_instances.json과 동기화
const ENTITY_COLOR: Record<string, string> = {
  라이프: "#0095A9",
  용인공원: "#78716c",
  YPL: "#b45309",
  공통: "#a8a29e",
};

type Layer = "class" | "instance";

interface ClassNodeData {
  label: string;
  entityKey: "라이프" | "용인공원" | "YPL" | "공통" | "multi";
  status: "satisfied" | "partiallyMissing" | "missing";
  satisfiedFor: string[];
  missingFor: string[];
  definition: string;
  kind: "class";
  [key: string]: unknown;
}

interface InstanceNodeData {
  label: string;
  entity: "라이프" | "용인공원" | "YPL" | "공통";
  kpi?: string;
  isCounter?: boolean;
  missing?: boolean;
  parentClass?: string;
  kind: "instance" | "groupHeader";
  [key: string]: unknown;
}

// -----------------------------------------------------------------------------
// 커스텀 노드 — 클래스 노드 (entity 3색 dot)
// -----------------------------------------------------------------------------
function KGClassNode({ data }: NodeProps) {
  const d = data as ClassNodeData;
  const isMulti = d.entityKey === "multi";
  const single = isMulti ? null : ENTITY_COLOR[d.entityKey];
  return (
    <div className="min-w-[160px] rounded-md border border-stone-200/80 bg-white px-3 py-2.5 shadow-sm transition-colors hover:border-stone-900/40">
      <Handle type="target" position={Position.Left} className="!h-1.5 !w-1.5 !bg-stone-400 !border-0" />
      <div className="flex items-center gap-2">
        {isMulti ? (
          <span className="flex items-center gap-0.5">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: ENTITY_COLOR["라이프"] }} />
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: ENTITY_COLOR["용인공원"] }} />
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: ENTITY_COLOR["YPL"] }} />
          </span>
        ) : (
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: single ?? "#a8a29e" }} />
        )}
        <span className="text-[12px] font-medium tracking-tight text-stone-900">{d.label}</span>
      </div>
      {d.status !== "satisfied" && (
        <div className="mt-0.5 text-[9px] uppercase tracking-wider text-stone-500">
          {d.status === "missing" ? "MISSING" : "PARTIAL"}
        </div>
      )}
      <Handle type="source" position={Position.Right} className="!h-1.5 !w-1.5 !bg-stone-400 !border-0" />
    </div>
  );
}

// -----------------------------------------------------------------------------
// 커스텀 노드 — 인스턴스 노드 (entity 1색 border + 결손 시 dashed gray)
// -----------------------------------------------------------------------------
function KGInstanceNode({ data }: NodeProps) {
  const d = data as InstanceNodeData;
  const color = ENTITY_COLOR[d.entity] ?? "#a8a29e";
  const baseCls = d.missing
    ? "border-dashed border-stone-300 bg-stone-50 text-stone-500"
    : d.isCounter
    ? "border-stone-200 bg-stone-50 text-stone-500"
    : "border-stone-200/80 bg-white text-stone-900";

  return (
    <div
      className={`min-w-[150px] rounded-md border ${baseCls} px-2.5 py-1.5 transition-colors hover:border-stone-400`}
      style={!d.missing && !d.isCounter ? { borderLeftWidth: 3, borderLeftColor: color } : undefined}
    >
      <Handle type="target" position={Position.Left} className="!h-1 !w-1 !bg-stone-300 !border-0" />
      <div className="flex items-center gap-1.5">
        {d.missing ? (
          <span className="h-1.5 w-1.5 rounded-full bg-stone-300" />
        ) : (
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
        )}
        <span className="text-[11px] font-medium tracking-tight">{d.label}</span>
      </div>
      {d.missing && (
        <div className="mt-0.5 text-[9px] uppercase tracking-wider text-stone-400">결손</div>
      )}
      <Handle type="source" position={Position.Right} className="!h-1 !w-1 !bg-stone-300 !border-0" />
    </div>
  );
}

// -----------------------------------------------------------------------------
// 클래스 group header 노드 (인스턴스 layer에서 클래스 cluster의 제목)
// -----------------------------------------------------------------------------
function KGGroupHeader({ data }: NodeProps) {
  const d = data as InstanceNodeData;
  return (
    <div className="rounded-md bg-stone-100/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-stone-500">
      {d.label}
    </div>
  );
}

const nodeTypes = {
  kgClass: KGClassNode,
  kgInstance: KGInstanceNode,
  kgGroup: KGGroupHeader,
};

// =============================================================================
// 좌표 유틸 — 결정적 layout (T-Box reactFlow 좌표 재활용)
// =============================================================================

// T-Box에 정의된 클래스 노드 좌표 → 동일하게 class layer에서 사용
type TboxRfNode = (typeof tbox.reactFlow.nodes)[number];

function classNodeEntityKey(satisfiedFor: string[]): ClassNodeData["entityKey"] {
  // 3사 모두 satisfied → multi (3색 dot)
  const all = ["라이프", "용인공원", "YPL"];
  const satisfiedAll = all.every((e) => satisfiedFor.includes(e));
  if (satisfiedAll) return "multi";
  // 라이프만 satisfied + 장지 missing → 라이프
  if (satisfiedFor.length === 1) {
    const only = satisfiedFor[0];
    if (only === "라이프") return "라이프";
    if (only === "용인공원") return "용인공원";
    if (only === "YPL") return "YPL";
  }
  if (satisfiedFor.includes("용인공원") || satisfiedFor.includes("YPL")) return "용인공원";
  return "공통";
}

// =============================================================================
// 메인 컴포넌트
// =============================================================================
export interface KnowledgeGraphProps {
  layer: Layer;
  onSelect: (sel: { kind: "class" | "instance"; id: string } | null) => void;
}

export function KnowledgeGraph({ layer, onSelect }: KnowledgeGraphProps) {
  // ---- Class layer 노드/엣지 ----
  const classNodes = useMemo<Node[]>(() => {
    return (tbox.reactFlow.nodes as TboxRfNode[]).map((n) => {
      const cls = tbox.classes.find((c) => c.id === n.id);
      const satisfiedFor = cls?.satisfiedFor ?? [];
      const missingFor = cls?.missingFor ?? [];
      const data: ClassNodeData = {
        kind: "class",
        label: (n.data.label as string) ?? n.id,
        entityKey: classNodeEntityKey(satisfiedFor),
        status: (cls?.status as ClassNodeData["status"]) ?? "satisfied",
        satisfiedFor,
        missingFor,
        definition: cls?.definition ?? "",
      };
      return {
        id: n.id,
        type: "kgClass",
        position: n.position,
        data: data as unknown as Record<string, unknown>,
        width: 170,
        height: 60,
        style: { width: 170, height: 60 },
      };
    });
  }, []);

  const classEdges = useMemo<Edge[]>(() => {
    return tbox.reactFlow.edges.map((e) => {
      const status = e.data?.status ?? "satisfied";
      const isMissing = status !== "satisfied";
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label,
        type: "smoothstep",
        animated: false,
        style: {
          stroke: isMissing ? "#b45309" : "#a8a29e",
          strokeWidth: isMissing ? 1.6 : 1.2,
          strokeDasharray: isMissing ? "5 4" : undefined,
        },
        labelStyle: { fontSize: 10, fill: "#78716c" },
        labelBgStyle: { fill: "#fafaf7" },
        labelBgPadding: [4, 2] as [number, number],
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isMissing ? "#b45309" : "#a8a29e",
          width: 14,
          height: 14,
        },
      } as Edge;
    });
  }, []);

  // ---- Instance layer 노드/엣지 ----
  // 클래스별로 column에 cluster — 각 클래스의 인스턴스를 vertical 배치하고
  // 클래스 간 관계는 cluster 간 엣지로 연결
  const { instanceNodes, instanceEdges } = useMemo(() => {
    const COL_W = 280;
    const ROW_H = 56;

    // 좌→우 column 순서 — 관계가 자연스러운 흐름이 되도록 배치
    // Channel → Member → SalesAgent / Contract → Zone, 그리고 하단 Department / Activity / Cost
    const COLUMNS: { key: keyof typeof kgData.instances; x: number; yStart: number }[] = [
      { key: "Channel", x: 0, yStart: 0 },
      { key: "Member", x: COL_W, yStart: 0 },
      { key: "SalesAgent", x: COL_W * 2, yStart: 0 },
      { key: "Contract", x: COL_W * 3, yStart: 0 },
      { key: "Zone", x: COL_W * 4, yStart: 0 },
      { key: "Department", x: COL_W, yStart: 700 },
      { key: "Activity", x: COL_W * 2, yStart: 700 },
      { key: "Cost", x: COL_W * 3, yStart: 700 },
    ];

    const nodes: Node[] = [];
    const idToPos: Record<string, { x: number; y: number }> = {};
    const classToInstanceIds: Record<string, string[]> = {};

    COLUMNS.forEach((col) => {
      const list = (kgData.instances[col.key] ?? []) as Array<{
        id: string;
        label: string;
        entity: string;
        kpi?: string;
        isCounter?: boolean;
        missing?: boolean;
      }>;

      // group header
      const headerId = `grp-${col.key}`;
      nodes.push({
        id: headerId,
        type: "kgGroup",
        position: { x: col.x, y: col.yStart },
        data: {
          kind: "groupHeader",
          label: col.key,
          entity: "공통",
        } as InstanceNodeData as unknown as Record<string, unknown>,
        draggable: true,
      });

      classToInstanceIds[col.key] = [];
      list.forEach((inst, idx) => {
        const y = col.yStart + 40 + idx * ROW_H;
        nodes.push({
          id: inst.id,
          type: "kgInstance",
          position: { x: col.x, y },
          data: {
            kind: "instance",
            label: inst.label,
            entity: (inst.entity as InstanceNodeData["entity"]) ?? "공통",
            kpi: inst.kpi,
            isCounter: inst.isCounter,
            missing: inst.missing,
            parentClass: col.key as string,
          } as InstanceNodeData as unknown as Record<string, unknown>,
        });
        idToPos[inst.id] = { x: col.x, y };
        classToInstanceIds[col.key].push(inst.id);
      });
    });

    // 엣지 생성 — 클래스 간 relations를 인스턴스 cluster 간 cross 엣지로 펼침
    // 시각적 과부하 방지를 위해 cluster의 첫 인스턴스만 연결 (대표 line)
    const edges: Edge[] = [];
    const RELS = kgData.relations as Array<{
      id: string;
      source: keyof typeof kgData.instances;
      target: keyof typeof kgData.instances;
      label: string;
    }>;

    RELS.forEach((rel) => {
      const srcIds = classToInstanceIds[rel.source as string] ?? [];
      const tgtIds = classToInstanceIds[rel.target as string] ?? [];
      // 결손(missing) 노드를 우선 연결해 결손 시각화를 부각
      // forZone (Contract → Zone)의 경우 라이프는 N/A, 장지는 partial → dashed로 표시
      const isMissingRel = rel.label === "forZone";

      // 각 cluster의 대표 1~2개만 연결 (counter / missing 제외)
      const srcSample = srcIds
        .filter((id) => {
          const n = nodes.find((x) => x.id === id);
          const d = n?.data as InstanceNodeData | undefined;
          return d && !d.isCounter && !d.missing;
        })
        .slice(0, 2);
      const tgtSample = tgtIds
        .filter((id) => {
          const n = nodes.find((x) => x.id === id);
          const d = n?.data as InstanceNodeData | undefined;
          return d && !d.isCounter && !d.missing;
        })
        .slice(0, 2);

      srcSample.forEach((sid, si) => {
        const tid = tgtSample[si % Math.max(1, tgtSample.length)];
        if (!tid) return;
        edges.push({
          id: `${rel.id}-${sid}-${tid}`,
          source: sid,
          target: tid,
          label: rel.label,
          type: "smoothstep",
          style: {
            stroke: isMissingRel ? "#b45309" : "#a8a29e",
            strokeWidth: isMissingRel ? 1.4 : 1,
            strokeDasharray: isMissingRel ? "5 4" : undefined,
          },
          labelStyle: { fontSize: 10, fill: "#78716c" },
          labelBgStyle: { fill: "#fafaf7" },
          labelBgPadding: [3, 2] as [number, number],
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: isMissingRel ? "#b45309" : "#a8a29e",
            width: 12,
            height: 12,
          },
        });
      });
    });

    return { instanceNodes: nodes, instanceEdges: edges };
  }, []);

  const [nodes, edges] = useMemo(() => {
    if (layer === "class") return [classNodes, classEdges] as const;
    return [instanceNodes, instanceEdges] as const;
  }, [layer, classNodes, classEdges, instanceNodes, instanceEdges]);

  const onNodeClick = useCallback(
    (_: unknown, n: Node) => {
      const d = n.data as { kind?: string } | undefined;
      if (d?.kind === "groupHeader") return;
      onSelect({ kind: d?.kind === "class" ? "class" : "instance", id: n.id });
    },
    [onSelect]
  );

  return (
    <ReactFlowProvider>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        onPaneClick={() => onSelect(null)}
        fitView
        fitViewOptions={{ padding: 0.18 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#e7e5e4" />
        <Controls showInteractive={false} />
        <MiniMap
          pannable
          zoomable
          nodeColor={(node) => {
            const d = node.data as
              | (ClassNodeData & { kind: string })
              | (InstanceNodeData & { kind: string })
              | undefined;
            if (!d) return "#a8a29e";
            if (d.kind === "class") {
              const cd = d as ClassNodeData;
              if (cd.entityKey === "multi") return "#0095A9";
              return ENTITY_COLOR[cd.entityKey] ?? "#a8a29e";
            }
            const idata = d as InstanceNodeData;
            if (idata.missing) return "#d6d3d1";
            return ENTITY_COLOR[idata.entity] ?? "#a8a29e";
          }}
          nodeStrokeColor="#78716c"
          nodeStrokeWidth={1}
          maskColor="rgba(250, 250, 247, 0.85)"
          className="!bg-white"
        />
      </ReactFlow>
    </ReactFlowProvider>
  );
}

// 페이지에서 detail panel 렌더링 시 필요한 lookup 헬퍼 export
export function lookupSelection(sel: { kind: "class" | "instance"; id: string }): {
  title: string;
  entity: string;
  status?: string;
  kpi?: string;
  definition?: string;
  satisfiedFor?: string[];
  missingFor?: string[];
  missing?: boolean;
  parentClass?: string;
} | null {
  if (sel.kind === "class") {
    const cls = tbox.classes.find((c) => c.id === sel.id);
    if (!cls) return null;
    return {
      title: cls.label,
      entity: cls.satisfiedFor.length === 3 ? "3사 공통" : cls.satisfiedFor.join("·") || "—",
      status: cls.status,
      definition: cls.definition,
      satisfiedFor: cls.satisfiedFor,
      missingFor: cls.missingFor,
    };
  }
  // instance
  const inst = Object.entries(kgData.instances).flatMap(([k, list]) =>
    (list as Array<{
      id: string;
      label: string;
      entity: string;
      kpi?: string;
      missing?: boolean;
      isCounter?: boolean;
    }>).map((i) => ({ ...i, parentClass: k }))
  ).find((i) => i.id === sel.id);
  if (!inst) return null;
  const parentCls = tbox.classes.find((c) => c.id === inst.parentClass);
  return {
    title: inst.label,
    entity: inst.entity,
    kpi: inst.kpi,
    missing: inst.missing,
    parentClass: parentCls?.label ?? inst.parentClass,
  };
}
