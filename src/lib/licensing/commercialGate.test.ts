/**
 * 상업 라이선스 게이트 회귀 테스트.
 *
 * 유료화는 **레이어 하나만 잘못 섞여도 계약 위반**이다:
 *   adsb.fi  "for personal, non-commercial use only"
 *   ACLED    "Commercial entities may not access or use the Content
 *             without first obtaining a corporate license"
 *
 * 레이어가 64개고 계속 늘어난다. 사람 기억에 맡길 수 없다.
 */
import { describe, expect, it } from "vitest";
import { NEWS_LAYER_SOURCE_CATALOG } from "@/data/sourceCatalog";
import {
  canShowInPaidTier,
  canShowInTier,
  commercialSafeLayerIds,
  isCommercialSafe,
  licensableLayerIds,
  paidTierBlockers,
  unverifiedLayerIds,
} from "@/lib/licensing/commercialGate";

describe("commercialGate — 카탈로그 무결성", () => {
  it("모든 레이어에 commercialUse 가 지정돼 있다", () => {
    const missing = NEWS_LAYER_SOURCE_CATALOG.filter((n) => !n.commercialUse).map(
      (n) => n.layerId,
    );
    expect(
      missing,
      "새 레이어는 상업 이용 가부를 반드시 판단할 것. 모르면 \"unknown\".",
    ).toEqual([]);
  });

  it("allowed 가 아니면 사유를 남긴다", () => {
    const noReason = NEWS_LAYER_SOURCE_CATALOG.filter(
      (n) => n.commercialUse !== "allowed" && !n.commercialNote,
    ).map((n) => n.layerId);
    expect(noReason).toEqual([]);
  });
});

describe("commercialGate — 유료 티어 차단", () => {
  it("unknown 은 유료 티어에서 막힌다 (미확인 ≠ 안전)", () => {
    expect(isCommercialSafe("unknown")).toBe(false);
    for (const id of unverifiedLayerIds()) {
      expect(canShowInPaidTier(id), `${id} 가 유료에 노출됨`).toBe(false);
    }
  });

  it("prohibited 는 유료 티어에서 막힌다", () => {
    const prohibited = NEWS_LAYER_SOURCE_CATALOG.filter(
      (n) => n.commercialUse === "prohibited",
    );
    expect(prohibited.length).toBeGreaterThan(0);
    for (const n of prohibited) {
      expect(canShowInPaidTier(n.layerId), `${n.layerId}`).toBe(false);
    }
  });

  it("license-required 는 라이선스 취득 전까지 막힌다", () => {
    for (const id of licensableLayerIds()) {
      expect(canShowInPaidTier(id), `${id}`).toBe(false);
    }
  });

  it("카탈로그에 없는 레이어는 막힌다 (fail-closed)", () => {
    expect(canShowInPaidTier("존재하지-않는-레이어")).toBe(false);
  });

  it("blocked 레이어는 무료·유료 모두에서 막힌다", () => {
    const blocked = NEWS_LAYER_SOURCE_CATALOG.filter((n) => n.status === "blocked");
    for (const n of blocked) {
      expect(canShowInTier(n.layerId, "free"), `${n.layerId} free`).toBe(false);
      expect(canShowInTier(n.layerId, "paid"), `${n.layerId} paid`).toBe(false);
    }
  });

  it("무료 티어는 라이선스 조건만 지키면 통과한다", () => {
    // 상업 제한이 있어도 무료 열람은 가능하다 — 그게 NC 라이선스의 취지다
    const restricted = NEWS_LAYER_SOURCE_CATALOG.find(
      (n) => n.commercialUse === "prohibited" && n.status === "shipped",
    );
    expect(restricted).toBeTruthy();
    expect(canShowInTier(restricted!.layerId, "free")).toBe(true);
    expect(canShowInTier(restricted!.layerId, "paid")).toBe(false);
  });
});

describe("commercialGate — 알려진 위험 소스", () => {
  it("adsb.fi 를 쓰는 레이어는 상업 이용 불가로 표시돼 있다", () => {
    // "for personal, non-commercial use only. You may not license, sell,
    //  rent, or lease any part of the data or the service."
    for (const id of ["military-activity", "air-traffic"]) {
      const note = NEWS_LAYER_SOURCE_CATALOG.find((n) => n.layerId === id);
      expect(note, id).toBeTruthy();
      expect(note!.commercialUse, `${id} 는 adsb.fi 폴백을 포함한다`).toBe("prohibited");
      expect(note!.commercialNote).toMatch(/adsb\.fi/);
    }
  });

  it("ACLED 기반 레이어는 상업 이용 불가로 표시돼 있다", () => {
    const note = NEWS_LAYER_SOURCE_CATALOG.find(
      (n) => n.layerId === "hapi-conflict-casualties",
    );
    expect(note).toBeTruthy();
    expect(note!.commercialUse).toBe("prohibited");
    expect(note!.commercialNote).toMatch(/ACLED/);
  });
});

describe("commercialGate — 유료 가능 자산", () => {
  it("상업 가능 레이어가 충분히 남는다", () => {
    // 유료 상품을 만들 수 있을 만큼은 있어야 한다
    expect(commercialSafeLayerIds().length).toBeGreaterThan(30);
  });

  it("핵심 지경학 자산은 상업 이용이 가능하다", () => {
    // GEM(CC BY)·OSM(ODbL)·GDELT — 유료 상품의 뼈대
    for (const id of [
      "oil-pipelines",
      "gas-pipelines",
      "lng-terminals",
      "critical-nodes",
      "economic-centers",
      "military-bases",
    ]) {
      expect(canShowInPaidTier(id), `${id} 가 유료에서 막힘`).toBe(true);
    }
  });

  it("자체 제작 자산은 당연히 상업 이용 가능하다", () => {
    // 우리 저작물 — 이게 유료화의 핵심 근거다
    expect(canShowInPaidTier("escalation-signals")).toBe(true);
    expect(canShowInPaidTier("resource-deposits")).toBe(true);
    expect(canShowInPaidTier("tunnels")).toBe(true);
  });

  it("차단 목록이 사유와 함께 나온다", () => {
    const blockers = paidTierBlockers();
    expect(blockers.length).toBeGreaterThan(0);
    for (const b of blockers) {
      expect(b.reason, `${b.layerId} 사유 없음`).not.toBe("사유 미기재");
      expect(b.reason.length).toBeGreaterThan(10);
    }
  });
});
