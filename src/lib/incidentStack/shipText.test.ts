import { describe, expect, it } from "vitest";
import {
  extractVesselName,
  guessVesselKind,
  describeVessel,
  isUkmtoAttackType,
  looksLikeMerchantAttack,
  realVesselName,
} from "./shipText";

describe("상선 피격 판정", () => {
  it("상선 단어 + 피격 단어면 피격 사건", () => {
    expect(looksLikeMerchantAttack("Tanker hit by drone near Hormuz")).toBe(true);
    expect(looksLikeMerchantAttack("Container ship seized by IRGC boats")).toBe(true);
    expect(looksLikeMerchantAttack("호르무즈 인근 유조선 피격")).toBe(true);
    expect(looksLikeMerchantAttack("상선 나포, 선원 피랍")).toBe(true);
  });

  it("피격 단어가 없으면 일반 해운 소식", () => {
    expect(looksLikeMerchantAttack("Tanker transits Strait of Hormuz")).toBe(false);
    expect(looksLikeMerchantAttack("Cargo vessel arrives at Jeddah port")).toBe(false);
  });

  it("상선 단어가 없으면 육상·기타 공격", () => {
    expect(looksLikeMerchantAttack("Drone attack on oil depot")).toBe(false);
    expect(looksLikeMerchantAttack("Missile strike on village")).toBe(false);
  });

  it("군함 사건은 선박 사건에서 뺀다", () => {
    expect(looksLikeMerchantAttack("Destroyer attacked by drone, vessel damaged")).toBe(false);
    expect(looksLikeMerchantAttack("Warship hit by missile")).toBe(false);
    expect(looksLikeMerchantAttack("호위함 피격, 선박 손상")).toBe(false);
  });

  it("연습·제재는 피격이 아니다", () => {
    expect(looksLikeMerchantAttack("Naval exercise: vessels fire missiles in drill")).toBe(false);
    expect(looksLikeMerchantAttack("New sanctions on tanker network hit shipping")).toBe(false);
  });
});

describe("UKMTO 유형", () => {
  it("피습·나포만 통과, 경고는 뺀다", () => {
    expect(isUkmtoAttackType("Attack")).toBe(true);
    expect(isUkmtoAttackType("Hijack")).toBe(true);
    expect(isUkmtoAttackType("Boarding")).toBe(true);
    expect(isUkmtoAttackType("Advisory")).toBe(false);
    expect(isUkmtoAttackType("Suspicious Activity")).toBe(false);
    expect(isUkmtoAttackType(null)).toBe(false);
  });
});

describe("선박명 추출", () => {
  it("MV/MT 접두어 표기", () => {
    expect(extractVesselName("MV Rubymar hit by missile in Red Sea")).toBe("Rubymar");
    expect(extractVesselName("M/T Sounion on fire")).toBe("Sounion");
    expect(extractVesselName("Houthi attack on MT Front Altair near Hormuz")).toBe("Front Altair");
  });

  it("선종 단어 + 따옴표 이름", () => {
    expect(extractVesselName('Tanker "Sounion" attacked')).toBe("Sounion");
    expect(extractVesselName("유조선 '수니온' 피격")).toBe("수니온");
  });

  it("이름이 분명하지 않으면 뽑지 않는다", () => {
    expect(extractVesselName("A tanker was hit near Hormuz")).toBeNull();
    expect(extractVesselName("Vessel attacked off Yemen coast")).toBeNull();
    expect(extractVesselName("MV hit by missile")).toBeNull();
  });
});

describe("선종 추정", () => {
  it("텍스트에서 선종", () => {
    expect(guessVesselKind("oil tanker on fire")).toBe("tanker");
    expect(guessVesselKind("bulk carrier hit")).toBe("bulk");
    expect(guessVesselKind("container ship seized")).toBe("container");
    expect(guessVesselKind("cargo vessel damaged")).toBe("cargo");
    expect(guessVesselKind("boat attacked")).toBeNull();
  });
});

describe("UKMTO 비공개 선박명 (실제 응답의 값들)", () => {
  it("자리표시어는 이름이 아니다", () => {
    for (const v of [".", "MERCHANT", "TKR", "-", "tkr", "vessel", "Tanker", "Merchant", "TANKER", "", null, "N/A"]) {
      expect(realVesselName(v as string | null)).toBeNull();
    }
  });

  it("진짜 이름은 살린다", () => {
    expect(realVesselName("Rubymar")).toBe("Rubymar");
    expect(realVesselName(" Front Altair ")).toBe("Front Altair");
  });

  it("본문에서 선종·톤수를 읽는다 (실제 UKMTO 문장)", () => {
    const lng = describeVessel("A Master of an LNG Tanker has reported being approached by a small skiff", "Tanker");
    expect(lng).toMatchObject({ kind: "tanker", gas: true, tonnes: null });
    const box = describeVessel("A 19,000 tonne Container ship was struck by an unknown projectile", "Cargo");
    expect(box).toMatchObject({ kind: "container", gas: false, tonnes: 19000 });
    expect(describeVessel("A 50,000 tonne Container ship was struck").tonnes).toBe(50000);
    expect(describeVessel("a tanker was struck by an unknown projectile").kind).toBe("tanker");
  });
});
