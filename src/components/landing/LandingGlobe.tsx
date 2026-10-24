"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { geoGraticule10, geoInterpolate, geoOrthographic, geoPath, type GeoPermissibleObjects } from "d3-geo";
import { prefersReducedMotion } from "@/hooks/useReducedMotion";
import { pick } from "@/components/landing/landingCopy";
import { useLandingLanguage } from "@/lib/landingLanguage";
import { useScrollProgress } from "@/components/landing/LandingMotion";

/**
 * 랜딩 첫 화면의 돌아가는 지구본 — One Page Love의 DCS AML(천천히 도는 지구본)과
 * World Pollution(누를 수 있는 지점)을 섞었다.
 *
 * 해운 길목 6곳을 차례로 찾아가며 그 바다에서 지구본이 무엇을 보여 주는지 카드로 설명한다.
 * 점을 누르거나 아래 칩을 누르면 그곳으로 돌아가고, 끌어서 직접 돌릴 수도 있다.
 *
 * WebGL이 아니라 2D 캔버스다. 이 랜딩은 실제 지구본(MapLibre)이 아래에서 부팅하는 동안 덮여 있으므로
 * GPU를 다투지 않게 가볍게 그린다. 화면 밖이거나 탭이 숨으면 멈춘다.
 */

export type Hotspot = {
  id: string;
  name: string;
  lng: number;
  lat: number;
  why: string;
  see: string;
};

export const HOTSPOTS: Hotspot[] = [
  {
    id: "hormuz",
    name: "호르무즈 해협",
    lng: 56.3,
    lat: 26.6,
    why: "페르시아만 원유·LNG가 나가는 사실상 유일한 출구입니다. 세계 원유 소비량의 약 5분의 1이 지나갑니다.",
    see: "유조선 위치 · 해상 피습 경보 · 걸프 정유소에 떨어진 드론·미사일",
  },
  {
    id: "bab",
    name: "바브엘만데브 해협",
    lng: 43.4,
    lat: 12.6,
    why: "홍해와 수에즈 운하로 들어가는 입구입니다. 이곳이 위험해지면 배들이 희망봉으로 돌아가 1~2주가 더 걸립니다.",
    see: "후티 공격 경보 · 주변 상선과 군함 · 전쟁위험 보험료 보도",
  },
  {
    id: "blacksea",
    name: "흑해",
    lng: 34.5,
    lat: 43.6,
    why: "우크라이나와 러시아의 곡물·원유가 세계로 나가는 바다입니다.",
    see: "항구·유조선 타격 불꽃 · 우크라이나 점령 지역 · 해상 드론 속보",
  },
  {
    id: "suez",
    name: "수에즈 운하",
    lng: 32.4,
    lat: 30.5,
    why: "아시아와 유럽을 잇는 가장 짧은 바닷길입니다. 홍해 쪽 위험이 그대로 이어집니다.",
    see: "운하 접근 해역의 배 위치 · 홍해 사건과 같은 흐름",
  },
  {
    id: "malacca",
    name: "말라카 해협",
    lng: 100.9,
    lat: 2.6,
    why: "중동 원유가 한국·중국·일본으로 오는 가장 짧은 길입니다.",
    see: "배 위치 신호 · 해적·나포 소식",
  },
  {
    id: "taiwan",
    name: "대만해협",
    lng: 119.6,
    lat: 24.2,
    why: "동아시아 컨테이너선이 많이 지나고, 첨단 반도체 생산이 몰린 대만을 끼고 있습니다.",
    see: "중국 군용기·군함 움직임 · 군사훈련 구역",
  },
];

