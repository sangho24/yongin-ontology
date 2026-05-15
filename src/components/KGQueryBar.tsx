"use client";

import { useState, useCallback } from "react";
import { Search, X, ArrowRight, AlertCircle } from "lucide-react";
import kgData from "@/data/kg_instances.json";

// ─── Types ────────────────────────────────────────────────────────────────────

type ClassName = keyof typeof kgData.instances;

interface KGInstance {
  id: string;
  label: string;
  entity: string;
  kpi?: string;
  missing?: boolean;
  isCounter?: boolean;
}

interface PathStep {
  classId: ClassName;
  edgeLabel?: string; // edge from prev step to this step
  instances: KGInstance[];
}

interface QueryResult {
  label: string;
  mode: "path" | "flat" | "error";
  steps: PathStep[];
  message?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ENTITY_COLOR: Record<string, string> = {
  라이프: "#0095A9",
  용인공원: "#78716c",
  YPL: "#b45309",
  공통: "#a8a29e",
};

const CLASS_LABEL: Record<string, string> = {
  Member: "Member (회원)",
  SalesAgent: "SalesAgent (영업사원)",
  Contract: "Contract (계약)",
  Zone: "Zone (구역)",
  Channel: "Channel (채널)",
  Department: "Department (부서)",
  Activity: "Activity (활동)",
  Cost: "Cost (비용)",
};

// 한국어·영어 키워드 → ClassName 매핑
const CLASS_HINTS: Array<{ patterns: string[]; classId: ClassName }> = [
  { patterns: ["회원", "member", "mbr"], classId: "Member" },
  { patterns: ["영업사원", "설계사", "salesagent", "sa-"], classId: "SalesAgent" },
  { patterns: ["계약", "contract", "ctr"], classId: "Contract" },
  { patterns: ["구역", "zone", "zn-"], classId: "Zone" },
  { patterns: ["채널", "channel", "ch-"], classId: "Channel" },
  { patterns: ["부서", "팀", "department", "dept"], classId: "Department" },
  { patterns: ["활동", "activity", "act-"], classId: "Activity" },
  { patterns: ["비용", "원가", "cost"], classId: "Cost" },
];

const INSTANCES = kgData.instances as Record<ClassName, KGInstance[]>;

// ─── Graph engine ─────────────────────────────────────────────────────────────

type AdjEntry = { target: ClassName; label: string; reverse: boolean };

function buildAdj(): Record<string, AdjEntry[]> {
  const adj: Record<string, AdjEntry[]> = {};
  for (const rel of kgData.relations) {
    (adj[rel.source] ??= []).push({ target: rel.target as ClassName, label: rel.label, reverse: false });
    (adj[rel.target] ??= []).push({ target: rel.source as ClassName, label: rel.label, reverse: true });
  }
  return adj;
}

const ADJ = buildAdj();

// BFS: 클래스 그래프에서 from → to 최단 경로 반환
function bfsClassPath(
  from: ClassName,
  to: ClassName
): Array<{ classId: ClassName; edgeLabel?: string }> | null {
  if (from === to) return [{ classId: from }];

  type State = { node: ClassName; path: Array<{ classId: ClassName; edgeLabel?: string }> };
  const visited = new Set<string>([from]);
  const queue: State[] = [{ node: from, path: [{ classId: from }] }];

  while (queue.length > 0) {
    const { node, path } = queue.shift()!;
    for (const { target, label, reverse } of ADJ[node] ?? []) {
      if (visited.has(target)) continue;
      visited.add(target);
      const edgeLabel = reverse ? `← ${label}` : label;
      const next = [...path, { classId: target, edgeLabel }];
      if (target === to) return next;
      queue.push({ node: target, path: next });
    }
  }
  return null;
}

// 1-hop: classId에서 바로 연결된 클래스 목록
function oneHopNeighbors(classId: ClassName): Array<{ classId: ClassName; edgeLabel: string }> {
  return (ADJ[classId] ?? []).map(({ target, label, reverse }) => ({
    classId: target,
    edgeLabel: reverse ? `← ${label}` : label,
  }));
}

// 키워드로 인스턴스 + 소속 클래스 탐색
function findMatchingInstances(keyword: string): Array<{ classId: ClassName; instance: KGInstance }> {
  const kw = keyword.toLowerCase().trim();
  const results: Array<{ classId: ClassName; instance: KGInstance }> = [];
  for (const [classId, instances] of Object.entries(INSTANCES)) {
    for (const inst of instances as KGInstance[]) {
      if (
        inst.label.toLowerCase().includes(kw) ||
        inst.id.toLowerCase().includes(kw) ||
        (inst.kpi ?? "").toLowerCase().includes(kw)
      ) {
        results.push({ classId: classId as ClassName, instance: inst });
      }
    }
  }
  return results;
}

// 키워드에서 ClassName 힌트 추출
function resolveClass(keyword: string): ClassName | null {
  const kw = keyword.toLowerCase().trim();
  for (const { patterns, classId } of CLASS_HINTS) {
    if (patterns.some((p) => kw.includes(p))) return classId;
  }
  return null;
}

// ─── Query parser & executor ──────────────────────────────────────────────────

function executeQuery(raw: string): QueryResult {
  const query = raw.trim();

  // "X의 Y" 또는 "X → Y" 패턴 감지
  const ofMatch = query.match(/^(.+?)의\s*(.+)$/);
  const arrowMatch = query.match(/^(.+?)\s*(?:->|→)\s*(.+)$/);
  const match = ofMatch ?? arrowMatch;

  if (match) {
    const [, sourcePart, targetPart] = match;

    // 출발 인스턴스 탐색
    const sourceHits = findMatchingInstances(sourcePart.trim());
    if (sourceHits.length === 0) {
      return {
        label: `"${sourcePart.trim()}" 인스턴스를 찾을 수 없습니다`,
        mode: "error",
        steps: [],
        message: "출발 노드가 그래프에 없습니다. 구역명·클래스명·인스턴스 ID로 시도해보세요.",
      };
    }

    const sourceClassId = sourceHits[0].classId;
    const sourceInstances = sourceHits.map((h) => h.instance);

    // 도착 클래스 힌트 해석
    const targetClassId = resolveClass(targetPart.trim());

    if (targetClassId) {
      // 두 클래스 사이 BFS 경로 탐색
      const classPath = bfsClassPath(sourceClassId, targetClassId);
      if (!classPath) {
        return {
          label: `${CLASS_LABEL[sourceClassId]} → ${CLASS_LABEL[targetClassId]} 경로 없음`,
          mode: "error",
          steps: [],
          message: "두 클래스가 현재 T-Box에서 연결되지 않습니다. 관계 정의 보강이 필요합니다.",
        };
      }

      const steps: PathStep[] = classPath.map((step, idx) => ({
        classId: step.classId,
        edgeLabel: step.edgeLabel,
        instances:
          idx === 0
            ? sourceInstances
            : INSTANCES[step.classId].slice(0, 4),
      }));

      return {
        label: `${sourcePart.trim()} → ${CLASS_LABEL[targetClassId]}`,
        mode: "path",
        steps,
      };
    }

    // 도착 클래스 미지정: 1-hop 이웃 전체 반환
    const neighbors = oneHopNeighbors(sourceClassId);
    const steps: PathStep[] = [
      { classId: sourceClassId, instances: sourceInstances },
      ...neighbors.map(({ classId, edgeLabel }) => ({
        classId,
        edgeLabel,
        instances: INSTANCES[classId].slice(0, 3),
      })),
    ];

    return {
      label: `${sourcePart.trim()} 에서 도달 가능한 클래스`,
      mode: "flat",
      steps,
    };
  }

  // 단순 키워드: 인스턴스 매칭 + 1-hop 확장
  const hits = findMatchingInstances(query);
  if (hits.length === 0) {
    return {
      label: `"${query}" — 매칭 없음`,
      mode: "error",
      steps: [],
      message: "일치하는 인스턴스가 없습니다.",
    };
  }

  // 매칭된 인스턴스를 클래스별로 묶고, 각 클래스의 1-hop 이웃도 포함
  const grouped: Partial<Record<ClassName, KGInstance[]>> = {};
  for (const { classId, instance } of hits) {
    (grouped[classId] ??= []).push(instance);
  }

  const steps: PathStep[] = Object.entries(grouped).map(([classId, instances]) => ({
    classId: classId as ClassName,
    instances: instances!,
  }));

  return { label: `"${query}" 매칭 결과`, mode: "flat", steps };
}

// ─── Preset queries ───────────────────────────────────────────────────────────

const PRESETS: Array<{ id: string; label: string; query: string }> = [
  { id: "p1", label: "온라인 회원의 담당 부서", query: "온라인 회원의 부서" },
  { id: "p2", label: "정담원 구역의 계약", query: "정담원의 계약" },
  { id: "p3", label: "인건비의 귀속 활동", query: "인건비의 활동" },
  { id: "p4", label: "법인 채널 → 영업사원", query: "법인 → 영업사원" },
  { id: "p5", label: "행사서비스팀의 회원", query: "행사서비스팀의 회원" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function KGQueryBar() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<QueryResult | null>(null);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const run = useCallback((query: string, presetId?: string) => {
    setActivePreset(presetId ?? null);
    setInput(query);
    setResult(executeQuery(query));
  }, []);

  const clear = useCallback(() => {
    setInput("");
    setResult(null);
    setActivePreset(null);
  }, []);

  return (
    <div className="mb-6 rounded-md border border-stone-200/80 bg-white">
      {/* Search input */}
      <div className="flex items-center gap-2 border-b border-stone-100 px-3 py-2.5">
        <Search className="h-3.5 w-3.5 shrink-0 text-stone-400" strokeWidth={2} />
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") run(input);
          }}
          placeholder='"정담원의 계약"  ·  "인건비 → 부서"  ·  "온라인 회원의 채널"'
          className="min-w-0 flex-1 bg-transparent text-[12.5px] text-stone-800 placeholder:text-stone-400 focus:outline-none"
        />
        {(input || result) && (
          <button onClick={clear} className="shrink-0 text-stone-400 hover:text-stone-600">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Preset chips */}
      <div className="flex flex-wrap items-center gap-1.5 px-3 py-2">
        <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-stone-400">
          예시 질의
        </span>
        {PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => run(p.query, p.id)}
            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
              activePreset === p.id
                ? "border-[#0095A9] bg-[#e6f4f6] text-[#0095A9]"
                : "border-stone-200 bg-stone-50 text-stone-600 hover:border-stone-300 hover:bg-stone-100"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Result */}
      {result && (
        <div className="border-t border-stone-100 px-3 pb-3 pt-2.5">
          <div className="mb-2.5 text-[12px] font-semibold text-stone-800">{result.label}</div>

          {result.mode === "error" && (
            <div className="flex items-start gap-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {result.message}
            </div>
          )}

          {result.mode === "path" && <PathView steps={result.steps} />}
          {result.mode === "flat" && <FlatView steps={result.steps} />}
        </div>
      )}
    </div>
  );
}

