import { afterEach, describe, expect, it, vi } from "vitest";
import {
  classifySecurity,
  dtgToIso,
  fetchModu,
  fetchMsi,
  fetchNavWarn,
  fetchNavWarnMemos,
  fetchPorts,
  parseDailyMemo,
} from "./msiNga";
import { ngaWarningsToNavareaCollection } from "./ngaMsi";

// MODU·WPI는 실응답의 특징을 반영(철거 설비 혼재, WPI 위경도 문자열).
// Daily Memo는 실제 파일 형식(DTG 줄 → 시리즈 번호 줄 → 해역명 → 번호 항목)을 본떠 만든 표본.
function jsonRes(body: unknown) {
  return new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } });
}
function textRes(body: string) {
  return new Response(body, { headers: { "content-type": "text/plain" } });
}
function htmlRes(status = 200) {
  return new Response("<html>Request Rejected</html>", {
    status,
    headers: { "content-type": "text/html" },
  });
}

const ONCE = { tries: 1, gapMs: 0 } as const;

const MEMO = `HYDROPAC WARNINGS IN FORCE AS OF 170600Z OCT 26
161621Z OCT 26
HYDROPAC 3013/26(11).
GULF OF OMAN.
OMAN.
1. MERCHANT VESSEL ATTACKED BY UAV
   IN 25-30.0N 057-10.0E.
2. CANCEL THIS MSG 301621Z OCT 26.
161000Z OCT 26
HYDROPAC 3014/26(12).
ARABIAN SEA.
1. MISSILE FIRING OPERATIONS 26-00.0N 058-00.0E.
2. CANCEL THIS MSG 171000Z OCT 26.
`;

afterEach(() => vi.unstubAllGlobals());

describe("NGA Daily Memo", () => {
  it("DTG를 ISO로 바꾼다", () => {
    expect(dtgToIso("161621Z OCT 26")).toBe("2026-10-16T16:21:00Z");
  });

  it("경보를 나누고 ngaMsi가 읽는 형태(navArea·4자리 연도·cancelDate)로 채운다", () => {
    const { asOf, warnings } = parseDailyMemo(MEMO);
    expect(asOf).toBe("170600Z OCT");
    expect(warnings).toHaveLength(2);
    expect(warnings[0]).toMatchObject({
      warningId: "HYDROPAC 3013/26",
      navArea: "HYDROPAC",
      msgNumber: 3013,
      msgYear: 2026,
      region: ["GULF OF OMAN", "OMAN"],
      issueDate: "161621Z OCT 2026",
      issuedAt: "2026-10-16T16:21:00Z",
      cancelDate: "2026-10-30T16:21:00Z",
    });
  });

  it("NAVAREA 시리즈는 로마 숫자 코드로 맞춘다", () => {
    const { warnings } = parseDailyMemo(`HEAD
161621Z OCT 26
NAVAREA IV 100/26.
1. RIG 19-23.0N 092-03.1W.
`);
    expect(warnings[0]!.navArea).toBe("IV");
  });

  it("보안 사건 분류 — 공격은 hostile, 사격 훈련은 제외, 단어 경계 지킴", () => {
    expect(classifySecurity("MERCHANT VESSEL ATTACKED BY UAV")).toBe("hostile");
    expect(classifySecurity("MISSILE FIRING OPERATIONS")).toBeNull();
    expect(classifySecurity("KEEP STARBOARD SIDE. DETERMINE POSITION.")).toBeNull();
    expect(classifySecurity("NAVAL MINES REPORTED. EXERCISE EXTREME CAUTION.")).toBe("mine");
  });

  it("media 목록에서 파일을 찾아 받고 경보를 지오메트리로 바꾼다", async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(
        jsonRes([{ s3Key: "k/DailyMemPAC.txt", filenameBase: "DailyMemPAC", lastModified: "2026-10-17" }]),
      )
      .mockResolvedValueOnce(textRes(MEMO));
    vi.stubGlobal("fetch", f);
    const fc = await fetchNavWarn(["HYDROPAC"], { ...ONCE, now: Date.parse("2026-10-18T00:00:00Z") });
    expect(fc.meta).toMatchObject({ source: "navWarn", count: 2 });
    expect((fc.features as { properties: { warningId: string; security: string } }[]).find((x) => x.properties.warningId === "HYDROPAC 3013/26")?.properties.security).toBe(
      "hostile",
    );
    expect(fc.meta.files.HYDROPAC).toMatchObject({ warnings: 2 });
  });

  it("7일보다 오래된 파일은 받지 않고, 그 리전은 경보도 만들지 않는다", async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(
        jsonRes([{ s3Key: "k", filenameBase: "DailyMemPAC", lastModified: "2026-03-10T00:00:00Z" }]),
      );
    vi.stubGlobal("fetch", f);
    const { warnings, files } = await fetchNavWarnMemos(["HYDROPAC"], {
      ...ONCE,
      now: Date.parse("2026-10-18T00:00:00Z"),
    });
    expect(warnings).toEqual([]);
    expect(files.HYDROPAC).toMatchObject({ stale: true });
    expect(f).toHaveBeenCalledTimes(1); // 목록만 요청, 파일 본문은 받지 않음
  });

  it("크론 어댑터: 경보가 D1 스냅샷용 리전·날짜로 바뀌고 취소 시각이 지난 건 빠진다", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(jsonRes([{ s3Key: "k", filenameBase: "DailyMemPAC", lastModified: "x" }]))
        .mockResolvedValueOnce(textRes(MEMO)),
    );
    const { warnings } = await fetchNavWarnMemos(["HYDROPAC"], ONCE);
    const fc = ngaWarningsToNavareaCollection(warnings, Date.parse("2026-10-18T00:00:00Z"));
    // 3014/26은 10-17 10:00에 취소 → 제외, 3013/26만 남는다
    expect(fc.features).toHaveLength(1);
    expect(fc.features[0]!.properties).toMatchObject({ region: "HYDROPAC", source: "nga" });
    expect((fc.features[0]!.properties as { date: string }).date).toBe("2026-10-16T16:21:00.000Z");
  });

  it("목록 요청이 WAF에 막히면 재시도 없이 실패로 알린다", async () => {
    const f = vi.fn(async () => htmlRes(200));
    vi.stubGlobal("fetch", f);
    await expect(fetchNavWarn(["HYDROPAC"], ONCE)).rejects.toThrow(/WAF rejected/);
    expect(f).toHaveBeenCalledTimes(1);
  });
});