const HOTSPOT_EN: Record<string, Pick<Hotspot, "name" | "why" | "see">> = {
  hormuz: {
    name: "Strait of Hormuz",
    why: "Effectively the only exit for Persian Gulf oil and LNG. About a fifth of the world's oil consumption passes through.",
    see: "Tanker positions · maritime attack alerts · drone and missile strikes on Gulf plants",
  },
  bab: {
    name: "Bab el-Mandeb",
    why: "The gate into the Red Sea and the Suez Canal. When it turns dangerous, ships detour around the Cape and lose one to two weeks.",
    see: "Houthi attack alerts · nearby merchant ships and warships · reported war-risk premiums",
  },
  blacksea: {
    name: "Black Sea",
    why: "The sea Ukrainian and Russian grain and oil leave through.",
    see: "Strikes on ports and tankers · occupied areas of Ukraine · sea-drone reports",
  },
  suez: {
    name: "Suez Canal",
    why: "The shortest sea route between Asia and Europe. Risk in the Red Sea carries straight through.",
    see: "Ship positions on the approaches · the same flow as Red Sea incidents",
  },
  malacca: {
    name: "Strait of Malacca",
    why: "The shortest route for Middle East oil bound for Korea, China, and Japan.",
    see: "Ship position signals · piracy and seizure reports",
  },
  taiwan: {
    name: "Taiwan Strait",
    why: "A busy East Asian container route, beside the island that makes most advanced chips.",
    see: "Chinese military flights and ships · exercise zones",
  },
};

type Land = GeoPermissibleObjects;

/**
 * 연출용 바닷길 — 배 점이 이 길을 따라 흐른다. 실제 AIS가 아니라 대표 항로를 그린 것이다(캡션에 밝힌다).
 */
const LANES: [number, number][][] = [
  [[56.4, 26.3], [60, 22], [72, 12], [80, 6], [95, 5.5], [100.9, 2.6]],
  [[100.9, 2.6], [105, 3], [110, 10], [116, 18], [119.6, 24.2], [123, 30]],
  [[32.4, 30.5], [33.6, 27.5], [37, 22], [40.5, 16], [43.4, 12.6], [50, 12.5], [56, 14], [60, 20], [56.4, 26.3]],
  [[29, 41.1], [26, 39.5], [24, 36], [28, 34], [32.4, 31.3]],
  [[29, 41.1], [31, 42.5], [34.5, 43.6], [37.8, 44.7]],
  [[32.4, 31.3], [20, 34], [10, 37.5], [-5.6, 36]],
];

type Incident = { lng: number; lat: number };

const TRAVEL_MS = 1500;
const HOLD_MS = 3800;

