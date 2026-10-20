/**
 * 확전 신호 픽스처 테스트.
 *
 * ── 이 테스트가 하는 일 ────────────────────────────────────────────
 *
 * 확전 감지는 **오탐이 곧 뇌피셜**이다. 평범한 전선 교전을 "확전 신호"로
 * 올리는 순간 시스템이 공포를 조장하는 기계가 된다.
 * 그래서 양성 픽스처보다 **음성 대조군이 더 중요하다.**
 *
 * 픽스처는 실제로 보도된 사건 유형을 본뜬 것이다. 특정 기사 원문이 아니라
 * 그 사건 유형의 전형적 헤드라인 형태를 쓴다.
 *
 * ⚠️ 정규식이나 가중치를 바꾸면 **반드시 전체를 다시 돌릴 것.**
 *    초기 구현은 정규식이 실제 헤드라인 어순을 못 받아
 *    대표 사건 6개를 통째로 놓쳤다.
 */
import { describe, expect, it } from "vitest";
import {
  ESCALATION_SHOW_THRESHOLD,
  formatFactors,
  scoreEscalation,
  shouldFlash,
} from "@/lib/escalationSignals";

// ─────────────────────────────────────────────────────────────────────
//  양성 — 2차 문헌 검토로 추가된 임계선
// ─────────────────────────────────────────────────────────────────────

describe("확전 신호 — 비키네틱·법적 임계선", () => {
  it("외교공관 피격 (다마스쿠스 유형)", () => {
    // 사상자 16명의 '작은' 사건이 이란–이스라엘 직접 교전을 촉발했다.
    // 초기 구현은 이 사건에 0점을 줬다.
    const s = scoreEscalation({
      title:
        "Israeli airstrike destroyed the Iranian consulate building in Damascus, killing IRGC officers",
      summary: "Iran vowed to retaliate for the strike on its diplomatic mission.",
      theater: "middle-east",
    });
    expect(s).not.toBeNull();
    expect(s!.pattern).toBe("diplomatic-breach");
    expect(s!.thresholds).toContain("diplomatic-premises");
  });

  it("해저 파이프라인 파괴 (노르트스트림 유형)", () => {
    const s = scoreEscalation({
      title: "Nord Stream pipelines ruptured by suspected sabotage in the Baltic Sea",
      summary: "Sweden and Denmark reported underwater explosions.",
      theater: "russia-ukraine",
    });
    expect(s).not.toBeNull();
    expect(s!.thresholds).toContain("undersea-infrastructure");
  });

  it("해저 케이블 절단 — 주어와 동사 사이 수식구가 길어도 잡는다", () => {
    const s = scoreEscalation({
      title:
        "Undersea cable between Finland and Estonia was severed; Helsinki suspects anchor dragging",
      summary: "Finnish police opened a sabotage investigation.",
      theater: "russia-ukraine",
    });
    expect(s).not.toBeNull();
    expect(s!.thresholds).toContain("undersea-infrastructure");
    expect(s!.perimeter.map((p) => p.iso2)).toEqual(
      expect.arrayContaining(["FI", "EE"]),
    );
  });

  it("핵 교리 변경 — 물리적 교전 없이도 수직 확전", () => {
    const s = scoreEscalation({
      title: "Russia announced changes to its nuclear doctrine, lowering the threshold for use",
      summary: "Moscow said the revision responds to Western missile decisions.",
      theater: "russia-ukraine",
    });
    expect(s).not.toBeNull();
    expect(s!.thresholds).toContain("nuclear-signaling");
    expect(s!.dimension).toBe("vertical");
  });

  it("전술핵 이동", () => {
    const s = scoreEscalation({
      title: "Tactical nuclear weapons deployed to Belarus, Minsk confirms",
      theater: "russia-ukraine",
    });
    expect(s).not.toBeNull();
    expect(s!.thresholds).toContain("nuclear-signaling");
  });

  it("핵심 인프라 사이버 — 조약 영토 임계선도 함께 붙는다", () => {
    // NATO 2022 전략개념: 개별·누적 사이버가 5조 임계에 도달 가능
    const s = scoreEscalation({
      title: "Cyberattack targeting the power grid left parts of Poland without electricity",
      summary: "Warsaw said it was investigating the origin.",
      theater: "russia-ukraine",
    });
    expect(s).not.toBeNull();
    expect(s!.thresholds).toContain("cyber-critical-infrastructure");
    expect(s!.thresholds).toContain("treaty-territory");
  });

  it("GPS 재밍 (연성 킬)", () => {
    const s = scoreEscalation({
      title: "GPS jamming disrupted civil aviation over the Baltic, Estonia says",
      theater: "russia-ukraine",
    });
    expect(s).not.toBeNull();
    expect(s!.thresholds).toContain("counterspace");
  });

  it("조기경보 레이더 피격 — 문헌상 최고 위험 경로", () => {
    // Acton 2018: 재래식 타격이 이중용도 C3I 를 건드리면
    // '오인된 경보'를 통해 비의도적 핵 확전으로 이어질 수 있다
    const s = scoreEscalation({
      title: "Drone strike hit an early-warning radar site in southern Russia",
      summary: "The radar is part of the ballistic missile early warning network.",
      theater: "russia-ukraine",
    });
    expect(s).not.toBeNull();
    expect(s!.pattern).toBe("c3i-entanglement");
    expect(s!.thresholds).toContain("c3i-early-warning");
  });

  it("봉쇄와 임검·나포를 구분한다", () => {
    // 국제법상 다른 제도다 — 봉쇄는 교전 행위, 나포는 별개
    const s = scoreEscalation({
      title: "Iran seized a tanker and threatened to close the Strait of Hormuz",
      theater: "middle-east",
    });
    expect(s).not.toBeNull();
    expect(s!.thresholds).toContain("blockade-declared");
    expect(s!.thresholds).toContain("maritime-interdiction");
  });

  it("지도부 표적 타격", () => {
    const s = scoreEscalation({
      title: "Airstrike killed the IRGC commander in Beirut, Iranian media says",
      summary: "Tehran vowed retaliation.",
      theater: "middle-east",
    });
    expect(s).not.toBeNull();
    expect(s!.pattern).toBe("leadership-strike");
    expect(s!.thresholds).toContain("leadership-targeting");
  });
});

