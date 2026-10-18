import { describe, expect, it } from "vitest";
import {
  extractNgaWarnings,
  isNgaWarningExpired,
  navAreaRegionCode,
  ngaIssueDateToIso,
  ngaWarningsToNavareaCollection,
  parseCoords,
  warningToFeatures,
  type NgaWarning,
} from "./ngaMsi";

function w(over: Partial<NgaWarning>): NgaWarning {
  return {
    msgYear: 2026,
    msgNumber: 695,
    navArea: "4",
    text: "GULF OF MEXICO.\nDRILLING RIG OPERATIONS.\nA. 19-23.0N 092-03.1W.\n",
    issueDate: "081630Z OCT 2026",
    status: "active",
    ...over,
  };
}

describe("NGA 좌표 파싱", () => {
  it("도-분 표기를 10진 좌표로 (경도, 위도 순)", () => {
    expect(parseCoords("19-23.0N 092-03.1W")).toEqual([[-92.05167, 19.38333]]);
    expect(parseCoords("19-23N 092-03W")).toEqual([[-92.05, 19.38333]]);
    expect(parseCoords("26-30N 056-10E")[0]).toEqual([56.16667, 26.5]);
    expect(parseCoords("12-00S 045-30E")[0]).toEqual([45.5, -12]);
  });

  it("줄바꿈·공백이 있어도 읽고 범위를 벗어나면 버린다", () => {
    expect(parseCoords("19-23.0 N\n092-03.1 W")).toHaveLength(1);
    expect(parseCoords("95-00N 010-00E")).toHaveLength(0);
  });
});

describe("NGA 경보 → 지오메트리", () => {
  it("꼭짓점 나열은 영역(폴리곤)으로 닫는다", () => {
    const feats = warningToFeatures(
      w({
        text: "AREA BOUND BY\nA. 26-00N 056-00E\nB. 26-30N 056-00E\nC. 26-30N 056-40E\nD. 26-00N 056-40E.",
      }),
    );
    expect(feats).toHaveLength(1);
    expect(feats[0]!.geometry.type).toBe("Polygon");
    const ring = (feats[0]!.geometry as { coordinates: number[][][] }).coordinates[0]!;
    expect(ring[0]).toEqual(ring[ring.length - 1]);
  });

  it("항목별 점은 각각 Point", () => {
    const feats = warningToFeatures(
      w({ text: "A. RIG ONE 19-23.0N 092-03.1W.\nB. RIG TWO 20-10.0N 093-00.0W." }),
    );
    expect(feats.map((f) => f.geometry.type)).toEqual(["Point", "Point"]);
  });

  it("항목 이름에서 (NEW POSITION)·(CORRECTED) 표기는 지운다", () => {
    const feats = warningToFeatures(
      w({ text: "A. RIG ONE (NEW POSITION) 19-23.0N 092-03.1W.\nB. RIG TWO (CORRECTED) 20-10.0N 093-00.0W." }),
    );
    expect(feats.map((f) => f.properties.label)).toEqual(["RIG ONE", "RIG TWO"]);
  });

  it("응답에 warningId가 있으면 그대로 쓰고 없으면 만든다", () => {
    expect(warningToFeatures(w({ warningId: "IV-517/24" }))[0]!.properties.warningId).toBe("IV-517/24");
    expect(warningToFeatures(w({}))[0]!.properties.warningId).toBe("IV-695/26");
  });

  it("좌표가 없으면 지오메트리를 만들지 않는다", () => {
    expect(warningToFeatures(w({ text: "NO POSITION GIVEN." }))).toHaveLength(0);
  });
});

