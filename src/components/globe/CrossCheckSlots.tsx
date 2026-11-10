"use client";

import { useEffect, useState } from "react";
import type { AisVessel, FirmsFire, MilitaryAircraft } from "@/data/geoTypes";
import type { StackItem } from "@/lib/incidentStack/build";
import type { TelegramAlert } from "@/lib/telegramAlerts";
import {
  checkSlots,
  type CheckPlace,
  type CheckResult,
  type CheckSlot,
} from "@/lib/crossCheck/incidentSlots";
import { loadFrontMap, loadStrikeOriginals, type FrontMap, type SensorHit, type StatementPost, type TrackFix } from "@/lib/crossCheck/witnessFeeds";
import { relatedReports } from "@/lib/crossCheck/relatedReports";

const RESULT_LABEL: Record<CheckResult, { ko: string; en: string }> = {
  original: { ko: "원문", en: "Original" },
  match: { ko: "맞음", en: "Agrees" },
  conflict: { ko: "어긋남", en: "Conflicts" },
  silent: { ko: "언급 없음", en: "Not mentioned" },
  thin: { ko: "얇음", en: "Thin" },
};

const WITNESS_NAME: Record<CheckPlace, { ko: string; en: string }> = {
  ship: { ko: "AIS", en: "AIS" },
  strike: { ko: "경보·열·항적", en: "Alert, heat, track" },
  posture: { ko: "성명", en: "Statement" },
  front: { ko: "전선 기록", en: "Front record" },
  exercise: { ko: "훈련 발표", en: "Exercise notice" },
  charge: { ko: "기소·체포", en: "Charge" },
  closure: { ko: "폐쇄·항의", en: "Closure or protest" },
};

