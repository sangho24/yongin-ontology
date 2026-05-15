// Comunica 기반 SPARQL 엔진 — 클라이언트 전용 (SSR X)
// JSON-LD 온톨로지를 인메모리 소스로 로드 후 SPARQL 질의 실행

export const YP = "http://yonginpark.kr/ontology#";
export const INST = "http://yonginpark.kr/instance/";
export const RDFS = "http://www.w3.org/2000/01/rdf-schema#";

export interface SPARQLRow {
  [varName: string]: string;
}

// Comunica QueryEngine는 첫 쿼리 시 lazy init
let enginePromise: Promise<import("@comunica/query-sparql").QueryEngine> | null = null;

async function getEngine() {
  if (!enginePromise) {
    enginePromise = import("@comunica/query-sparql").then(
      ({ QueryEngine }) => new QueryEngine()
    );
  }
  return enginePromise;
}

// JSON-LD 파일을 문자열로 가져오는 캐시
let ontologyString: string | null = null;

async function getOntologyString(): Promise<string> {
  if (!ontologyString) {
    const data = await import("@/data/kg_ontology.json");
    ontologyString = JSON.stringify(data.default ?? data);
  }
  return ontologyString;
}

export async function runSPARQL(sparql: string): Promise<SPARQLRow[]> {
  const [engine, source] = await Promise.all([getEngine(), getOntologyString()]);

  const bindingsStream = await engine.queryBindings(sparql, {
    sources: [
      {
        type: "serialized",
        value: source,
        mediaType: "application/ld+json",
        baseIRI: INST,
      },
    ],
  });

  const bindings = await bindingsStream.toArray();
  return bindings.map((b) => {
    const row: SPARQLRow = {};
    for (const key of b.keys()) {
      const term = b.get(key);
      if (term) row[key.value] = term.value;
    }
    return row;
  });
}

// ─── NL → SPARQL 변환 ────────────────────────────────────────────────────────

// 클래스 힌트: 한국어/영어 키워드 → ontology URI
// 구체적(긴) 패턴을 앞에 배치 — "원가동인" > "원가", "계정과목" > "계정", "거래처" > "거래"
const CLASS_MAP: Array<{ patterns: string[]; uri: string; label: string }> = [
  { patterns: ["원가동인", "배부동인", "동인", "costdriver", "driver"],          uri: `${YP}CostDriver`,    label: "CostDriver" },
  { patterns: ["매출스트림", "매출종류", "수익스트림", "revenuestream", "revenue"], uri: `${YP}RevenueStream`, label: "RevenueStream" },
  { patterns: ["계정과목", "계정", "account", "acct"],                           uri: `${YP}Account`,       label: "Account" },
  { patterns: ["거래처", "외주", "vendor", "vnd"],                               uri: `${YP}Vendor`,        label: "Vendor" },
  { patterns: ["회계기간", "회계연도", "회계기간", "fiscalperiod", "period"],     uri: `${YP}FiscalPeriod`,  label: "FiscalPeriod" },
  { patterns: ["장법", "매장방법", "burialmethod", "burial"],                    uri: `${YP}BurialMethod`,  label: "BurialMethod" },
  { patterns: ["회원", "member", "mbr"],                                         uri: `${YP}Member`,        label: "Member" },
  { patterns: ["영업사원", "설계사", "salesagent"],                              uri: `${YP}SalesAgent`,    label: "SalesAgent" },
  { patterns: ["계약자", "계약", "contract", "ctr"],                             uri: `${YP}Contract`,      label: "Contract" },
  { patterns: ["구역", "zone", "zn"],                                            uri: `${YP}Zone`,          label: "Zone" },
  { patterns: ["채널", "channel"],                                               uri: `${YP}Channel`,       label: "Channel" },
  { patterns: ["부서", "팀", "department", "dept"],                              uri: `${YP}Department`,    label: "Department" },
  { patterns: ["활동", "activity", "act"],                                       uri: `${YP}Activity`,      label: "Activity" },
  { patterns: ["비용", "원가", "cost"],                                          uri: `${YP}Cost`,          label: "Cost" },
  { patterns: ["거래", "원장", "분개", "transaction", "txn"],                    uri: `${YP}Transaction`,   label: "Transaction" },
  { patterns: ["법인", "3사", "entity", "ent"],                                  uri: `${YP}Entity`,        label: "Entity" },
];

