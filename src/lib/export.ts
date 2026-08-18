// 보고서·백데이터 추출 유틸

type Cell = string | number | null | undefined;

const esc = (v: Cell) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/**
 * CSV 다운로드. Excel의 한글 인식을 위해 UTF-8 BOM을 앞에 붙인다.
 * rows[0]을 헤더로 쓰지 않고 호출부에서 그대로 넘긴 순서대로 기록.
 */
export function downloadCsv(filename: string, rows: Cell[][]) {
  const body = rows.map((r) => r.map(esc).join(",")).join("\r\n");
  const blob = new Blob([`﻿${body}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // revoke는 click 처리가 끝난 뒤로 미룬다
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** 인쇄 대화상자 — @media print 규칙이 보고서 레이아웃으로 전환 */
export function printReport() {
  window.print();
}

/** 파일명용 타임스탬프 (YYYYMMDD) */
export function stamp(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
}