export function LandingGlobe() {
  const lang = useLandingLanguage();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [land, setLand] = useState<Land | null>(null);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  activeRef.current = active;
  const [reduced, setReduced] = useState(false);
  const rotRef = useRef<[number, number, number]>([-HOTSPOTS[0].lng, -HOTSPOTS[0].lat + 8, 0]);
  const travelRef = useRef<{ from: [number, number]; to: [number, number]; start: number } | null>(null);
  const dragRef = useRef<{ x: number; y: number; rot: [number, number, number] } | null>(null);
  const pausedUntilRef = useRef(0);
  const visibleRef = useRef(true);
  const hotspotScreenRef = useRef<{ i: number; x: number; y: number }[]>([]);
  const incidentsRef = useRef<Incident[]>([]);
  const [incidentCount, setIncidentCount] = useState<number | null>(null);
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
    // 실제 최근 해상 피습 경보(UKMTO) — 60일 안의 것만 붉은 점으로
    fetch("/api/ukmto", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((p: { incidents?: Array<{ lat?: number; lng?: number; utcDateOfIncident?: string | null }> } | null) => {
        if (!alive || !p?.incidents) return;
        const cutoff = Date.now() - 60 * 86_400_000;
        const pts = p.incidents
          .filter((x) => Number.isFinite(x.lat) && Number.isFinite(x.lng))
          .filter((x) => {
            const t = x.utcDateOfIncident ? Date.parse(x.utcDateOfIncident) : Number.NaN;
            return Number.isFinite(t) && t >= cutoff;
          })
          .map((x) => ({ lng: x.lng as number, lat: x.lat as number }));
        incidentsRef.current = pts;
        setIncidentCount(pts.length);
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
    travelRef.current = { from: [-lam, -phi], to: [h.lng, h.lat - 8], start: performance.now() };
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
        travelRef.current = { from: [-lam, -phi], to: [h.lng, h.lat - 8], start: performance.now() };
        return next;
      });
    }, TRAVEL_MS + HOLD_MS);
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

      // 바닷길(연출) + 그 위를 흐르는 배
      ctx.setLineDash([2, 4]);
      ctx.strokeStyle = "rgba(147,197,253,0.22)";
      ctx.lineWidth = 0.9;
      LANES.forEach((lane) => {
        ctx.beginPath();
        path({ type: "LineString", coordinates: lane });
        ctx.stroke();
      });
      ctx.setLineDash([]);
      LANES.forEach((lane, li) => {
        const segs = lane.length - 1;
        for (let k = 0; k < 3; k++) {
          const u = (((now / 1000) * 0.035 + k / 3 + li * 0.17) % 1) * segs;
          const si = Math.min(segs - 1, Math.floor(u));
          const [lng, lat] = geoInterpolate(lane[si], lane[si + 1])(u - si);
          if (!front(lng, lat)) continue;
          const q = projection([lng, lat]);
          if (!q) continue;
          const g = ctx.createRadialGradient(q[0], q[1], 0, q[0], q[1], 6);
          g.addColorStop(0, "rgba(191,219,254,0.95)");
          g.addColorStop(1, "rgba(147,197,253,0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(q[0], q[1], 6, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // 실제 최근 UKMTO 경보
      const ping = (now % 1600) / 1600;
      incidentsRef.current.forEach((pt, n) => {
        if (!front(pt.lng, pt.lat)) return;
        const q = projection([pt.lng, pt.lat]);
        if (!q) return;
        const ph = (ping + n * 0.13) % 1;
        if (!reduced) {
          ctx.strokeStyle = `rgba(248,113,113,${0.7 * (1 - ph)})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(q[0], q[1], 3 + ph * 12, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.fillStyle = "#f87171";
        ctx.beginPath();
        ctx.arc(q[0], q[1], 2.4, 0, Math.PI * 2);
        ctx.fill();
      });

      // 길목 점
      const screen: { i: number; x: number; y: number }[] = [];
      const pulse = (now % 2000) / 2000;
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
      });
      hotspotScreenRef.current = screen;
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
        {/* 지금 보는 곳 카드 */}
        <div
          key={h.id}
          aria-live="polite"
          className="pointer-events-none absolute bottom-2 left-1/2 w-[min(92%,380px)] -translate-x-1/2 rounded-lg border border-white/12 bg-[#05080d]/88 px-4 py-3 backdrop-blur motion-safe:animate-[landing-card_0.5s_ease-out]"
        >
          <p className="m-0 text-[15px] font-bold text-[#f5c451]">{h.name}</p>
          <p className="mb-0 mt-1 text-sm leading-snug text-[#d7e0e6]">{h.why}</p>
          <p className="mb-0 mt-1.5 text-caption leading-snug text-[#8fa3b1]">
            {pick(lang, "지구본에서 보는 것", "On the globe")} · {h.see}
          </p>
        </div>
      </div>
      <p className="m-0 text-center text-caption text-[#7d8f9c]">
        <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-[#f87171] align-middle" />
        {incidentCount != null && incidentCount > 0
          ? pick(
              lang,
              `붉은 점: 최근 60일 실제 UKMTO 해상 경보 ${incidentCount}건`,
              `Red dots: ${incidentCount} real UKMTO maritime alerts in the last 60 days`,
            )
          : pick(lang, "붉은 점: 최근 UKMTO 해상 경보", "Red dots: recent UKMTO maritime alerts")}
        <span className="mx-2 text-white/20">|</span>
        {pick(lang, "흐르는 배와 점선 항로는 이해를 돕는 연출입니다", "Moving ships and dotted routes are illustrations, not live tracks")}
      </p>
      <div className="flex flex-wrap justify-center gap-1.5" role="group" aria-label={pick(lang, "길목 고르기", "Choose a passage")}>
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