export function resolveClass(
  keyword: string
): { uri: string; label: string } | null {
  const kw = keyword.toLowerCase().trim();
  for (const { patterns, uri, label } of CLASS_MAP) {
    if (patterns.some((p) => kw.includes(p))) return { uri, label };
  }
  return null;
}

// 인스턴스 키워드 → IRI 후보 (SPARQL로 검색)
export async function findInstanceIRIs(keyword: string): Promise<string[]> {
  const kw = keyword.toLowerCase();
  const q = `
    PREFIX rdfs: <${RDFS}>
    SELECT ?s ?label WHERE { ?s rdfs:label ?label }
  `;
  const rows = await runSPARQL(q);
  return rows
    .filter((r) => r.label?.toLowerCase().includes(kw))
    .map((r) => r.s);
}

// ─── CQ 쿼리 템플릿 ───────────────────────────────────────────────────────────

export interface CQTemplate {
  id: string;
  label: string;          // 예시 chip에 표시
  nlExample: string;      // 입력창 placeholder용
  sparql: string;
  resultDesc: (rows: SPARQLRow[]) => string;
}

export const CQ_TEMPLATES: CQTemplate[] = [
  {
    id: "cq1",
    label: "정담원 구역의 계약 · 계약자",
    nlExample: "정담원의 계약자",
    sparql: `
      PREFIX yp:   <${YP}>
      PREFIX inst: <${INST}>
      PREFIX rdfs: <${RDFS}>
      SELECT ?contract ?cLabel ?member ?mLabel WHERE {
        ?contract yp:forZone inst:ZN-JEONGDAM-1 ;
                  rdfs:label ?cLabel .
        OPTIONAL { ?member yp:hasContract ?contract ; rdfs:label ?mLabel . }
      }`,
    resultDesc: (rows) => `정담원 구역 계약 ${rows.length}건`,
  },
  {
    id: "cq2",
    label: "온라인 유입 회원의 담당 부서",
    nlExample: "온라인 회원의 담당 부서",
    sparql: `
      PREFIX yp:   <${YP}>
      PREFIX inst: <${INST}>
      PREFIX rdfs: <${RDFS}>
      SELECT ?member ?mLabel ?dept ?dLabel WHERE {
        ?member yp:joinedVia inst:CH-ONLINE ;
                rdfs:label ?mLabel .
        ?dept   yp:supports ?member ;
                rdfs:label ?dLabel .
      }`,
    resultDesc: (rows) => `온라인 유입 회원 ${rows.length}명 · 담당 부서 확인`,
  },
  {
    id: "cq3",
    label: "인건비 귀속 활동 · 부서",
    nlExample: "인건비의 귀속 활동",
    sparql: `
      PREFIX yp:   <${YP}>
      PREFIX inst: <${INST}>
      PREFIX rdfs: <${RDFS}>
      SELECT ?act ?aLabel ?dept ?dLabel WHERE {
        inst:COST-LABOR yp:allocatedTo ?act .
        ?act rdfs:label ?aLabel ;
             yp:performedBy ?dept .
        ?dept rdfs:label ?dLabel .
      }`,
    resultDesc: (rows) => `인건비 귀속 활동 ${rows.length}개`,
  },
  {
    id: "cq4",
    label: "세수연 계약의 유입 채널",
    nlExample: "세수연 구역 계약의 채널",
    sparql: `
      PREFIX yp:   <${YP}>
      PREFIX inst: <${INST}>
      PREFIX rdfs: <${RDFS}>
      SELECT ?member ?mLabel ?channel ?chLabel WHERE {
        ?contract yp:forZone inst:ZN-SAESUYEON-1 .
        ?member   yp:hasContract ?contract ;
                  rdfs:label ?mLabel ;
                  yp:joinedVia ?channel .
        ?channel  rdfs:label ?chLabel .
      }`,
    resultDesc: (rows) => `세수연 계약자 ${rows.length}명 · 채널 분포`,
  },
  {
    id: "cq5-crossvc",
    label: "라이프 회원 → 장지 계약 구역",
    nlExample: "라이프 회원의 장지 구역",
    sparql: `
      PREFIX yp:   <${YP}>
      PREFIX rdfs: <${RDFS}>
      SELECT ?member ?mLabel ?mEntity ?zone ?zLabel ?zEntity WHERE {
        ?member a yp:Member ;
                yp:entity ?mEntity ;
                rdfs:label ?mLabel ;
                yp:hasContract ?contract .
        ?contract yp:forZone ?zone .
        ?zone rdfs:label ?zLabel ;
              yp:entity ?zEntity .
        FILTER(?mEntity = "라이프")
      }`,
    resultDesc: (rows) => `라이프 회원 ${rows.length}명의 장지 구역 계약 (Cross-VC)`,
  },
  {
    id: "cq6-channel",
    label: "채널별 계약 건수",
    nlExample: "채널별 계약 수",
    sparql: `
      PREFIX yp:   <${YP}>
      PREFIX rdfs: <${RDFS}>
      SELECT ?channel ?chLabel (COUNT(?member) AS ?memberCount) WHERE {
        ?member a yp:Member ;
                yp:joinedVia ?channel .
        ?channel rdfs:label ?chLabel .
      } GROUP BY ?channel ?chLabel
      ORDER BY DESC(?memberCount)`,
    resultDesc: (rows) => `채널 ${rows.length}개 집계`,
  },
  {
    id: "cq5",
    label: "결손 인스턴스 현황",
    nlExample: "결손 KPI 후보",
    sparql: `
      PREFIX yp:   <${YP}>
      PREFIX rdfs: <${RDFS}>
      PREFIX xsd:  <http://www.w3.org/2001/XMLSchema#>
      SELECT ?s ?label ?entity WHERE {
        ?s yp:missing "true"^^xsd:boolean ;
           rdfs:label ?label ;
           yp:entity  ?entity .
      }`,
    resultDesc: (rows) => `결손 인스턴스 ${rows.length}개 — 보강 시 활성화 가능`,
  },
];

