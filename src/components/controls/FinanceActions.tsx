"use client";

import { ExternalLink, Sparkles } from "lucide-react";
import type { FinanceActionContext } from "@/types";

// =============================================================================
// FinanceActions — 재무팀 운영 액션 버튼 (ERP·활동 자동 등록)
// =============================================================================

interface FinanceActionsProps {
  context?: FinanceActionContext;
  onOpenERP?: (ctx?: FinanceActionContext) => void;
  onRegisterActivity?: (ctx?: FinanceActionContext) => void;
  visible?: boolean;
  className?: string;
}

export default function FinanceActions({
  context,
  onOpenERP,
  onRegisterActivity,
  visible = true,
  className = "",
}: FinanceActionsProps) {
  if (!visible) return null;

  const handleOpenERP = () => {
    if (onOpenERP) {
      onOpenERP(context);
    } else {
      // 핸들러 미연결 시 placeholder
      console.log("[FinanceActions] ERP에서 열기", context);
    }
  };

  const handleRegister = () => {
    if (onRegisterActivity) {
      onRegisterActivity(context);
    } else {
      console.log("[FinanceActions] 활동 자동 등록", context);
    }
  };

  const baseBtn =
    "inline-flex items-center gap-1.5 rounded-md border border-[#0095A9]/30 bg-white px-3 py-1.5 text-[12px] font-medium text-[#007a8c] transition-colors duration-150 hover:bg-[#e6f4f6] hover:border-[#0095A9]/50";

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <button type="button" onClick={handleOpenERP} className={baseBtn}>
        <ExternalLink className="h-3.5 w-3.5" />
        ERP에서 열기
      </button>
      <button type="button" onClick={handleRegister} className={baseBtn}>
        <Sparkles className="h-3.5 w-3.5" />
        활동 자동 등록
      </button>
    </div>
  );
}
