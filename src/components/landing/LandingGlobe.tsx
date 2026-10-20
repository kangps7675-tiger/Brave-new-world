"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { geoGraticule10, geoInterpolate, geoOrthographic, geoPath, type GeoPermissibleObjects } from "d3-geo";
import { prefersReducedMotion } from "@/hooks/useReducedMotion";

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

type Land = GeoPermissibleObjects;

const TRAVEL_MS = 1500;
const HOLD_MS = 3800;

export function LandingGlobe() {
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

      // 길목 점
      const center: [number, number] = [-rotRef.current[0], -rotRef.current[1]];
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

  const h = HOTSPOTS[active];

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div ref={wrapRef} className="relative mx-auto aspect-square w-full max-w-[520px]">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`지구본. 지금 ${h.name}을 보여 주고 있습니다.`}
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
          <p className="mb-0 mt-1.5 text-caption leading-snug text-[#8fa3b1]">지구본에서 보는 것 · {h.see}</p>
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-1.5" role="group" aria-label="길목 고르기">
        {HOTSPOTS.map((s, i) => (
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
            {s.name}
          </button>
        ))}
      </div>
    </div>
  );
}
