import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { evaluateGate } from "@/lib/intelContract/gate";
import type { EvidenceBundle } from "@/lib/intelContract/types";

/**
 * 가격 outcome → gate 입력 의존 방향 차단.
 * straitReplay 모듈이 evaluateGate / EvidenceBundle.observations 에 흘러가지 않는지 검사.
 */
describe("strait replay outcome vs gate isolation", () => {
  it("evaluateGate ignores price-like fields not in observations", () => {
    const bundle: EvidenceBundle = {
      bundleId: "iso-test",
      kind: "indicator",
      titleKo: "t",
      titleEn: "t",
      observations: [
        {
          id: "o1",
          modality: "stat",
          sourceKey: "portwatch",
          occurredAt: "2023-05-03T00:00:00.000Z",
          payloadRef: "traffic",
          label: "transit",
        },
      ],
      independenceCount: 1,
      modalityCount: 1,
      timeSpanMs: 0,
      geoOk: true,
      method: "test",
      disconfirmLog: { queried: true, hitCount: 0 },
      killCriteria: [],
    };
    const result = evaluateGate(bundle);
    expect(result).toBeTruthy();
    // outcome 필드를 bundle에 억지로 넣어도 Observation 타입이 아니므로 gate 입력과 무관
    const polluted = {
      ...bundle,
      priceOutcomeDeltaPct: -12,
      outcomes: [{ metric: "BZ", deltaPct: 9 }],
    } as EvidenceBundle & { priceOutcomeDeltaPct: number };
    const again = evaluateGate(polluted);
    expect(again.grade).toBe(result.grade);
  });

  it("gate.ts and adapters do not import straitReplay outcome modules", () => {
    const root = path.join(process.cwd(), "src", "lib", "intelContract");
    const files = [
      "gate.ts",
      "adapters/fromEconomyAlert.ts",
      "adapters/fromConflictCluster.ts",
    ];
    for (const rel of files) {
      const src = readFileSync(path.join(root, rel), "utf8");
      expect(src).not.toMatch(/straitReplay|eventOutcome|fredDaily/);
    }
  });
});
