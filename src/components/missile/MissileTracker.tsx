"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MISSILE_EVENTS } from "@/data/missileReports";
import { AGENCY_COLOR, AGENCY_LABEL, MISSILE_AGENCIES, illustrationEndpoints, type MissileAgency, type MissileReport, type MissileArticleCandidate } from "@/lib/missileTrack";
import styles from "./MissileTracker.module.css";

const TrackMap = dynamic(() => import("./MissileTrackMap"), { ssr: false, loading: () => <p role="status">지도 준비 중…</p> });
type Candidate = MissileArticleCandidate;
function localTime(value?: string) { return value ? new Date(value).toLocaleTimeString("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hour12: false }) : "미언급"; }
const comparisonRows: [string, (report: MissileReport) => string][] = [
  ["발사 시각", r => localTime(r.launchTime)],
  ["낙하 시각", r => localTime(r.landingTime)],
  ["비행거리", r => r.distanceKm == null ? "미언급" : `약 ${r.distanceKm.toLocaleString()} km`],
  ["최고고도", r => r.apogeeKm == null ? "미언급" : `${r.apogeeKm.toLocaleString()} km`],
  ["발표 좌표", r => [r.launch, r.landing].some(p => p?.precision === "published-coordinate") ? "좌표 있음" : "인용 출처에 없음"],
];

export function MissileTracker() {
  const [eventId, setEventId] = useState(MISSILE_EVENTS[0].id);
  const event = MISSILE_EVENTS.find(e => e.id === eventId)!;
  const [visible, setVisible] = useState<MissileAgency[]>([...MISSILE_AGENCIES]);
  const [selected, setSelected] = useState(event.reports[0].id);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [mapError, setMapError] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [newsStatus, setNewsStatus] = useState("최신 관련 기사를 수집 중입니다…");
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const progressRef = useRef(0);
  const endpoints = illustrationEndpoints(event, visible);
  const report = event.reports.find(r => r.id === selected) ?? event.reports[0];

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 15000);
    let active = true;
    setLoading(true);
    setNewsStatus("최신 관련 기사를 수집 중입니다…");
    fetch("/api/missile-reports", { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error("unavailable");
      const payload = await response.json();
      if (!active) return;
      setCandidates(payload.candidates);
      setNewsStatus(`${payload.failedFeeds ? `일부 수집 실패 (${payload.failedFeeds}/3). ` : ""}${payload.candidates.length ? `${payload.candidates.length}건 · 발표 인용 여부 검토 대기` : "수집된 관련 기사 없음"} · ${localTime(payload.fetchedAt)} KST 확인`);
    }).catch(() => { if (active) { setCandidates([]); setNewsStatus("최신 기사 수집 실패. 검토된 사건과 출처는 계속 볼 수 있습니다."); } })
      .finally(() => { window.clearTimeout(timer); if (active) setLoading(false); });
    return () => { active = false; window.clearTimeout(timer); controller.abort(); };
  }, [refreshKey]);

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let last: number | undefined;
    const tick = (now: number) => {
      if (last !== undefined) progressRef.current = Math.min(1, progressRef.current + Math.min(now - last, 100) / 12000 * speed);
      last = now;
      setProgress(progressRef.current);
      if (progressRef.current >= 1) { setPlaying(false); return; }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const pause = () => { if (document.hidden) setPlaying(false); };
    document.addEventListener("visibilitychange", pause);
    return () => { cancelAnimationFrame(frame); document.removeEventListener("visibilitychange", pause); };
  }, [playing, speed]);

  function seek(value: number) { progressRef.current = value; setProgress(value); }
  function toggleAgency(agency: MissileAgency) { setPlaying(false); setVisible(v => v.includes(agency) ? v.filter(a => a !== agency) : [...v, agency]); }

  return <main className={styles.page}>
    <header className={styles.header}>
      <div><Link href="/" className={styles.back}>← 세계 지도</Link><p className={styles.eyebrow}>PUBLIC REPORTS / DPRK</p><h1>북한 미사일 발표 추적</h1><p>한국 합참 · 일본 방위성 · 미 펜타곤의 발표를 나란히 봅니다.</p></div>
      <span className={styles.badge}>공개 발표 기반 · 과거 사건 재구성</span>
    </header>
    <div className={styles.layout}>
      <aside className={styles.sidebar} aria-label="발사 사건">
        <h2>발사 사건 <small>{MISSILE_EVENTS.length}</small></h2>
        {MISSILE_EVENTS.map(item => <button key={item.id} className={styles.event} aria-pressed={eventId === item.id} onClick={() => { setEventId(item.id); setSelected(item.reports[0].id); setPlaying(false); seek(0); }}><time>{item.date}</time><strong>{item.title}</strong><span>발표 {item.reports.length}건 · 지명 기반</span></button>)}
        <p className={styles.muted}>검토된 사건만 지도에 표시합니다. 최신 기사 후보는 아래에서 별도로 확인할 수 있습니다.</p>
        <h2>표시할 기관</h2>
        {MISSILE_AGENCIES.map(agency => <label key={agency} className={styles.agency} style={{ color: AGENCY_COLOR[agency] }}><input type="checkbox" checked={visible.includes(agency)} onChange={() => toggleAgency(agency)} />{AGENCY_LABEL[agency]}</label>)}
        <div className={styles.legend}><p>◇ 지명 참조점 · 발표 좌표 아님</p><p>▧ 지명 식별용 편집 범위</p><p>┄ 추정 지표면 경로</p></div>
      </aside>
      <section className={styles.center} aria-label="경로 지도와 재생">
        <div className={styles.map}>
          <TrackMap event={event} visible={visible} progress={progress} onReport={setSelected} onError={() => setMapError(true)} />
          <div className={styles.mapNote}>추정 경로 · 실제 레이더 궤적 아님</div>
          {mapError && <div role="alert" className={styles.mapError}>지도를 불러오지 못했습니다. 아래 발표 비교에서 위치와 출처를 확인하세요.</div>}
        </div>
        <div className={styles.playback}>
          <div className={styles.controls}>
            <button disabled={!endpoints} onClick={() => { if (progress >= 1) seek(0); setPlaying(!playing); }}>{playing ? "일시정지" : progress >= 1 ? "다시 재생" : "경로 재생"}</button>
            <button aria-label="처음으로" onClick={() => { setPlaying(false); seek(0); }}>↺</button>
            <label>재생 속도 <select value={speed} onChange={e => setSpeed(Number(e.target.value))}><option value={0.5}>0.5×</option><option value={1}>1×</option><option value={2}>2×</option></select></label>
            <span>{Math.round(progress * 100)}%</span>
          </div>
          <input aria-label="개략 경로 재생 위치" aria-valuetext={`${Math.round(progress * 100)}%`} className={styles.scrubber} type="range" min={0} max={1000} value={Math.round(progress * 1000)} disabled={!endpoints} onChange={e => { setPlaying(false); seek(Number(e.target.value) / 1000); }} />
          <p>{endpoints ? "한국 발표의 발사 지명 → 일본 발표의 낙하 지명 · 1×는 12초 설명용 재생입니다. 실제 비행 시간·속도·고도를 재현하지 않습니다." : "경로를 보려면 한국 합참과 일본 방위성을 모두 켜세요."}</p>
          <p className={styles.muted}>사각형은 위치 설명을 위한 편집 범위입니다. 실제 발생 구역이나 측정 오차를 뜻하지 않습니다.</p>
        </div>
        <section className={styles.comparison}>
          <h2>발표 비교 <small>시각은 KST / JST (UTC+9)</small></h2>
          <div className={styles.tableWrap}><table><thead><tr><th>항목</th>{event.reports.filter(r => visible.includes(r.agency)).map(r => <th key={r.id} style={{ color: AGENCY_COLOR[r.agency] }}>{AGENCY_LABEL[r.agency]}</th>)}</tr></thead>
            <tbody>{comparisonRows.map(([label, format]) => <tr key={label}><th>{label}</th>{event.reports.filter(r => visible.includes(r.agency)).map(r => <td key={r.id}>{format(r)}</td>)}</tr>)}</tbody></table></div>
          <p className={styles.muted}>발사 시각은 한국 07:10, 일본 07:11로 다릅니다. 기관별 발표를 그대로 유지하며, ‘미언급’은 연결한 출처 기준입니다.</p>
        </section>
      </section>
      <aside className={styles.evidence} aria-label="발표 근거">
        <h2>발표와 근거</h2>
        {event.reports.map(r => <button key={r.id} className={styles.reportTab} aria-pressed={r.id === report.id} onClick={() => setSelected(r.id)}><span style={{ color: AGENCY_COLOR[r.agency] }}>{AGENCY_LABEL[r.agency]}</span><small>{r.publicationTimeKnown ? `${localTime(r.publishedAt)} KST` : "10.31 · 시각 미확인"}</small></button>)}
        <article className={styles.report}>
          <span className={styles.badge}>{report.sourceKind === "official" ? "공식 발표 원문" : "발표 인용 기사"}</span>
          <h3>{report.publisher}</h3><p>{report.summary}</p>
          {report.excerpt && <blockquote className={styles.excerpt}><small>원문 발췌</small><p lang="en">{report.excerpt}</p></blockquote>}
          <a href={report.sourceUrl} target="_blank" rel="noopener noreferrer">출처 열기 ↗</a>
          {[report.launch, report.landing].map((place, i) => place && <div key={i} className={styles.location}><strong>{place.label}</strong><p>{place.basis}</p><small>{place.precision === "place-reference" ? "편집 참조점" : "발표 좌표"}: {place.coordinates[1]}°N, {place.coordinates[0]}°E</small></div>)}
          {!report.launch && !report.landing && <p className={styles.muted}>연결한 발표에 위치 정보가 없어 이 기관의 지도 표시는 없습니다.</p>}
        </article>
        <h2>보도·발표 이력</h2>
        <ol className={styles.timeline}>{[...event.reports].sort((a, b) => Number(b.publicationTimeKnown) - Number(a.publicationTimeKnown) || a.publishedAt.localeCompare(b.publishedAt)).map(r => <li key={r.id}><button onClick={() => setSelected(r.id)}>{AGENCY_LABEL[r.agency]} · {r.publicationTimeKnown ? localTime(r.publishedAt) : "시각 미확인"}</button><small>{r.publisher}</small></li>)}</ol>
      </aside>
    </div>
    <section className={styles.news}>
      <div className={styles.newsHeading}><h2>최신 발표 관련 기사 후보</h2><button disabled={loading} onClick={() => setRefreshKey(k => k + 1)}>새로고침</button></div>
      <p role="status">{newsStatus}</p><p className={styles.muted}>기관별 검색 결과입니다. ‘기관 언급’은 제목·요약 기준이며, ‘검색 후보’는 기관 인용이 아직 확인되지 않았습니다. 원문을 검토하기 전에는 지도에 반영하지 않습니다.</p>
      <div className={styles.newsGrid}>{candidates.map(item => <a key={item.link} href={item.link} target="_blank" rel="noopener noreferrer"><small>{(item.agencies.length ? item.agencies : item.queriedAgencies).map(a => AGENCY_LABEL[a]).join(" · ")} · {item.agencies.length ? "기관 언급 · 검토 대기" : "검색 후보 · 인용 미확인"}</small><strong>{item.title}</strong><span>{item.publisher ?? "관련 보도"} · {new Date(item.pubDate).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })} ↗</span></a>)}</div>
    </section>
  </main>;
}
