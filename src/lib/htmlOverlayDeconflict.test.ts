import { describe, expect, it } from "vitest";
import { deconflictTheaterHtmlOverlays } from "@/lib/htmlOverlayDeconflict";

type M = { markerId: string; displayKind?: string; lat: number; lng: number };

const at = (markerId: string, displayKind: string, lat: number, lng: number): M => ({
  markerId,
  displayKind,
  lat,
  lng,
});

describe("deconflictTheaterHtmlOverlays", () => {
  it("서로 먼 마커는 건드리지 않는다", () => {
    const input = [
      at("a", "casualty-skull", 50, 30),
      at("b", "situation-callout", 10, 10),
    ];
    const out = deconflictTheaterHtmlOverlays(input);
    expect(out[0]).toBe(input[0]);
    expect(out[1]).toBe(input[1]);
  });

  it("가까운 다른 종류는 종류별 오프셋만큼 밀린다", () => {
    const input = [
      at("a", "casualty-skull", 50, 30),
      at("b", "situation-callout", 50.05, 30.05),
    ];
    const out = deconflictTheaterHtmlOverlays(input);
    // casualty-skull은 실좌표 유지(오프셋 0)
    expect(out[0].lat).toBeCloseTo(50, 6);
    expect(out[0].lng).toBeCloseTo(30, 6);
    // situation-callout은 북서쪽
    expect(out[1].lat).toBeCloseTo(50.05 + 0.22, 6);
    expect(out[1].lng).toBeCloseTo(30.05 - 0.18, 6);
  });

  it("같은 종류끼리 겹쳐도 밀지 않는다", () => {
    const input = [
      at("a", "situation-callout", 50, 30),
      at("b", "situation-callout", 50.01, 30.01),
    ];
    const out = deconflictTheaterHtmlOverlays(input);
    expect(out[0]).toBe(input[0]);
    expect(out[1]).toBe(input[1]);
  });

  it("대상 종류가 아니면 무시한다", () => {
    const input = [at("a", "ais-html", 50, 30), at("b", "mil-html", 50.01, 30.01)];
    const out = deconflictTheaterHtmlOverlays(input);
    expect(out).toBe(input);
  });

  /**
   * 성능 계약 — 이게 깨지면 전 마커가 React에서 재조정된다.
   * 회귀 시 지도 렉의 직접 원인이 되므로 반드시 유지할 것.
   */
  it("밀리지 않은 마커는 객체 참조가 유지된다", () => {
    const input = [
      at("skull", "casualty-skull", 50, 30),
      at("callout", "situation-callout", 50.05, 30.05),
      // 아래는 전혀 무관한 위치의 마커들
      ...Array.from({ length: 200 }, (_, i) =>
        at(`bulk-${i}`, "ais-html", -40 + i * 0.01, 120),
      ),
    ];
    const out = deconflictTheaterHtmlOverlays(input);

    // 밀린 건 callout 하나뿐
    expect(out[1]).not.toBe(input[1]);
    // 나머지 201개는 전부 같은 참조여야 한다
    expect(out[0]).toBe(input[0]);
    for (let i = 2; i < input.length; i += 1) {
      expect(out[i]).toBe(input[i]);
    }
  });

  it("밀 대상이 없으면 배열 자체를 그대로 돌려준다", () => {
    const input = [
      at("a", "casualty-skull", 0, 0),
      at("b", "casualty-skull", 0.01, 0.01),
    ];
    expect(deconflictTheaterHtmlOverlays(input)).toBe(input);
  });

  /** 격자 해시가 셀 경계를 넘는 근접 쌍을 놓치지 않는지 */
  it("격자 셀 경계를 사이에 둔 근접 쌍도 감지한다", () => {
    // MIN_SEP_DEG = 0.28 → 0.28 배수가 셀 경계
    const input = [
      at("a", "casualty-skull", 0.279, 0.279),
      at("b", "news-stream-neon", 0.281, 0.281),
    ];
    const out = deconflictTheaterHtmlOverlays(input);
    // news-stream-neon은 남동쪽으로 밀린다
    expect(out[1].lat).toBeCloseTo(0.281 - 0.16, 6);
    expect(out[1].lng).toBeCloseTo(0.281 + 0.2, 6);
  });

  it("위도 상한을 넘지 않는다", () => {
    const input = [
      at("a", "casualty-skull", 84.95, 10),
      at("b", "situation-callout", 84.96, 10.01),
    ];
    const out = deconflictTheaterHtmlOverlays(input);
    expect(out[1].lat).toBeLessThanOrEqual(85);
  });
});