function note(slot: CheckSlot, en: boolean): string {
  if (slot.id === "witness") {
    if (slot.place === "ship") {
      if (slot.result === "match") {
        const km = slot.distanceKm != null ? `${Math.round(slot.distanceKm)}km` : "";
        return en
          ? `${slot.observedName ?? slot.vesselName ?? "That ship"} was within ${km || "reach"} then. This only says the ship was there.`
          : `${slot.observedName ?? slot.vesselName ?? "그 배"}가 그때 ${km ? `${km} 안` : "그 근처"}에 있었습니다. 맞았는지는 이 위치가 말하지 않습니다.`;
      }
      if (slot.result === "conflict") {
        const km = slot.distanceKm != null ? `${Math.round(slot.distanceKm)}km` : "";
        return en
          ? `${slot.observedName ?? "That name"} was ${km ? `${km} away` : "elsewhere"}. The positions do not agree.`
          : `${slot.observedName ?? "그 이름"}은 그때 ${km ? `${km} 밖` : "다른 곳"}에 있었습니다. 위치가 어긋납니다.`;
      }
      if (slot.nearby) {
        return en
          ? "Ships were nearby, but the report names none, so this is not that ship."
          : "근처에 배가 보이나, 원문에 선박명이 없어 그 배인지는 모릅니다.";
      }
      if (slot.vesselName && slot.result === "silent") {
        return en
          ? "That name is not in the positions we hold. A reception gap is possible."
          : "받아 둔 선박 위치에 그 이름이 없습니다. 수신이 빈 것일 수 있습니다.";
      }
      return slot.vesselName
        ? en
          ? "The name is written down. This row does not yet have a position check."
          : "선명은 적혀 있습니다. 위치 대조 결과는 이 칸에 아직 없습니다."
        : en
          ? "The original names no ship, so this row was not opened."
          : "원문에 선박명이 없어 위치 대조를 열지 않았습니다.";
    }
    if (slot.place === "strike") {
      if (slot.result === "match" && slot.sensor === "heat") {
        return en
          ? "Heat was recorded nearby then. Heat is not itself a strike."
          : "그 시각 그 근처에 열이 있었습니다. 열이 곧 피격은 아닙니다.";
      }
      if (slot.result === "match" && slot.sensor === "alert") {
        return en
          ? "An alert was up nearby then. An alert is not itself a strike."
          : "그 시각 그 근처에 경보가 있었습니다. 경보가 곧 피격은 아닙니다.";
      }
      if (slot.result === "match" && slot.sensor === "track") {
        return en
          ? "A military aircraft was nearby then. That does not say it attacked."
          : "그 시각 그 근처에 군용기가 있었습니다. 공격했다는 뜻은 아닙니다.";
      }
      if (slot.result === "match" && slot.sensor === "quake") {
        return en
          ? "The ground shook nearby then. This record does not say it was a blast."
          : "그 시각 그 근처에 흔들림이 기록됐습니다. 폭발인지는 이 기록이 말하지 않습니다.";
      }
      if (slot.looked) {
        return en
          ? "Nothing in the heat and alerts we hold was there then. A satellite can miss it."
          : "받아 둔 열과 경보에는 그 시각 그 근처가 없습니다. 위성이 놓친 것일 수 있습니다.";
      }
      return en
        ? "No alert, heat, or track is attached to this card yet."
        : "경보, 열, 항적이 이 카드에 아직 붙어 있지 않습니다.";
    }
    if (slot.place === "exercise" || slot.place === "charge" || slot.place === "closure") {
      if (slot.place === "exercise") {
        return en
          ? "This row is the exercise notice. Heat or a track does not turn it into a battle. Without a protest or a closure, the clash box stays empty."
          : "이 칸은 훈련 발표입니다. 열이나 항적이 훈련을 전투로 바꾸지 않습니다. 항의나 수역 폐쇄가 없으면 충돌은 비워 둡니다.";
      }
      if (slot.place === "charge") {
        return en
          ? "This row is the arrest or the charge. It is not a conviction, and it does not show that the technology was taken."
          : "이 칸은 체포나 기소입니다. 유죄도 아니고, 기술이 넘어갔다는 확인도 아닙니다.";
      }
      return en
        ? "This row is a closure or a protest. It does not say the two sides fired."
        : "이 칸은 수역을 닫거나 항의한 문서입니다. 교전했는지는 말하지 않습니다.";
    }
    if (slot.place === "posture") {
      if (slot.result === "original") {
        return en
          ? "A party posted this around then. The post itself says whether it matches the sentence."
          : "당사자가 그 시각에 올린 글입니다. 이 문장과 같은 말인지는 그 글이 말합니다.";
      }
      if (slot.looked) {
        return en
          ? "No post from an official account in that window."
          : "그 시간 당사자 계정에는 글이 없습니다.";
      }
      return en
        ? "No statement from the parties is attached yet."
        : "당사국 성명이 이 카드에 아직 붙어 있지 않습니다.";
    }
    if (slot.result === "original") {
      return en
        ? "The point sits inside a front area we hold. The area does not name who holds it, and it does not prove the movement in the sentence."
        : "그 점은 받아 둔 전선 면 안입니다. 누가 쥐고 있는지는 이 면이 말하지 않고, 문장 속 이동을 증명하지도 않습니다.";
    }
    if (slot.looked) {
      return en
        ? "The point is outside the front areas we hold. That does not make the sentence false."
        : "받아 둔 전선 면 밖입니다. 그 문장이 틀렸다는 뜻은 아닙니다.";
    }
    return en
      ? "No front map or casualty count is attached yet."
      : "전선 지도나 집계가 이 카드에 아직 붙어 있지 않습니다.";
  }
  if (slot.result === "original") {
    return slot.href
      ? en
        ? "This file is the text that office published."
        : "이 주소가 그 기관이 올린 원문입니다."
      : en
        ? "The text we received is the original. This feed has no per-incident address."
        : "받은 본문이 원문입니다. 이 피드에는 사건별 주소가 없습니다.";
  }
  return slot.href
    ? en
      ? "This is where that sentence was published. It cannot disagree with itself."
      : "이 주소는 이 문장이 실린 곳입니다. 같은 문장이 스스로를 뒤집지는 못합니다."
    : en
      ? "No address to open, and no original that can disagree."
      : "열 주소가 없고, 주장을 뒤집을 원본도 없습니다.";
}

