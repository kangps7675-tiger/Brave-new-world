"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { geoGraticule10, geoInterpolate, geoOrthographic, geoPath, type GeoPermissibleObjects } from "d3-geo";
import { prefersReducedMotion } from "@/hooks/useReducedMotion";
import { pick } from "@/components/landing/landingCopy";
import { useLandingLanguage } from "@/lib/landingLanguage";
import { useScrollProgress } from "@/components/landing/LandingMotion";

/**
 * 랜딩 첫 화면의 돌아가는 지구본 — 세계 곳곳의 분쟁 구도를 보여 주고,
 * 3초마다 콜아웃이 다른 사건을 조준한다(영토·전선·분쟁 지역 예시).
 *
 * 점을 누르거나 아래 칩을 누르면 그곳으로 돌아가고, 끌어서 직접 돌릴 수도 있다.
 * 실제 속보 데이터가 아니라 대표 분쟁 지역을 고른 연출이다(캡션에 밝힌다).
 *
 * WebGL이 아니라 2D 캔버스다. 이 랜딩은 실제 지구본(MapLibre)이 아래에서 부팅하는 동안 덮여 있으므로
 * GPU를 다투지 않게 가볍게 그린다. 화면 밖이거나 탭이 숨으면 멈춘다.
 */

export type Hotspot = {
  id: string;
  name: string;
  kind: string;
  lng: number;
  lat: number;
  why: string;
  see: string;
};

/** 대표 분쟁 지역 8곳. 설명은 시점이 바뀌어도 틀리지 않을 구조적 사실만 적는다. */
export const HOTSPOTS: Hotspot[] = [
  {
    id: "ukraine",
    name: "우크라이나 동부 전선",
    kind: "전선",
    lng: 37.8,
    lat: 48.0,
    why: "2022년 전면전 이후 양쪽이 참호와 드론으로 맞서는 전선입니다. 어느 마을을 누가 쥐고 있는지가 속보마다 바뀝니다.",
    see: "점령 지역 붉은 면 · 타격 불꽃 · 전선 속보",
  },
  {
    id: "gaza",
    name: "가자·레바논 접경",
    kind: "무력 충돌",
    lng: 34.6,
    lat: 31.5,
    why: "이스라엘과 무장세력이 좁은 땅을 사이에 두고 공습과 로켓을 주고받는 곳입니다. 주변국으로 번질지가 늘 관건입니다.",
    see: "공습·로켓 속보 · 주변 군 움직임",
  },
  {
    id: "sudan",
    name: "수단 내전",
    kind: "내전",
    lng: 32.5,
    lat: 15.6,
    why: "정부군과 준군사조직이 수도 하르툼을 비롯한 도시를 두고 싸우는 내전입니다. 피란민 규모가 세계에서 손꼽힙니다.",
    see: "교전 지역 속보 · 열 감지 위성 불꽃",
  },
  {
    id: "kashmir",
    name: "카슈미르",
    kind: "영토 분쟁",
    lng: 75.3,
    lat: 34.0,
    why: "인도·파키스탄·중국이 서로 다른 국경선을 주장하는 산악 지대입니다. 정식 국경이 아니라 실제 통제선을 사이에 두고 맞섭니다.",
    see: "영토분쟁 카드 · 통제선 부근 속보",
  },
  {
    id: "korea",
    name: "한반도 군사분계선",
    kind: "대치",
    lng: 127.2,
    lat: 38.0,
    why: "1953년 휴전 이후 70년 넘게 군사분계선을 사이에 두고 대치하는 곳입니다. 미사일 발사 소식이 이어집니다.",
    see: "미사일 발사 기록 · 주변 군용기 · 한반도 속보",
  },
  {
    id: "scs",
    name: "남중국해 스프래틀리",
    kind: "영토 분쟁",
    lng: 114.0,
    lat: 10.2,
    why: "중국·필리핀·베트남 등이 암초와 섬의 영유권을 서로 주장합니다. 해경선 대치가 반복되는 곳입니다.",
    see: "영토분쟁 카드 · 해상 대치 속보 · 군용기 움직임",
  },
  {
    id: "taiwan",
    name: "대만해협",
    kind: "긴장",
    lng: 120.2,
    lat: 24.2,
    why: "중국은 대만을 자국 영토로 보고, 대만은 이를 거부합니다. 중국 군용기·군함의 훈련이 소식의 대부분입니다.",
    see: "중국 군용기·군함 움직임 · 군사훈련 구역",
  },
  {
    id: "yemen",
    name: "예멘·홍해",
    kind: "무력 충돌",
    lng: 44.2,
    lat: 15.4,
    why: "후티 무장세력이 영토 일부를 통제하며 미사일과 드론으로 홍해 쪽을 공격합니다. 해운이 첫 연재 주제인 이유입니다.",
    see: "후티 공격 경보 · 주변 상선과 군함 · 전쟁위험 보험료 보도",
  },
];

