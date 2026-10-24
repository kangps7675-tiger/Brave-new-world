/** Korean limit lines from the strike matcher, for English UI. */
export function strikeLimitEn(ko: string): string {
  if (ko.startsWith("AIS 위치 이력 수집 전")) return "AIS history not collected yet — this incident cannot be checked on tracks";
  const from = ko.match(/^AIS 위치 이력은 (.+)부터/);
  if (from) return `AIS history starts ${from[1]} — earlier incidents have no tracks`;
  if (ko.startsWith("선명은 기사")) {
    return ko
      .replace(/^선명은 기사 (.+)곳 보도 \+ AIS 위치 검증/, "Name from $1 press reports, checked against AIS position")
      .replace(" — UKMTO 는 선명을 공개하지 않음", " — UKMTO did not publish a name");
  }
  const names = ko.match(/^기사마다 다른 선명\((.+)\)이 검증돼/);
  if (names) return `Press reports verified different names (${names[1]}) — not choosing one`;
  if (ko.startsWith("Datalastic 보강 실패")) return ko.replace("Datalastic 보강 실패:", "Datalastic enrich failed:");
  if (ko.includes("사건 주변에 AIS 기록이 없음")) return "No AIS record around the incident — a reception gap is possible (not “no ship was there”)";
  if (ko.startsWith("경보에 선명이 없어")) return "The alert has no ship name, so “confirmed” is not possible — judgement is from tracks only";
  if (ko.includes("IMO 미수신")) return "Top candidate has no IMO — identified by MMSI only";
  return ko;
}
