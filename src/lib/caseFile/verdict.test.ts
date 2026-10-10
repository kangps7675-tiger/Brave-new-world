import { describe, expect, it } from "vitest";
import { buildClaimTemplates } from "@/lib/caseFile/claimTemplates";
import {
  computeCaseVerdict,
  computeClaimVerdict,
  effectiveClaimVerdict,
  evidence,
  explainCaseVerdict,
  refreshCaseVerdicts,
} from "@/lib/caseFile/verdict";
import type { CaseFile, Claim } from "@/lib/caseFile/types";
import { emptyIncident } from "@/lib/caseFile/types";

function claim(
  kind: Claim["kind"],
  evidenceList: Claim["evidence"],
  extra?: Partial<Claim>,
): Claim {
  return {
    id: `c_${kind}`,
    kind,
    statement: kind,
    mapCheckable: kind !== "means" && kind !== "actor",
    evidence: evidenceList,
    verdict: "unconfirmed",
    ...extra,
  };
}

describe("computeClaimVerdict", () => {
  it("returns unconfirmed with no supporting evidence", () => {
    expect(
      computeClaimVerdict({
        evidence: [
          evidence({
            sourceKey: "liveua",
            role: "context",
            strength: "weak",
            shows: "전선 맥락",
            limits: "판정에 안 씀",
            frozenPayload: {},
          }),
        ],
      }),
    ).toBe("unconfirmed");
  });

  it("confirms with one strong support", () => {
    expect(
      computeClaimVerdict({
        evidence: [
          evidence({
            sourceKey: "satellite",
            role: "supports",
            strength: "strong",
            shows: "전후 영상 변화",
            limits: "10m 해상도",
            frozenPayload: {},
          }),
        ],
      }),
    ).toBe("confirmed");
  });

  it("confirms with two medium supports of different kinds", () => {
    expect(
      computeClaimVerdict({
        evidence: [
          evidence({
            sourceKey: "firms",
            role: "supports",
            strength: "medium",
            shows: "열점",
            limits: "공습 아님",
            frozenPayload: {},
          }),
          evidence({
            sourceKey: "official",
            role: "supports",
            strength: "medium",
            shows: "공식 경보",
            limits: "당사자",
            frozenPayload: {},
          }),
        ],
      }),
    ).toBe("confirmed");
  });

  it("stays partial when two mediums are the same kind", () => {
    expect(
      computeClaimVerdict({
        evidence: [
          evidence({
            sourceKey: "firms:a",
            role: "supports",
            strength: "medium",
            shows: "열점1",
            limits: "",
            frozenPayload: {},
          }),
          evidence({
            sourceKey: "firms:b",
            role: "supports",
            strength: "medium",
            shows: "열점2",
            limits: "",
            frozenPayload: {},
          }),
        ],
      }),
    ).toBe("partial");
  });

  it("refutes when any contradicting evidence exists (priority)", () => {
    expect(
      computeClaimVerdict({
        evidence: [
          evidence({
            sourceKey: "satellite",
            role: "supports",
            strength: "strong",
            shows: "변화",
            limits: "",
            frozenPayload: {},
          }),
          evidence({
            sourceKey: "satellite:before",
            role: "contradicts",
            strength: "strong",
            shows: "사건 전 영상에 이미 피해",
            limits: "",
            frozenPayload: {},
          }),
        ],
      }),
    ).toBe("refuted");
  });
});