const HOTSPOT_EN: Record<string, Pick<Hotspot, "name" | "kind" | "why" | "see">> = {
  ukraine: {
    name: "Eastern Ukraine front",
    kind: "Front line",
    why: "Since the 2022 full-scale invasion, both sides face off with trenches and drones. Which village is held by whom changes from report to report.",
    see: "Occupied ground in red · strike flames · front-line alerts",
  },
  gaza: {
    name: "Gaza and the Lebanon border",
    kind: "Armed conflict",
    why: "Israel and armed groups trade airstrikes and rockets across small strips of land. Whether it spreads to neighbors is always the question.",
    see: "Airstrike and rocket alerts · nearby military movement",
  },
  sudan: {
    name: "Sudan civil war",
    kind: "Civil war",
    why: "The army and a paramilitary force fight over Khartoum and other cities. The number of displaced people is among the largest in the world.",
    see: "Fighting-area alerts · satellite heat detections",
  },
  kashmir: {
    name: "Kashmir",
    kind: "Territorial dispute",
    why: "A mountain region where India, Pakistan, and China claim different borders. They face each other across a line of actual control, not a formal border.",
    see: "Territorial dispute card · alerts near the line of control",
  },
  korea: {
    name: "Korean Peninsula DMZ",
    kind: "Standoff",
    why: "Since the 1953 armistice the two sides have faced each other across the military demarcation line for over 70 years. Missile launches keep making news.",
    see: "Missile launch records · nearby military aircraft · peninsula alerts",
  },
  scs: {
    name: "South China Sea, Spratlys",
    kind: "Territorial dispute",
    why: "China, the Philippines, Vietnam, and others claim the same reefs and islands. Coast guard standoffs repeat here.",
    see: "Territorial dispute card · standoff alerts · military aircraft movement",
  },
  taiwan: {
    name: "Taiwan Strait",
    kind: "Tension",
    why: "Beijing treats Taiwan as its territory and Taipei rejects that. Most of the news is Chinese military flights and ships on exercises.",
    see: "Chinese military flights and ships · exercise zones",
  },
  yemen: {
    name: "Yemen and the Red Sea",
    kind: "Armed conflict",
    why: "The Houthi armed group holds part of the country and attacks toward the Red Sea with missiles and drones. This is why shipping is the first series.",
    see: "Houthi attack alerts · nearby merchant ships and warships · reported war-risk premiums",
  },
};

type Land = GeoPermissibleObjects;

const TARGET_LAT_SHIFT = 6;

/** 콜아웃이 다음 사건으로 넘어가는 주기 — 3초 */
const CYCLE_MS = 3000;
const TRAVEL_MS = 1200;

