import type { DocKind, DocWeight } from "@/data/officialDocs";

/** 제목만 보고 문서 종류를 짐작한다. 확정이 아니라 후보 정렬용이고, 승인할 때 사람이 고친다. */
export function classifyDocKind(title: string): DocKind {
  const t = title.toLowerCase();
  if (/\b(joint (statement|declaration|communiqu[eé])|communiqu[eé]|summit declaration)\b|공동성명|공동선언|공동 ?발표/.test(t)) return "joint-statement";
  if (/\bfact ?sheet\b|팩트시트/.test(t)) return "factsheet";
  if (/\breadout\b|회담 결과|회담 요약/.test(t)) return "readout";
  if (/\b(treaty|agreement|convention|memorandum of understanding)\b|조약|협정/.test(t)) return "treaty";
  if (/\b(remarks|speech|press conference|press briefing|briefing|address|interview|op-?ed)\b|연설|기자회견|브리핑|인터뷰/.test(t)) return "remarks";
  if (/\bstatement\b|성명|입장/.test(t)) return "statement";
  return "press-release";
}

/** 문서가 누구의 무게로 서는지. 합의문서와 일방 발표, 개인 발언을 같은 무게로 보이지 않게 한다. */
export function weightOf(kind: DocKind): DocWeight {
  if (kind === "joint-statement" || kind === "treaty") return "agreed";
  if (kind === "remarks") return "remarks";
  return "unilateral";
}

export const KIND_KO: Record<DocKind, string> = {
  factsheet: "팩트시트",
  "joint-statement": "공동성명",
  readout: "회담 요약",
  statement: "성명",
  "press-release": "보도자료",
  remarks: "발언·기자회견",
  treaty: "조약·협정",
};

export const WEIGHT_KO: Record<DocWeight, string> = {
  agreed: "합의 문서",
  unilateral: "한쪽이 낸 발표",
  remarks: "개인 발언",
};