// ─── T-Box 관계 정의 (BFS용) ──────────────────────────────────────────────────

// T-Box 전체 관계 (tbox.json properties 기반)
const TBOX_EDGES = [
  // 기존 (kg_instances 기반)
  { from: "Member",        to: "Channel",       sparql: "yp:joinedVia" },
  { from: "Member",        to: "SalesAgent",    sparql: "yp:recruitedBy" },
  { from: "Member",        to: "Contract",      sparql: "yp:hasContract" },
  { from: "Contract",      to: "Zone",          sparql: "yp:forZone" },
  { from: "Activity",      to: "Department",    sparql: "yp:performedBy" },
  { from: "Cost",          to: "Activity",      sparql: "yp:allocatedTo" },
  { from: "Department",    to: "Member",        sparql: "yp:supports" },
  // T-Box 전체 추가
  { from: "Member",        to: "Contract",      sparql: "yp:contracts" },
  { from: "Member",        to: "SalesAgent",    sparql: "yp:assignedTo" },
  { from: "Contract",      to: "Zone",          sparql: "yp:uses" },
  { from: "Contract",      to: "RevenueStream", sparql: "yp:hasRevenueStream" },
  { from: "Zone",          to: "BurialMethod",  sparql: "yp:locatedIn" },
  { from: "Account",       to: "RevenueStream", sparql: "yp:allocatesTo" },
  { from: "Account",       to: "CostDriver",    sparql: "yp:hasDriver" },
  { from: "Account",       to: "Zone",          sparql: "yp:tracesTo" },
  { from: "Transaction",   to: "Account",       sparql: "yp:debitedTo" },
  { from: "Transaction",   to: "Vendor",        sparql: "yp:involves" },
  { from: "Transaction",   to: "FiscalPeriod",  sparql: "yp:occursIn" },
  { from: "Transaction",   to: "Entity",        sparql: "yp:incurredBy" },
  { from: "RevenueStream", to: "BurialMethod",  sparql: "yp:supportedBy" },
  { from: "Vendor",        to: "Activity",      sparql: "yp:performs" },
  { from: "Activity",      to: "CostDriver",    sparql: "yp:hasDriver" },
  { from: "SalesAgent",    to: "Entity",        sparql: "yp:belongsTo" },
];