describe("지역 코드·날짜", () => {
  it("번호는 로마 숫자, 문자 코드는 HYDRO*", () => {
    expect(navAreaRegionCode("4")).toBe("IV");
    expect(navAreaRegionCode("12")).toBe("XII");
    expect(navAreaRegionCode("9")).toBe("IX");
    expect(navAreaRegionCode("C")).toBe("HYDROLANT");
    expect(navAreaRegionCode("P")).toBe("HYDROPAC");
    expect(navAreaRegionCode("A")).toBe("HYDROARC");
  });

  it("발행 시각을 ISO로, 못 읽으면 그 해 1월 1일", () => {
    expect(ngaIssueDateToIso("081630Z MAY 2024", 2024)).toBe("2024-05-08T16:30:00.000Z");
    expect(ngaIssueDateToIso("garbage", 2026)).toBe("2026-01-01T00:00:00Z");
    expect(ngaIssueDateToIso(undefined, 2025)).toBe("2025-01-01T00:00:00Z");
  });
});

describe("응답 검증·종료 경보", () => {
  it("broadcast-warn 목록이 없으면(점검 페이지 등) 에러", () => {
    expect(() => extractNgaWarnings({ error: "x" })).toThrow();
    expect(() => extractNgaWarnings(null)).toThrow();
    expect(extractNgaWarnings({ "broadcast-warn": [w({})] })).toHaveLength(1);
    expect(extractNgaWarnings([w({})])).toHaveLength(1);
  });

  it("취소일이 지났거나 취소·종료 표기면 종료", () => {
    const now = Date.parse("2026-10-17T00:00:00Z");
    expect(isNgaWarningExpired(w({ cancelDate: "2026-10-01T00:00:00Z" }), now)).toBe(true);
    expect(isNgaWarningExpired(w({ cancelDate: "2026-12-01T00:00:00Z" }), now)).toBe(false);
    expect(isNgaWarningExpired(w({ status: "cancelled" }), now)).toBe(true);
    expect(isNgaWarningExpired(w({ status: "Expired" }), now)).toBe(true);
    expect(isNgaWarningExpired(w({}), now)).toBe(false);
  });

  it("status 표기를 모르면(A, Active 등) 버리지 않는다", () => {
    const now = Date.parse("2026-10-17T00:00:00Z");
    for (const status of ["A", "Active", "active", "IN FORCE", ""]) {
      expect(isNgaWarningExpired(w({ status }), now)).toBe(false);
    }
  });
});

describe("D1 스냅샷 어댑터", () => {
  it("기존 NGA 텍스트 파서와 같은 id 모양(리전-연도-4자리 번호)", () => {
    const fc = ngaWarningsToNavareaCollection([w({})]);
    expect(fc.features).toHaveLength(1);
    const props = fc.features[0]!.properties as Record<string, unknown>;
    expect(props.id).toBe("IV-26-0695");
    expect(props.region).toBe("IV");
    expect(props.source).toBe("nga");
    expect(props.date).toBe("2026-10-08T16:30:00.000Z");
  });

  it("한 경보에 지점이 여러 개면 id에 항목 번호를 붙여 충돌을 막는다", () => {
    const fc = ngaWarningsToNavareaCollection([
      w({ text: "A. RIG ONE 19-23.0N 092-03.1W.\nB. RIG TWO 20-10.0N 093-00.0W." }),
    ]);
    const ids = fc.features.map((f) => (f.properties as { id: string }).id);
    expect(new Set(ids).size).toBe(2);
    expect(ids.every((id) => id.startsWith("IV-26-0695#"))).toBe(true);
  });

  it("종료된 경보와 본문이 빈 경보는 건너뛴다", () => {
    const now = Date.parse("2026-10-17T00:00:00Z");
    const fc = ngaWarningsToNavareaCollection(
      [w({ cancelDate: "2026-10-01T00:00:00Z" }), w({ msgNumber: 1, text: "  " })],
      now,
    );
    expect(fc.features).toHaveLength(0);
  });

  it("원형 경보는 반경을 싣는다", () => {
    const fc = ngaWarningsToNavareaCollection([
      w({ text: "HAZARDOUS OPERATIONS WITHIN RADIUS OF 5 MILES OF 19-23.0N 092-03.1W." }),
    ]);
    expect((fc.features[0]!.properties as { radiusNm?: number }).radiusNm).toBe(5);
  });
});