function evidenceText(slot: CheckSlot, en: boolean): string {
  const lines = [note(slot, en)];
  if (slot.observedName) lines.push(en ? `Name on the positions: ${slot.observedName}` : `위치 기록의 선명: ${slot.observedName}`);
  if (slot.vesselName) lines.push(en ? `Name in the report: ${slot.vesselName}` : `원문의 선명: ${slot.vesselName}`);
  if (slot.distanceKm != null) lines.push(en ? `Distance: ${Math.round(slot.distanceKm)} km` : `거리: ${Math.round(slot.distanceKm)}km`);
  if (slot.id === "witness" && slot.sourceName && !["ais", "alert", "statement", "record"].includes(slot.sourceName)) {
    lines.push(en ? `Record: ${slot.sourceName}` : `기록: ${slot.sourceName}`);
  }
  return lines.join("\n");
}

function claim(slot: CheckSlot, item: StackItem, en: boolean): string {
  if (slot.id === "report") return item.title;
  if (slot.place === "ship") {
    return slot.vesselName
      ? en
        ? `${slot.vesselName} was nearby at that time`
        : `선명 ${slot.vesselName}, 그때 그 근처`
      : en
        ? "That ship was nearby at that time"
        : "그 배가 그때 그 근처에 있었다";
  }
  if (slot.place === "strike") {
    return en
      ? "An alert, heat, or aircraft was there then"
      : "그때 거기 경보·열·군용기가 있었다";
  }
  if (slot.place === "posture") {
    return en ? "A party’s own statement says this" : "당사국 발표가 이 문장을 말한다";
  }
  if (slot.place === "exercise") {
    return en ? "The notice says this exercise is happening" : "발표는 이 훈련이 있다고 말한다";
  }
  if (slot.place === "charge") {
    return en ? "The notice says this person was arrested or charged" : "발표는 이렇게 체포하거나 기소했다고 말한다";
  }
  if (slot.place === "closure") {
    return en ? "The notice says waters were closed or a protest was filed" : "발표는 수역을 닫거나 항의했다고 말한다";
  }
  return en ? "A front record says this movement" : "전선 기록이 이 이동을 말한다";
}