type ClassId = string;

// BFS: source class → target class, 결과: SPARQL property path 문자열
function bfsSPARQLPath(from: ClassId, to: ClassId): string | null {
  if (from === to) return "a";

  type State = { node: ClassId; path: string[] };
  const visited = new Set([from]);
  const queue: State[] = [{ node: from, path: [] }];

  while (queue.length > 0) {
    const { node, path } = queue.shift()!;

    for (const edge of TBOX_EDGES) {
      // forward edge
      if (edge.from === node && !visited.has(edge.to)) {
        const newPath = [...path, edge.sparql];
        if (edge.to === to) return newPath.join(" / ");
        visited.add(edge.to);
        queue.push({ node: edge.to, path: newPath });
      }
      // reverse edge
      if (edge.to === node && !visited.has(edge.from)) {
        const newPath = [...path, `^${edge.sparql}`];
        if (edge.from === to) return newPath.join(" / ");
        visited.add(edge.from);
        queue.push({ node: edge.from, path: newPath });
      }
    }
  }
  return null;
}

// 인스턴스 IRI에서 클래스 추출 (JSON-LD의 @type 기반)
async function getInstanceClass(iri: string): Promise<ClassId | null> {
  const q = `
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    SELECT ?type WHERE { <${iri}> rdf:type ?type . }
  `;
  const rows = await runSPARQL(q);
  if (rows.length === 0) return null;
  return rows[0].type?.replace(YP, "") ?? null;
}

// ─── 자유 NL 쿼리 → SPARQL 생성 ──────────────────────────────────────────────

export async function nlToSPARQL(
  text: string
): Promise<{ sparql: string; description: string } | null> {
  const ofMatch = text.match(/^(.+?)의\s*(.+)$/);
  const arrowMatch = text.match(/^(.+?)\s*(?:->|→)\s*(.+)$/);
  const m = ofMatch ?? arrowMatch;
  if (!m) return null;

  const [, sourcePart, targetPart] = m;

  // 출발 인스턴스 IRI
  const sourceIRIs = await findInstanceIRIs(sourcePart.trim());
  if (sourceIRIs.length === 0) return null;

  // 도착 클래스
  const targetClass = resolveClass(targetPart.trim());
  if (!targetClass) return null;

  const sourceIRI = sourceIRIs[0];

  // 출발 인스턴스의 클래스 파악
  const sourceClassId = await getInstanceClass(sourceIRI);
  if (!sourceClassId) return null;

  const targetClassId = targetClass.uri.replace(YP, "");

  // T-Box BFS로 SPARQL property path 계산
  const propPath = bfsSPARQLPath(sourceClassId, targetClassId);
  if (!propPath) return null;

  const shortSrc = `<${sourceIRI}>`;

  const sparql = `
    PREFIX yp:   <${YP}>
    PREFIX rdfs: <${RDFS}>
    SELECT DISTINCT ?result ?label ?entity WHERE {
      ${shortSrc} ${propPath} ?result .
      ?result rdfs:label ?label .
      OPTIONAL { ?result yp:entity ?entity . }
    } LIMIT 20`;

  return {
    sparql,
    description: `${sourcePart.trim()} → ${targetClass.label} (${propPath})`,
  };
}