// ─────────────────────────────────────────────────────────────────────
//  양성 — 영토·무기·전장 축
// ─────────────────────────────────────────────────────────────────────

describe("확전 신호 — 영토·무기·전장", () => {
  it("주변국 유출: 러시아 드론이 루마니아 영공에", () => {
    const s = scoreEscalation({
      title: "Russian drone violated Romanian airspace, Bucharest says jets scrambled",
      summary:
        "Romania said a Russian drone entered its airspace during an attack on Ukrainian Danube ports.",
      theater: "russia-ukraine",
    });
    expect(s).not.toBeNull();
    expect(s!.pattern).toBe("perimeter-spillover");
    expect(s!.dimension).toBe("horizontal");
    expect(s!.thresholds).toContain("sovereign-territory");
    expect(s!.thresholds).toContain("treaty-territory");
    expect(s!.flanks).toContain("atlantic-flank");
  });

  it("경계국 경보: 폴란드 공습경보", () => {
    const s = scoreEscalation({
      title: "Poland issues air raid alert and closes airspace near Ukrainian border",
      summary: "Polish authorities issued an air raid alert for southeastern regions.",
      theater: "russia-ukraine",
    });
    expect(s).not.toBeNull();
    expect(s!.perimeter.map((p) => p.iso2)).toContain("PL");
  });

  it("교차 전장: 카스피해 이란 무인기 격추", () => {
    const s = scoreEscalation({
      title: "Ukraine says it shot down an Iranian-made drone over the Caspian Sea",
      summary: "Iran denied involvement; both sides later moved to de-escalate.",
      theater: "russia-ukraine",
    });
    expect(s).not.toBeNull();
    expect(s!.pattern).toBe("cross-theater");
    expect(s!.theaters).toEqual(
      expect.arrayContaining(["russia-ukraine", "middle-east"]),
    );
    expect(s!.contagion).toContain("arms-transfer");
    expect(s!.factors.some((f) => f.code === "cross-theater-engagement")).toBe(true);
  });

  it("수직 확전: 중거리탄도 첫 사용", () => {
    const s = scoreEscalation({
      title:
        "Russia used an intermediate-range ballistic missile against Ukraine for the first time",
      summary: "The strike hit an industrial facility in Dnipro.",
      theater: "russia-ukraine",
    });
    expect(s).not.toBeNull();
    expect(s!.pattern).toBe("capability-threshold");
    expect(s!.dimension).toBe("vertical");
  });

  it("인도태평양도 같은 규칙 (대칭 원칙)", () => {
    const s = scoreEscalation({
      title: "Japan scrambled jets after Chinese drone entered airspace near Okinawa",
      summary: "Tokyo said the aircraft violated Japanese airspace.",
      theater: "china-taiwan",
    });
    expect(s).not.toBeNull();
    expect(s!.flanks).toContain("indo-pacific-flank");
    expect(s!.thresholds).toContain("sovereign-territory");
  });

  it("원자력 시설 피격 — 표적 종류의 확대", () => {
    const s = scoreEscalation({
      title: "Shelling struck the Zaporizhzhia nuclear power plant site, IAEA says",
      summary: "Debris fell near a reactor building.",
      theater: "russia-ukraine",
    });
    expect(s).not.toBeNull();
    expect(s!.pattern).toBe("protected-target");
    expect(s!.dimension).toBe("vertical");
  });
});