// ─── Result views ─────────────────────────────────────────────────────────────

function PathView({ steps }: { steps: PathStep[] }) {
  return (
    <div className="flex flex-wrap items-start gap-2">
      {steps.map((step, idx) => (
        <div key={`${step.classId}-${idx}`} className="flex items-start gap-2">
          {idx > 0 && (
            <div className="flex flex-col items-center pt-4">
              <span className="whitespace-nowrap rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-mono text-stone-500">
                {step.edgeLabel}
              </span>
              <ArrowRight className="mt-0.5 h-3 w-3 text-stone-400" />
            </div>
          )}
          <StepCard step={step} />
        </div>
      ))}
    </div>
  );
}

function FlatView({ steps }: { steps: PathStep[] }) {
  if (steps.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-3">
      {steps.map((step, idx) => (
        <StepCard key={`${step.classId}-${idx}`} step={step} />
      ))}
    </div>
  );
}

function StepCard({ step }: { step: PathStep }) {
  return (
    <div className="min-w-[130px] max-w-[220px] rounded border border-stone-200 bg-stone-50 p-2">
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-stone-400">
        {CLASS_LABEL[step.classId]}
      </div>
      <div className="space-y-1">
        {step.instances.map((inst) => (
          <InstanceChip key={inst.id} inst={inst} />
        ))}
      </div>
    </div>
  );
}

function InstanceChip({ inst }: { inst: KGInstance }) {
  const color = ENTITY_COLOR[inst.entity] ?? "#a8a29e";
  return (
    <div
      className={`flex items-start gap-1.5 rounded px-1.5 py-1 text-[11px] leading-snug ${
        inst.missing
          ? "border border-dashed border-stone-300 bg-white text-stone-400 italic"
          : "bg-white text-stone-700"
      }`}
    >
      {!inst.missing && (
        <span
          className="mt-[3px] h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
      )}
      {inst.label}
    </div>
  );
}