export function CrossCheckSlots({
  en,
  item,
  place,
  tone = "paper",
  vessels,
  fires,
  aircraft,
  posts,
  front,
}: {
  en: boolean;
  item: StackItem;
  place: CheckPlace;
  /** 선박 스택은 어두운 바탕, 속보창은 종이 바탕 */
  tone?: "ink" | "paper";
  /** 받아 둔 선박 위치. 없으면 위치 대조를 열지 않는다. */
  vessels?: readonly AisVessel[] | null;
  fires?: readonly FirmsFire[] | null;
  aircraft?: readonly MilitaryAircraft[] | null;
  posts?: readonly TelegramAlert[] | null;
  /** 이미 화면에 떠 있는 전선 면. 없으면 같은 기록을 받아 온다. */
  front?: FrontMap;
}) {
  const [remote, setRemote] = useState<SensorHit | null>(null);
  const [remoteLooked, setRemoteLooked] = useState(false);
  const [loadedFront, setLoadedFront] = useState<FrontMap>(null);
  useEffect(() => {
    if (place !== "strike") return;
    let alive = true;
    setRemote(null);
    setRemoteLooked(false);
    void loadStrikeOriginals({ lat: item.lat, lng: item.lng, at: item.at }).then((found) => {
      if (!alive) return;
      setRemote(found.hit);
      setRemoteLooked(found.looked);
    });
    return () => {
      alive = false;
    };
  }, [place, item.id, item.at, item.lat, item.lng]);
  useEffect(() => {
    if (place !== "front") return;
    if ((front?.features?.length ?? 0) > 0) return;
    let alive = true;
    void loadFrontMap().then((map) => {
      if (alive) setLoadedFront(map);
    });
    return () => {
      alive = false;
    };
  }, [place, front]);
  const frontMap = (front?.features?.length ?? 0) > 0 ? front : loadedFront;
  const tracks: TrackFix[] | undefined = aircraft?.map((row) => ({
    lat: row.lat,
    lng: row.lng,
    timestamp: row.timestamp,
    callsign: row.callsign,
  }));
  const statements: StatementPost[] | undefined = posts?.map((row) => ({
    channelUsername: row.channelUsername,
    channelTitle: row.channelTitle,
    text: row.text,
    receivedAt: row.receivedAt,
    messageUrl: row.messageUrl,
    placeLat: row.placeLat,
    placeLng: row.placeLng,
    textTruncated: row.textTruncated,
  }));
  const slots = checkSlots(item, place, { vessels, fires, tracks, posts: statements, remote, remoteLooked, front: frontMap });
  const reports = place === "ship" ? relatedReports(item) : [];
  const [openId, setOpenId] = useState<"report" | "witness" | null>(null);
  const paper = tone !== "ink";
  return (
    <div
      className={
        paper
          ? "rounded-sm border border-[#6b4a22]/30 bg-[#efe0bc]/60 px-2 py-1.5"
          : "border-b border-amber-600/25 px-2.5 py-2"
      }
      data-cross-check
    >
      <p className={paper ? "text-micro font-semibold text-[#5c4020]/90" : "text-micro font-medium text-amber-200/70"}>
        {en ? "Against an original" : "원본과 대조"}
      </p>
      <ul className="mt-1 space-y-1.5">
        {slots.map((slot) => {
          const stamp = RESULT_LABEL[slot.result];
          const placeLabel = en ? WITNESS_NAME[slot.place].en : WITNESS_NAME[slot.place].ko;
          const source =
            slot.id === "witness"
              ? slot.sensor && slot.sourceName && !["ais", "alert", "statement", "record"].includes(slot.sourceName)
                ? `${placeLabel} · ${slot.sourceName}`
                : placeLabel
              : slot.sourceName;
          return (
            <li key={slot.id} className={paper ? undefined : "rounded-sm border border-amber-600/20 bg-black/20 px-1.5 py-1"}>
              <div className="flex items-center gap-1.5">
                <span
                  className={`rounded-sm px-1 text-micro font-medium ${paper ? "bg-[#6b4a22]/15 text-[#3d2a12]" : "bg-amber-500/25 text-amber-50"}`}
                >
                  {en ? stamp.en : stamp.ko}
                </span>
                <span className={paper ? "text-micro text-[#5c4020]/80" : "text-micro text-amber-200/70"}>{source}</span>
              </div>
              <p className={paper ? "mt-0.5 text-micro leading-snug text-[#2a1c0a]" : "mt-0.5 text-micro leading-snug text-amber-50"}>
                {claim(slot, item, en)}
              </p>
              <p className={paper ? "text-micro leading-snug text-[#5c4020]/75" : "text-micro leading-snug text-amber-100/60"}>
                {note(slot, en)}
              </p>
              <button
                type="button"
                className={
                  paper
                    ? "text-micro text-[#3d2a12] underline decoration-[#6b4a22]/40 underline-offset-2"
                    : "text-micro text-amber-100 underline decoration-amber-400/40 underline-offset-2"
                }
                aria-expanded={openId === slot.id}
                onClick={() => setOpenId((cur) => (cur === slot.id ? null : slot.id))}
              >
                {openId === slot.id ? (en ? "Hide evidence" : "근거 접기") : en ? "Evidence and original" : "근거와 원문"}
              </button>
              {openId === slot.id ? (
                <div className={paper ? "mt-1 space-y-1" : "mt-1 space-y-1"}>
                  <p className={paper ? "text-micro font-semibold text-[#5c4020]" : "text-micro font-semibold text-amber-100"}>
                    {en ? "Evidence" : "근거"}
                  </p>
                  <p className={paper ? "whitespace-pre-line text-micro leading-snug text-[#2a1c0a]" : "whitespace-pre-line text-micro leading-snug text-amber-50"}>
                    {evidenceText(slot, en)}
                  </p>
                  <p className={paper ? "text-micro font-semibold text-[#5c4020]" : "text-micro font-semibold text-amber-100"}>
                    {en ? "Original" : "원문"}
                  </p>
                  {slot.body ? (
                    <p
                      className={
                        paper
                          ? "max-h-64 overflow-y-auto whitespace-pre-line text-micro leading-snug text-[#2a1c0a]"
                          : "max-h-64 overflow-y-auto whitespace-pre-line text-micro leading-snug text-amber-50"
                      }
                    >
                      {slot.body}
                    </p>
                  ) : (
                    <p className={paper ? "text-micro leading-snug text-[#5c4020]/80" : "text-micro leading-snug text-amber-100/70"}>
                      {slot.href
                        ? en
                          ? "The full text is at the address below."
                          : "전문은 아래 주소에 있습니다."
                        : slot.id === "witness" && (slot.place === "ship" || slot.sensor === "heat" || slot.sensor === "track")
                          ? en
                            ? "This row is a position or a time, not a piece of writing."
                            : "이 칸은 글이 아니라 위치와 시각입니다."
                          : en
                            ? "No text is held for this row."
                            : "이 칸에 받아 둔 글이 없습니다."}
                    </p>
                  )}
                  {slot.partial ? (
                    <p className={paper ? "text-micro leading-snug text-[#5c4020]/80" : "text-micro leading-snug text-amber-100/70"}>
                      {en
                        ? "Only the opening is kept here. The rest is at the address below."
                        : "앞부분만 받아 두었습니다. 나머지는 아래 주소입니다."}
                    </p>
                  ) : null}
                </div>
              ) : null}
              {slot.href ? (
                <a
                  href={slot.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={
                    paper
                      ? "text-micro text-[#3d2a12] underline decoration-[#6b4a22]/40 underline-offset-2"
                      : "mt-1 inline-block text-micro text-amber-100 underline decoration-amber-400/40 underline-offset-2 hover:text-amber-50"
                  }
                >
                  {slot.kind === "pdf" ? (en ? "Open PDF" : "PDF 열기") : en ? "Open original" : "원문 열기"}
                </a>
              ) : null}
            </li>
          );
        })}
      </ul>
      {reports.length > 0 ? (
        <div className="mt-1.5 space-y-1.5">
          <p className={paper ? "text-micro font-semibold text-[#5c4020]/90" : "text-micro font-medium text-amber-200/70"}>
            {en ? "Reports for this incident" : "이 사건에서 열 보고"}
          </p>
          {reports.map((report) => (
            <div key={report.id}>
              <p className={paper ? "text-micro leading-snug text-[#2a1c0a]" : "text-micro leading-snug text-amber-50"}>
                <span className={paper ? "font-semibold" : "font-medium text-amber-100"}>{report.sourceName}</span>
                {" · "}
                {report.matched ? (en ? "Original" : "원문") : en ? "Collected reports" : "보고가 모인 곳"}
              </p>
              <p className={paper ? "text-micro leading-snug text-[#5c4020]/80" : "text-micro leading-snug text-amber-100/70"}>
                {en ? report.noteEn : report.noteKo}
              </p>
              <a
                href={report.href}
                target="_blank"
                rel="noopener noreferrer"
                className={
                  paper
                    ? "text-micro text-[#3d2a12] underline decoration-[#6b4a22]/40 underline-offset-2"
                    : "text-micro text-amber-100 underline decoration-amber-400/40 underline-offset-2 hover:text-amber-50"
                }
              >
                {report.kind === "pdf" ? (en ? "Open PDF" : "PDF 열기") : en ? "Open" : "열기"}
              </a>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