// ─────────────────────────────────────────────────────────────────────
//  음성 — 여기가 더 중요하다
// ─────────────────────────────────────────────────────────────────────

describe("확전 신호 — 걸러져야 하는 것", () => {
  it("전선 안 포격은 규모가 커도 신호가 아니다", () => {
    // RAND 정의의 핵심: 확전은 크기가 아니라 임계선이다
    expect(
      scoreEscalation({
        title: "Heavy Russian shelling continues in Donetsk region",
        summary: "Ukrainian forces reported dozens of artillery strikes along the front line.",
        theater: "russia-ukraine",
      }),
    ).toBeNull();
  });

  it("전장 하나 안의 대규모 미사일 공격도 아니다", () => {
    expect(
      scoreEscalation({
        title: "Russia launched 80 missiles at Ukrainian energy infrastructure overnight",
        summary: "Air defences intercepted most of them.",
        theater: "russia-ukraine",
      }),
    ).toBeNull();
  });

  it("전문가 전망 기사는 감점되어 탈락 (남의 뇌피셜 증폭 금지)", () => {
    expect(
      scoreEscalation({
        title: "Analysts warn Russian drones could trigger a NATO Article 5 crisis in Poland",
        summary: "Experts say the risk of war between NATO and Russia might grow.",
        theater: "russia-ukraine",
      }),
    ).toBeNull();
  });

  it("'핵 수사' 논평은 핵 신호가 아니다", () => {
    // NUCLEAR_SIGNALING_RE 에서 rhetoric/threat 을 일부러 뺀 이유
    expect(
      scoreEscalation({
        title: "Nuclear rhetoric has intensified, analysts say",
        summary: "Experts warn of escalation.",
      }),
    ).toBeNull();
  });

  it("성명·규탄만 있고 물리적 사건이 없으면 탈락", () => {
    expect(
      scoreEscalation({
        title: "Poland summons Russian ambassador over border tensions",
        summary: "The foreign ministry issued a strongly worded condemnation.",
        theater: "russia-ukraine",
      }),
    ).toBeNull();
  });

  it("대사관 '방문' 은 피격이 아니다", () => {
    expect(
      scoreEscalation({
        title: "Foreign minister visited the embassy in Warsaw to discuss cooperation",
        theater: "russia-ukraine",
      }),
    ).toBeNull();
  });

  it("인프라와 무관한 해킹은 사이버 임계선이 아니다", () => {
    expect(
      scoreEscalation({
        title: "Hackers stole customer data from a retail company",
        summary: "No infrastructure was affected.",
      }),
    ).toBeNull();
  });

  it("연성 뉴스는 점수 계산조차 하지 않는다", () => {
    expect(
      scoreEscalation({
        title: "Documentary about the Ukraine war wins award at film festival",
      }),
    ).toBeNull();
  });

  it("대만 기사에서 대만은 유출로 세지 않는다 (이중계상 방지)", () => {
    const s = scoreEscalation({
      title: "Chinese aircraft crossed the Taiwan Strait median line, Taipei says",
      theater: "china-taiwan",
    });
    if (s) expect(s.perimeter.map((p) => p.iso2)).not.toContain("TW");
  });

  it("빈 입력은 안전하게 null", () => {
    expect(scoreEscalation({ title: "" })).toBeNull();
    expect(scoreEscalation({ title: "   ", summary: "  " })).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────
//  근거 공개 — 뇌피셜 방지의 핵심 장치
// ─────────────────────────────────────────────────────────────────────

describe("판정 근거 공개", () => {
  const signal = scoreEscalation({
    title: "Russian drone violated Romanian airspace, Bucharest says jets scrambled",
    summary: "Romania said a Russian drone entered its airspace.",
    theater: "russia-ukraine",
  })!;

  it("임계선·전이 항목은 근거 문자열과 문헌 근거를 모두 갖는다", () => {
    for (const f of signal.factors) {
      expect(f.labelKo.length, f.code).toBeGreaterThan(0);
      expect(f.labelEn.length, f.code).toBeGreaterThan(0);
      if (f.code.startsWith("threshold:") || f.code.startsWith("contagion:")) {
        expect(f.evidence, `${f.code} 에 근거 문자열 없음`).toBeTruthy();
        expect(f.basisKo, `${f.code} 에 문헌 근거 없음`).toBeTruthy();
      }
    }
  });

  it("점수 분해 합이 총점과 일치한다", () => {
    expect(signal.factors.reduce((s, f) => s + f.points, 0)).toBe(signal.score);
  });

  it("formatFactors 가 총점 줄로 끝난다", () => {
    const lines = formatFactors(signal, "ko");
    expect(lines.at(-1)).toContain(`= ${signal.score}점`);
  });

  it("헤드라인은 항상 '(보도)' 로 끝난다 — 확인이 아니라 보도다", () => {
    expect(signal.headlineKo).toMatch(/\(보도\)$/);
    expect(signal.headlineEn).toMatch(/\(reported\)$/);
  });

  it("의도·확전을 단정하는 표현이 헤드라인에 없다", () => {
    expect(signal.headlineKo).not.toMatch(
      /확전|전쟁\s?임박|3차대전|합쳐|발동될|의도적으로|고의/,
    );
  });

  it("사고성 보도 표현은 기록하되 점수에 영향을 주지 않는다", () => {
    // 의도 추정으로 점수를 움직이면 안 된다 — 보도로는 의도를 알 수 없다
    const base = {
      title: "Russian drone violated Romanian airspace",
      summary: "Romania said a drone entered its airspace.",
      theater: "russia-ukraine" as const,
    };
    const plain = scoreEscalation(base)!;
    const stray = scoreEscalation({
      ...base,
      summary: `${base.summary} The drone appeared to have strayed off course.`,
    })!;
    expect(stray.reportedAsStray).toBe(true);
    expect(plain.reportedAsStray).toBe(false);
    expect(stray.score).toBe(plain.score);
  });
});

describe("임계값", () => {
  it("반환된 신호는 항상 노출 임계 이상", () => {
    const s = scoreEscalation({
      title: "Russian drone violated Romanian airspace",
      theater: "russia-ukraine",
    });
    if (s) expect(s.score).toBeGreaterThanOrEqual(ESCALATION_SHOW_THRESHOLD);
  });

  it("동시 활성 전장 가점은 hotTheaters 가 있을 때만", () => {
    const base = {
      title: "Ukraine says it shot down an Iranian-made Shahed drone over the Caspian Sea",
      theater: "russia-ukraine" as const,
    };
    const cold = scoreEscalation(base)!;
    const hot = scoreEscalation({
      ...base,
      hotTheaters: ["russia-ukraine", "middle-east"],
    })!;
    expect(hot.score).toBeGreaterThan(cold.score);
    expect(hot.factors.some((f) => f.code === "both-hot")).toBe(true);
    expect(cold.factors.some((f) => f.code === "both-hot")).toBe(false);
  });

  it("shouldFlash 는 강한 신호에서만 참", () => {
    const strong = scoreEscalation({
      title:
        "Russian drone violated Romanian airspace; Bucharest scrambled jets as Shahed debris fell near the Danube",
      summary: "Romania said the Iranian-made drone entered its airspace.",
      theater: "russia-ukraine",
      hotTheaters: ["russia-ukraine", "middle-east"],
    });
    expect(strong).not.toBeNull();
    expect(shouldFlash(strong!)).toBe(true);
  });
});