describe("NGA MSI 수집기", () => {
  it("503 점검 페이지도 HTML이면 차단과 같이 취급", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => htmlRes(503)));
    await expect(fetchModu(false, ONCE)).rejects.toThrow(/WAF rejected/);
  });

  it("MODU: 기본은 철거된 설비를 빼고, 옵션으로 포함한다", async () => {
    const body = {
      modu: [
        { name: "RIG A", latitude: 26.5, longitude: 51.2, specialStatus: "Active" },
        { name: "RIG B", latitude: 26.6, longitude: 51.3, specialStatus: "Rig Removed" },
      ],
    };
    vi.stubGlobal("fetch", vi.fn(async () => jsonRes(body)));
    const kept = await fetchModu(false, ONCE);
    expect(kept.features.map((f) => f.id)).toEqual(["modu-RIG A"]);
    expect(kept.meta.skipped).toBe(1);
    const all = await fetchModu(true, ONCE);
    expect(all.features).toHaveLength(2);
  });

  it("WPI: latitude/longitude가 도분초 문자열이어도 ycoord/xcoord로 읽는다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonRes({
          ports: [
            {
              portNumber: 7,
              portName: "BANDAR ABBAS",
              latitude: "27°06'00\"N",
              longitude: "056°18'00\"E",
              ycoord: 27.1,
              xcoord: 56.3,
            },
          ],
        }),
      ),
    );
    const fc = await fetchPorts(ONCE);
    expect(fc.features).toHaveLength(1);
    expect(fc.features[0]!.geometry.coordinates).toEqual([56.3, 27.1]);
  });

  it("한꺼번에 돌릴 때 하나가 실패해도 나머지는 진행한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(htmlRes(200)) // navWarn 차단
        .mockResolvedValueOnce(jsonRes({ modu: [{ name: "RIG A", latitude: 1, longitude: 2 }] })),
    );
    const { data, errors } = await fetchMsi(["navWarn", "modu"], ONCE);
    expect(errors.navWarn).toMatch(/WAF rejected/);
    expect(data.modu?.meta.count).toBe(1);
  });
});