describe("Odessa grain warehouse example", () => {
  /**
   * "러시아 미사일이 10월 8일 새벽 오데사 항구 곡물창고를 파괴했다"
   * 장소·시간·사건 발생이 규칙상 확인되면 전체는 confirmed.
   * 수단·주체는 전체 판정에서 빼고 「지도로 확인 불가」로 따로 남긴다.
   * (설명 문구의 "일부 확인"은 기사 전체 인상용 — occurrence만 약하면 partial)
   */
  it("confirms case when core claims confirmed; means/actor excluded from rollup", () => {
    const claims: Claim[] = [
      claim("place", [
        evidence({
          sourceKey: "photo",
          role: "supports",
          strength: "medium",
          shows: "현장 사진 위치와 위성 위치 일치",
          limits: "사진 촬영 시각 불명",
          frozenPayload: { lat: 46.48, lng: 30.72 },
        }),
        evidence({
          sourceKey: "satellite",
          role: "supports",
          strength: "medium",
          shows: "곡물창고 위치 위성 일치",
          limits: "10m",
          frozenPayload: {},
        }),
      ]),
      claim("time", [
        evidence({
          sourceKey: "firms",
          role: "supports",
          strength: "medium",
          shows: "FIRMS 열점 10/8 02:10 반경 내",
          limits: "열점≠공습",
          frozenPayload: { acq: "2026-10-08T02:10:00Z" },
        }),
        evidence({
          sourceKey: "neptun",
          role: "supports",
          strength: "medium",
          shows: "해당 시각대 위협·경보 기록",
          limits: "2차 집계",
          frozenPayload: {},
        }),
      ]),
      claim("occurrence", [
        evidence({
          sourceKey: "satellite",
          role: "supports",
          strength: "strong",
          shows: "10/5 vs 10/9 광학 비교 — 창고 소실",
          limits: "작은 피해는 안 보임",
          frozenPayload: { before: "10-05", after: "10-09" },
        }),
      ]),
      claim("damage", [
        evidence({
          sourceKey: "satellite",
          role: "supports",
          strength: "strong",
          shows: "건물 소실·그을림",
          limits: "10m",
          frozenPayload: {},
        }),
      ]),
      claim("means", [
        evidence({
          sourceKey: "official",
          role: "supports",
          strength: "weak",
          shows: "우크라이나 공군 발표 — 미사일",
          limits: "당사자 입장",
          frozenPayload: {},
        }),
      ]),
      claim("actor", [
        evidence({
          sourceKey: "official",
          role: "supports",
          strength: "weak",
          shows: "러시아 공격이라는 당사자 주장",
          limits: "지도로 주체 확인 불가",
          frozenPayload: {},
        }),
      ]),
    ];

    const file = refreshCaseVerdicts({
      id: "case_odesa_demo",
      article: {
        text: "러시아 미사일이 10월 8일 새벽 오데사 항구 곡물창고를 파괴했다",
        outlet: "demo",
      },
      eventType: "strike",
      incident: emptyIncident(),
      claims,
      verdict: "unconfirmed",
      rev: 1,
    });

    expect(file.claims.find((c) => c.kind === "place")?.verdict).toBe("confirmed");
    expect(file.claims.find((c) => c.kind === "time")?.verdict).toBe("confirmed");
    expect(file.claims.find((c) => c.kind === "occurrence")?.verdict).toBe("confirmed");
    expect(file.claims.find((c) => c.kind === "means")?.verdict).toBe("partial");
    expect(file.claims.find((c) => c.kind === "actor")?.verdict).toBe("partial");
    // 핵심 셋이 모두 확인 → 전체는 확인됨
    expect(file.verdict).toBe("confirmed");

    // 수단·주체만 약하면? occurrence를 partial로 바꾸면 전체 partial
    const partialOccurrence = refreshCaseVerdicts({
      ...file,
      claims: file.claims.map((c) =>
        c.kind === "occurrence"
          ? {
              ...c,
              evidence: [
                evidence({
                  sourceKey: "firms",
                  role: "supports",
                  strength: "medium",
                  shows: "열점만",
                  limits: "",
                  frozenPayload: {},
                }),
              ],
            }
          : c,
      ),
    });
    expect(partialOccurrence.claims.find((c) => c.kind === "occurrence")?.verdict).toBe(
      "partial",
    );
    expect(partialOccurrence.verdict).toBe("partial");

    const explained = explainCaseVerdict(partialOccurrence);
    expect(explained.caseVerdict).toBe("partial");
    expect(explained.why).toContain("장소");
    expect(explained.nonCoreNote).toContain("수단");
  });
});

