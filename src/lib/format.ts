// 금액/비율 포매팅 유틸

export const formatKRW = (n: number, unit: "원" | "백만원" | "억원" = "원") => {
  if (unit === "백만원") return `${(n / 1_000_000).toLocaleString("ko-KR", { maximumFractionDigits: 0 })}백만원`;
  if (unit === "억원") {
    const v = n / 100_000_000;
    return `${v.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}억원`;
  }
  return `${n.toLocaleString("ko-KR")}원`;
};

export const autoUnit = (n: number) => {
  if (n >= 100_000_000) return formatKRW(n, "억원");
  if (n >= 1_000_000) return formatKRW(n, "백만원");
  return formatKRW(n);
};

export const formatPct = (n: number, digits = 1) => `${(n * 100).toFixed(digits)}%`;