export function LandingGlobe() {
  const lang = useLandingLanguage();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [land, setLand] = useState<Land | null>(null);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  activeRef.current = active;
  const [reduced, setReduced] = useState(false);
  const rotRef = useRef<[number, number, number]>([-HOTSPOTS[0].lng, -HOTSPOTS[0].lat + TARGET_LAT_SHIFT, 0]);
  const travelRef = useRef<{ from: [number, number]; to: [number, number]; start: number } | null>(null);
  const dragRef = useRef<{ x: number; y: number; rot: [number, number, number] } | null>(null);
  const pausedUntilRef = useRef(0);
  const visibleRef = useRef(true);
  const hotspotScreenRef = useRef<{ i: number; x: number; y: number }[]>([]);
  const calloutRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const scroll = useScrollProgress(stageRef);

  useEffect(() => {
    setReduced(prefersReducedMotion());
    let alive = true;
    fetch("/data/landing-land-110m.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((g) => {
        if (alive && g) setLand(g as Land);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  /** 다음 지점으로 날아간다 */
  const goTo = useCallback((i: number) => {
    const h = HOTSPOTS[i];
    const [lam, phi] = rotRef.current;
    travelRef.current = { from: [-lam, -phi], to: [h.lng, h.lat - TARGET_LAT_SHIFT], start: performance.now() };
    setActive(i);
  }, []);

  // 자동 순회 — 사람이 만지면 잠시 멈춘다
  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => {
      if (!visibleRef.current || document.hidden) return;
      if (performance.now() < pausedUntilRef.current || dragRef.current) return;
      setActive((cur) => {
        const next = (cur + 1) % HOTSPOTS.length;
        const h = HOTSPOTS[next];
        const [lam, phi] = rotRef.current;
        travelRef.current = { from: [-lam, -phi], to: [h.lng, h.lat - TARGET_LAT_SHIFT], start: performance.now() };
        return next;
      });
    }, CYCLE_MS);
    return () => window.clearInterval(id);
  }, [reduced]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const io = new IntersectionObserver(([e]) => {
      visibleRef.current = e?.isIntersecting ?? true;
    });
    io.observe(wrap);

    let size = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const resize = () => {
      size = Math.max(200, Math.floor(wrap.clientWidth));
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const projection = geoOrthographic().clipAngle(90).precision(0.6);
    const path = geoPath(projection, ctx);
    const graticule = geoGraticule10();
    let raf = 0;
    let lastDraw = 0;

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (!visibleRef.current || document.hidden) return;
      if (now - lastDraw < 33) return; // ~30fps면 충분하다
      lastDraw = now;

      const tr = travelRef.current;
      if (tr) {
        const t = Math.min(1, (now - tr.start) / TRAVEL_MS);
        const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
        const [lng, lat] = geoInterpolate(tr.from, tr.to)(e);
        rotRef.current = [-lng, -lat, 0];
        if (t >= 1) travelRef.current = null;
      } else if (!dragRef.current && !reduced) {
        // 머무는 동안에도 아주 천천히 돈다
        rotRef.current = [rotRef.current[0] + 0.04, rotRef.current[1], 0];
      }

      const r = size / 2 - 6;
      projection.translate([size / 2, size / 2]).scale(r).rotate(rotRef.current);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);

      // 대기 번짐
      const halo = ctx.createRadialGradient(size / 2, size / 2, r * 0.9, size / 2, size / 2, r * 1.08);
      halo.addColorStop(0, "rgba(45,212,191,0)");
      halo.addColorStop(0.5, "rgba(45,212,191,0.18)");
      halo.addColorStop(1, "rgba(45,212,191,0)");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, r * 1.08, 0, Math.PI * 2);
      ctx.fill();

      // 바다
      const sea = ctx.createRadialGradient(size * 0.38, size * 0.32, r * 0.1, size / 2, size / 2, r);
      sea.addColorStop(0, "#14344d");
      sea.addColorStop(0.65, "#0a1b2b");
      sea.addColorStop(1, "#040a12");
      ctx.fillStyle = sea;
      ctx.beginPath();
      path({ type: "Sphere" });
      ctx.fill();

      // 경위선
      ctx.strokeStyle = "rgba(94,234,212,0.08)";
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      path(graticule);
      ctx.stroke();

      // 육지
      if (land) {
        ctx.fillStyle = "#1f3d52";
        ctx.strokeStyle = "rgba(125,170,190,0.55)";
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        path(land);
        ctx.fill();
        ctx.stroke();
      }

      const center: [number, number] = [-rotRef.current[0], -rotRef.current[1]];
      const front = (lng: number, lat: number) => {
        const dLng = ((lng - center[0] + 540) % 360) - 180;
        return (
          Math.sin((center[1] * Math.PI) / 180) * Math.sin((lat * Math.PI) / 180) +
            Math.cos((center[1] * Math.PI) / 180) * Math.cos((lat * Math.PI) / 180) * Math.cos((dLng * Math.PI) / 180) >
          0.04
        );
      };

      // 분쟁 지역 주변의 작은 사건 점들 — 깜빡이며 "여러 곳에서 동시에 벌어진다"는 느낌만 준다
      const ping = (now % 1600) / 1600;
      HOTSPOTS.forEach((h, hi) => {
        for (let k = 0; k < 5; k++) {
          const ang = hi * 2.1 + k * 1.37;
          const rad = 1.2 + ((hi * 7 + k * 3) % 5) * 0.55;
          const lng = h.lng + Math.cos(ang) * rad * 1.3;
          const lat = h.lat + Math.sin(ang) * rad;
          if (!front(lng, lat)) continue;
          const q = projection([lng, lat]);
          if (!q) continue;
          const ph = (ping + (hi * 5 + k) * 0.13) % 1;
          if (!reduced) {
            ctx.strokeStyle = `rgba(248,113,113,${0.55 * (1 - ph)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(q[0], q[1], 2 + ph * 9, 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.fillStyle = "rgba(248,113,113,0.9)";
          ctx.beginPath();
          ctx.arc(q[0], q[1], 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // 분쟁 지역 점 + 활성 지점 조준선
      const screen: { i: number; x: number; y: number }[] = [];
      const pulse = (now % 2000) / 2000;
      const callout: { at: { x: number; y: number } | null } = { at: null };
      HOTSPOTS.forEach((h, i) => {
        // 뒤편은 그리지 않는다
        const dLng = ((h.lng - center[0] + 540) % 360) - 180;
        const cosc =
          Math.sin((center[1] * Math.PI) / 180) * Math.sin((h.lat * Math.PI) / 180) +
          Math.cos((center[1] * Math.PI) / 180) * Math.cos((h.lat * Math.PI) / 180) * Math.cos((dLng * Math.PI) / 180);
        if (cosc < 0.05) return;
        const p = projection([h.lng, h.lat]);
        if (!p) return;
        const [x, y] = p;
        screen.push({ i, x, y });
        const on = i === activeRef.current;
        if (on && !reduced) {
          ctx.strokeStyle = `rgba(245,196,81,${0.9 * (1 - pulse)})`;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(x, y, 6 + pulse * 22, 0, Math.PI * 2);
          ctx.stroke();
        }
        const glow = ctx.createRadialGradient(x, y, 0, x, y, on ? 16 : 10);
        glow.addColorStop(0, on ? "rgba(255,210,90,0.95)" : "rgba(255,120,40,0.85)");
        glow.addColorStop(1, "rgba(255,90,10,0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, on ? 16 : 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = on ? "#fff7d6" : "#ffd27a";
        ctx.beginPath();
        ctx.arc(x, y, on ? 3.6 : 2.6, 0, Math.PI * 2);
        ctx.fill();
        if (on) {
          // 조준선 — 천천히 도는 네 귀퉁이 괄호
          const rr = 14 + Math.sin(now / 260) * 1.5;
          const spin = reduced ? 0 : now / 1800;
          ctx.strokeStyle = "rgba(255,226,140,0.95)";
          ctx.lineWidth = 1.6;
          for (let c = 0; c < 4; c++) {
            const a0 = spin + (c * Math.PI) / 2 + 0.25;
            ctx.beginPath();
            ctx.arc(x, y, rr, a0, a0 + 0.9);
            ctx.stroke();
          }
          callout.at = { x, y };
        }
      });
      hotspotScreenRef.current = screen;

      // 콜아웃 카드와 지시선을 조준한 점에 붙인다
      const el = calloutRef.current;
      const calloutAt = callout.at;
      if (el) {
        if (calloutAt) {
          const left = calloutAt.x > size * 0.55;
          const bx = calloutAt.x + (left ? -22 : 22);
          const by = calloutAt.y - 26;
          ctx.strokeStyle = "rgba(245,196,81,0.85)";
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(calloutAt.x + (left ? -12 : 12), calloutAt.y - 10);
          ctx.lineTo(bx, by);
          ctx.stroke();
          el.style.opacity = "1";
          el.style.transform = `translate(${left ? `calc(${bx}px - 100%)` : `${bx}px`}, ${by}px) translateY(-100%)`;
        } else {
          el.style.opacity = "0";
        }
      }
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, [land, reduced]);

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const hit = hotspotScreenRef.current.find((h) => Math.hypot(h.x - x, h.y - y) < 18);
    if (hit) {
      pausedUntilRef.current = performance.now() + 9000;
      goTo(hit.i);
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, rot: [...rotRef.current] };
    travelRef.current = null;
  };
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = dragRef.current;
    if (!d) return;
    const k = 0.35;
    rotRef.current = [d.rot[0] + (e.clientX - d.x) * k, Math.max(-60, Math.min(60, d.rot[1] - (e.clientY - d.y) * k)), 0];
  };
  const onPointerUp = () => {
    if (dragRef.current) pausedUntilRef.current = performance.now() + 6000;
    dragRef.current = null;
  };

  const raw = HOTSPOTS[active];
  const en = HOTSPOT_EN[raw.id];
  const h = lang === "en" && en ? { ...raw, ...en } : raw;

  return (
    <div
      ref={stageRef}
      className="flex min-w-0 flex-col gap-4 will-change-transform"
      style={{
        transform: `perspective(1200px) scale(${1 - scroll * 0.08}) rotateX(${scroll * 16}deg)`,
        transformOrigin: "50% 0%",
        opacity: 1 - scroll * 0.6,
      }}
    >
      <div ref={wrapRef} className="relative mx-auto aspect-square w-full max-w-[520px]">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={
            lang === "en"
              ? `Globe. Now showing ${h.name}.`
              : `지구본. 지금 ${h.name}을 보여 주고 있습니다.`
          }
          className="h-full w-full cursor-grab touch-none active:cursor-grabbing"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
        {/* 조준한 사건 콜아웃 — 위치는 그리기 루프가 정한다 */}
        <div
          ref={calloutRef}
          aria-live="polite"
          className="pointer-events-none absolute left-0 top-0 w-[min(60%,260px)] rounded-lg border border-[#f5c451]/50 bg-[#05080d]/92 px-3.5 py-2.5 opacity-0 shadow-[0_0_24px_rgba(245,196,81,0.12)] backdrop-blur"
        >
          <div key={h.id} className="motion-safe:animate-[landing-card_0.4s_ease-out]">
            <p className="m-0 text-caption font-semibold text-[#f87171]">{h.kind}</p>
            <p className="m-0 mt-0.5 text-[15px] font-bold leading-snug text-[#f5c451]">{h.name}</p>
            <p className="mb-0 mt-1 text-[13px] leading-snug text-[#d7e0e6]">{h.why}</p>
            <p className="mb-0 mt-1.5 text-caption leading-snug text-[#8fa3b1]">
              {pick(lang, "지구본에서 보는 것", "On the globe")} · {h.see}
            </p>
          </div>
        </div>
      </div>
      <p className="m-0 text-center text-caption text-[#7d8f9c]">
        <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-[#f87171] align-middle" />
        {pick(
          lang,
          "붉은 점은 대표 분쟁 지역을 고른 예시입니다. 실제 지구본에서는 속보가 들어오는 자리마다 찍혀요.",
          "Red dots are a sample of well-known conflict areas. On the real globe, a dot appears wherever an alert comes in.",
        )}
      </p>
      <div className="flex flex-wrap justify-center gap-1.5" role="group" aria-label={pick(lang, "분쟁 지역 고르기", "Choose a conflict area")}>
        {HOTSPOTS.map((s, i) => {
          const label = lang === "en" ? (HOTSPOT_EN[s.id]?.name ?? s.name) : s.name;
          return (
          <button
            key={s.id}
            type="button"
            aria-pressed={i === active}
            onClick={() => {
              pausedUntilRef.current = performance.now() + 9000;
              goTo(i);
            }}
            className={`cursor-pointer rounded-full border px-3 py-1.5 font-[inherit] text-sm transition-colors ${
              i === active
                ? "border-[#f5c451] bg-[#f5c451]/15 text-[#f5c451]"
                : "border-white/15 bg-transparent text-[#a3b3bf] hover:border-white/40 hover:text-white"
            }`}
          >
            {label}
          </button>
          );
        })}
      </div>
    </div>
  );
}
