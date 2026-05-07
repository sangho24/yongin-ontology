"use client";

import { Handle, Position, NodeProps } from "@xyflow/react";

type Status = "satisfied" | "partiallyMissing" | "missing";

const STYLES: Record<Status, { bg: string; border: string; text: string; dot: string }> = {
  satisfied: {
    bg: "bg-white",
    border: "border-[#0095A9]/35",
    text: "text-stone-900",
    dot: "bg-[#0095A9]",
  },
  partiallyMissing: {
    bg: "bg-[#fef7ed]",
    border: "border-[#b45309]/40 border-dashed",
    text: "text-stone-900",
    dot: "bg-[#b45309]",
  },
  missing: {
    bg: "bg-[#fef2f0]",
    border: "border-[#9a3412]/45 border-dashed",
    text: "text-stone-900",
    dot: "bg-[#9a3412]",
  },
};

export function TBoxNode({ data }: NodeProps) {
  const status = (data.status as Status) ?? "satisfied";
  const s = STYLES[status];
  const label = (data.label as string) ?? "";

  return (
    <div
      className={`min-w-[170px] rounded-md border ${s.bg} ${s.border} ${s.text} px-3 py-2 transition-colors hover:border-stone-900/50`}
    >
      <Handle type="target" position={Position.Left} className="!h-1.5 !w-1.5 !bg-stone-400 !border-0" />
      <div className="flex items-center gap-2">
        <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
        <span className="text-[12px] font-medium tracking-tight">{label}</span>
      </div>
      {status !== "satisfied" && (
        <div className="mt-0.5 text-[9px] uppercase tracking-wider text-stone-500">
          {status === "missing" ? "MISSING" : "PARTIAL"}
        </div>
      )}
      <Handle type="source" position={Position.Right} className="!h-1.5 !w-1.5 !bg-stone-400 !border-0" />
    </div>
  );
}