describe("computeCaseVerdict refute priority", () => {
  it("refutes case when any core claim is refuted even if others confirmed", () => {
    const claims = [
      claim("place", [
        evidence({
          sourceKey: "satellite",
          role: "supports",
          strength: "strong",
          shows: "ok",
          limits: "",
          frozenPayload: {},
        }),
      ]),
      claim("time", [
        evidence({
          sourceKey: "firms",
          role: "supports",
          strength: "strong",
          shows: "ok",
          limits: "",
          frozenPayload: {},
        }),
        evidence({
          sourceKey: "satellite",
          role: "contradicts",
          strength: "strong",
          shows: "이전 영상에 이미 피해",
          limits: "",
          frozenPayload: {},
        }),
      ]),
      claim("occurrence", [
        evidence({
          sourceKey: "satellite",
          role: "supports",
          strength: "strong",
          shows: "ok",
          limits: "",
          frozenPayload: {},
        }),
      ]),
      claim("means", [], { mapCheckable: false }),
      claim("actor", [], { mapCheckable: false }),
    ];
    const refreshed = refreshCaseVerdicts({
      id: "x",
      article: { text: "t" },
      eventType: "strike",
      incident: emptyIncident(),
      claims,
      verdict: "unconfirmed",
      rev: 1,
    });
    expect(refreshed.claims.find((c) => c.kind === "time")?.verdict).toBe("refuted");
    expect(computeCaseVerdict(refreshed)).toBe("refuted");
  });

  it("ignores means/actor for case rollup", () => {
    const claims = [
      claim("place", [
        evidence({
          sourceKey: "satellite",
          role: "supports",
          strength: "strong",
          shows: "ok",
          limits: "",
          frozenPayload: {},
        }),
      ]),
      claim("time", [
        evidence({
          sourceKey: "firms",
          role: "supports",
          strength: "strong",
          shows: "ok",
          limits: "",
          frozenPayload: {},
        }),
      ]),
      claim("occurrence", [
        evidence({
          sourceKey: "satellite",
          role: "supports",
          strength: "strong",
          shows: "ok",
          limits: "",
          frozenPayload: {},
        }),
      ]),
      claim("means", [
        evidence({
          sourceKey: "official",
          role: "contradicts",
          strength: "strong",
          shows: "다른 수단 주장",
          limits: "",
          frozenPayload: {},
        }),
      ]),
    ];
    expect(computeCaseVerdict(refreshCaseVerdicts({
      id: "y",
      article: { text: "t" },
      eventType: "strike",
      incident: emptyIncident(),
      claims,
      verdict: "unconfirmed",
      rev: 1,
    }))).toBe("confirmed");
  });
});

describe("editor override", () => {
  it("effectiveVerdict uses override; refresh keeps override", () => {
    const c = claim(
      "place",
      [
        evidence({
          sourceKey: "firms",
          role: "supports",
          strength: "weak",
          shows: "약",
          limits: "",
          frozenPayload: {},
        }),
      ],
      {
        override: { verdict: "confirmed", reason: "현장 확인 영상 검수" },
      },
    );
    const refreshed = refreshCaseVerdicts({
      id: "z",
      article: { text: "t" },
      eventType: "other",
      incident: emptyIncident(),
      claims: [
        c,
        claim("time", [
          evidence({
            sourceKey: "firms",
            role: "supports",
            strength: "strong",
            shows: "t",
            limits: "",
            frozenPayload: {},
          }),
        ]),
        claim("occurrence", [
          evidence({
            sourceKey: "satellite",
            role: "supports",
            strength: "strong",
            shows: "o",
            limits: "",
            frozenPayload: {},
          }),
        ]),
      ],
      verdict: "unconfirmed",
      rev: 1,
    });
    const place = refreshed.claims.find((x) => x.kind === "place")!;
    expect(place.verdict).toBe("partial"); // 규칙
    expect(effectiveClaimVerdict(place)).toBe("confirmed"); // 편집자
    expect(refreshed.verdict).toBe("confirmed");
  });
});

describe("buildClaimTemplates", () => {
  it("seeds six claims for strike", () => {
    const claims = buildClaimTemplates("strike");
    expect(claims).toHaveLength(6);
    expect(claims.map((c) => c.kind)).toEqual([
      "place",
      "time",
      "occurrence",
      "damage",
      "means",
      "actor",
    ]);
    expect(claims.find((c) => c.kind === "actor")?.mapCheckable).toBe(false);
  });
});

describe("CaseFile shape smoke", () => {
  it("accepts a minimal case file", () => {
    const file: CaseFile = refreshCaseVerdicts({
      id: "case_min",
      article: { text: "hello" },
      eventType: "maritime",
      incident: emptyIncident(),
      claims: buildClaimTemplates("maritime"),
      verdict: "unconfirmed",
      rev: 1,
    });
    expect(file.verdict).toBe("unconfirmed");
    expect(file.claims.every((c) => c.verdict === "unconfirmed")).toBe(true);
  });
});
