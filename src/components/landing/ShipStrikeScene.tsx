"use client";

import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/hooks/useReducedMotion";

/**
 * 상선이 드론·미사일·기뢰에 공격받는 장면(연출). 홍해·호르무즈에서 실제로 일어나는 위협이
 * 어떤 모습인지 한눈에 보이게 하려는 그림이며, 실제 사건 영상이 아니다(화면에 밝힌다).
 *
 * 2D 캔버스 하나로 그린다: 저녁 하늘과 바다 → 유조선이 지나감 → 위협이 날아와 맞음 → 폭발·불·연기 → 다음 위협.
 * 화면 밖이거나 탭이 숨으면 멈추고, 동작 줄이기 설정이면 맞은 뒤 연기 나는 한 장면으로 멈춘다.
 */

type Kind = "drone" | "missile" | "mine";

export const THREATS: { kind: Kind; title: string; body: string }[] = [
  {
    kind: "drone",
    title: "자폭 드론 · 샤헤드 계열",
    body: "이란이 설계한 샤헤드 계열 자폭 드론은 느리지만 싸고 멀리 날아옵니다. 예멘 후티는 이란제·이란 설계 드론으로 홍해의 상선을 공격해 왔습니다.",
  },
  {
    kind: "missile",
    title: "대함 미사일",
    body: "후티는 2023년 말부터 홍해와 아덴만을 지나는 상선에 대함 탄도·순항 미사일을 쏴 왔습니다. 바다 위를 낮게 날아와 몇 분 안에 닿습니다.",
  },
  {
    kind: "mine",
    title: "기뢰",
    body: "물속에 숨어 있다가 배 밑에서 터집니다. 1980년대 '유조선 전쟁' 때 걸프에서 상선과 군함이 기뢰에 맞았고, 호르무즈처럼 좁은 해협을 막는 데 쓰일 수 있습니다.",
  },
];

const CYCLE_MS = 7200;
const IMPACT_AT = 0.42;

type P = { x: number; y: number; vx: number; vy: number; life: number; max: number; r: number; kind: "spark" | "fire" | "smoke" | "spray" };

export function ShipStrikeScene() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [idx, setIdx] = useState(0);
  const idxRef = useRef(0);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduced = prefersReducedMotion();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let W = 0;
    let H = 0;
    const resize = () => {
      W = Math.max(320, wrap.clientWidth);
      H = Math.round(W * (W < 640 ? 0.62 : 0.42));
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e?.isIntersecting ?? true));
    io.observe(wrap);

    let parts: P[] = [];
    let cycleStart = performance.now();
    let hitDone = false;
    let shake = 0;
    let flash = 0;
    let ring: { x: number; y: number; at: number } | null = null;
    const stars = Array.from({ length: 60 }, () => ({ x: Math.random(), y: Math.random() * 0.45, a: Math.random() }));

    const emit = (x: number, y: number, kind: P["kind"], n: number, spread: number, up: number) => {
      for (let i = 0; i < n; i++) {
        if (kind === "spray") {
          // 기뢰 물기둥 — 거의 위로만 솟구친다
          const max = 1100 + Math.random() * 500;
          parts.push({ x: x + (Math.random() - 0.5) * 30, y, vx: (Math.random() - 0.5) * 0.07, vy: -(0.18 + Math.random() * 0.42), life: 0, max, r: 2 + Math.random() * 4, kind });
          continue;
        }
        const a = Math.random() * Math.PI * 2;
        const s = Math.random() * spread;
        const max = kind === "smoke" ? 2600 + Math.random() * 1600 : kind === "fire" ? 700 + Math.random() * 600 : 500 + Math.random() * 500;
        parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - up, life: 0, max, r: kind === "smoke" ? 6 + Math.random() * 8 : kind === "fire" ? 4 + Math.random() * 6 : 1.2 + Math.random() * 1.6, kind });
      }
    };

    /** 유조선 옆모습 — 원점은 배 가운데 수면 */
    const drawShip = (sx: number, sy: number, L: number, tilt: number) => {
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(tilt);
      const h = L * 0.075;
      // 선체
      ctx.fillStyle = "#1b2732";
      ctx.beginPath();
      ctx.moveTo(-L / 2, -h);
      ctx.lineTo(L / 2 - L * 0.04, -h);
      ctx.lineTo(L / 2, -h * 0.4);
      ctx.lineTo(L / 2 - L * 0.03, h * 0.55);
      ctx.lineTo(-L / 2 + L * 0.02, h * 0.55);
      ctx.closePath();
      ctx.fill();
      // 흘수선 붉은 띠
      ctx.fillStyle = "#7a2b2b";
      ctx.fillRect(-L / 2 + L * 0.02, h * 0.18, L - L * 0.05, h * 0.37);
      // 갑판 배관
      ctx.strokeStyle = "#3a4b59";
      ctx.lineWidth = Math.max(1, L * 0.004);
      ctx.beginPath();
      ctx.moveTo(-L * 0.3, -h - 2);
      ctx.lineTo(L * 0.4, -h - 2);
      ctx.stroke();
      // 선교(뒤쪽 상부 구조물)
      ctx.fillStyle = "#e6edf2";
      ctx.fillRect(-L * 0.44, -h - L * 0.11, L * 0.1, L * 0.11);
      ctx.fillStyle = "#c3ccd4";
      ctx.fillRect(-L * 0.46, -h - L * 0.125, L * 0.14, L * 0.02);
      // 굴뚝
      ctx.fillStyle = "#2b3a46";
      ctx.fillRect(-L * 0.42, -h - L * 0.16, L * 0.04, L * 0.05);
      // 창문
      ctx.fillStyle = "#f5c451";
      for (let i = 0; i < 4; i++) ctx.fillRect(-L * 0.43 + i * L * 0.02, -h - L * 0.09, L * 0.01, L * 0.008);
      ctx.restore();
    };

    /** 샤헤드식 델타익 드론 실루엣(일반화한 모양) */
    const drawDrone = (x: number, y: number, s: number, ang: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ang);
      ctx.fillStyle = "#cbd5dc";
      ctx.beginPath();
      ctx.moveTo(-s, 0);
      ctx.lineTo(s * 0.7, -s * 0.9);
      ctx.lineTo(s * 0.55, 0);
      ctx.lineTo(s * 0.7, s * 0.9);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#e6edf2";
      ctx.fillRect(-s * 0.9, -s * 0.12, s * 1.6, s * 0.24);
      ctx.restore();
    };

    const drawMissile = (x: number, y: number, s: number, ang: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ang);
      ctx.fillStyle = "#e6edf2";
      ctx.beginPath();
      ctx.moveTo(-s * 1.4, 0);
      ctx.lineTo(-s * 0.9, -s * 0.22);
      ctx.lineTo(s, -s * 0.22);
      ctx.lineTo(s, s * 0.22);
      ctx.lineTo(-s * 0.9, s * 0.22);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#ffb02a";
      ctx.beginPath();
      ctx.moveTo(s, -s * 0.18);
      ctx.lineTo(s + s * (0.8 + Math.random() * 0.6), 0);
      ctx.lineTo(s, s * 0.18);
      ctx.fill();
      ctx.restore();
    };

    const drawMine = (x: number, y: number, s: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.strokeStyle = "rgba(160,180,190,0.6)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, s);
      ctx.lineTo(0, s * 6);
      ctx.stroke();
      ctx.fillStyle = "#2f3b44";
      ctx.beginPath();
      ctx.arc(0, 0, s, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#4c5e6a";
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * s, Math.sin(a) * s);
        ctx.lineTo(Math.cos(a) * s * 1.45, Math.sin(a) * s * 1.45);
        ctx.stroke();
      }
      ctx.restore();
    };

    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!visible || document.hidden) {
        last = now;
        return;
      }
      const dt = Math.min(50, now - last);
      last = now;
      let t = reduced ? 0.7 : (now - cycleStart) / CYCLE_MS;
      if (t >= 1) {
        cycleStart = now;
        t = 0;
        hitDone = false;
        parts = parts.filter((p) => p.kind === "smoke");
        idxRef.current = (idxRef.current + 1) % THREATS.length;
        setIdx(idxRef.current);
      }
      const kind = THREATS[idxRef.current].kind;
      const horizon = H * 0.48;

      // 배 위치 — 천천히 왼쪽에서 오른쪽으로
      const L = Math.min(W * 0.46, 520);
      const shipX = W * 0.22 + t * W * 0.18;
      const bob = Math.sin(now / 900) * 2;
      const shipY = horizon + H * 0.2 + bob;
      const hitX = shipX + L * 0.12;
      const hitY = shipY - L * 0.075;

      // 충돌
      if (!hitDone && t >= IMPACT_AT) {
        hitDone = true;
        shake = 1;
        flash = 1;
        ring = { x: hitX, y: kind === "mine" ? shipY : hitY, at: now };
        if (kind === "mine") {
          emit(hitX - L * 0.05, shipY + 4, "spray", 120, 0.35, 0.55);
          emit(hitX, shipY, "smoke", 18, 0.05, 0.03);
        } else {
          emit(hitX, hitY, "spark", 70, 0.6, 0.15);
          emit(hitX, hitY, "fire", 40, 0.18, 0.08);
          emit(hitX, hitY, "smoke", 22, 0.06, 0.04);
        }
      }
      // 맞은 뒤에는 불·연기가 계속 오른다
      if (hitDone || reduced) {
        if (Math.random() < 0.5) emit(hitX + (Math.random() - 0.5) * L * 0.08, hitY, "fire", 1, 0.03, 0.06);
        if (Math.random() < 0.35) emit(hitX + (Math.random() - 0.5) * L * 0.06, hitY - 6, "smoke", 1, 0.02, 0.035);
      }

      shake *= 0.9;
      flash *= 0.88;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.save();
      if (shake > 0.02) ctx.translate((Math.random() - 0.5) * 10 * shake, (Math.random() - 0.5) * 6 * shake);

      // 하늘
      const sky = ctx.createLinearGradient(0, 0, 0, horizon);
      sky.addColorStop(0, "#050a12");
      sky.addColorStop(0.7, "#132235");
      sky.addColorStop(1, "#3a2a2a");
      ctx.fillStyle = sky;
      ctx.fillRect(-20, -20, W + 40, horizon + 20);
      stars.forEach((s) => {
        ctx.fillStyle = `rgba(230,237,242,${0.25 + 0.35 * Math.abs(Math.sin(now / 1300 + s.a * 9))})`;
        ctx.fillRect(s.x * W, s.y * H, 1.2, 1.2);
      });
      // 수평선 빛
      const glow = ctx.createRadialGradient(W * 0.82, horizon, 0, W * 0.82, horizon, W * 0.4);
      glow.addColorStop(0, "rgba(255,140,60,0.28)");
      glow.addColorStop(1, "rgba(255,140,60,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, horizon + 40);

      // 바다
      const sea = ctx.createLinearGradient(0, horizon, 0, H);
      sea.addColorStop(0, "#0d2233");
      sea.addColorStop(1, "#040a12");
      ctx.fillStyle = sea;
      ctx.fillRect(-20, horizon, W + 40, H - horizon + 20);
      ctx.strokeStyle = "rgba(94,234,212,0.08)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 14; i++) {
        const y = horizon + ((i + 1) / 15) ** 1.6 * (H - horizon);
        ctx.beginPath();
        for (let x = 0; x <= W; x += 16) {
          const yy = y + Math.sin(x * 0.02 + now / 700 + i) * (1 + i * 0.25);
          if (x === 0) ctx.moveTo(x, yy);
          else ctx.lineTo(x, yy);
        }
        ctx.stroke();
      }

      // 기뢰는 수면 아래
      if (kind === "mine" && !hitDone && !reduced) {
        drawMine(hitX - L * 0.05, shipY + L * 0.09, Math.max(5, L * 0.018));
      }

      // 배
      drawShip(shipX, shipY, L, hitDone ? Math.min(0.02, (t - IMPACT_AT) * 0.04) : 0);

      // 날아오는 위협
      if (!hitDone && !reduced && kind !== "mine") {
        const u = Math.min(1, t / IMPACT_AT);
        if (kind === "drone") {
          const sx = W + 40;
          const sy = H * 0.12;
          const x = sx + (hitX - sx) * u;
          const y = sy + (hitY - sy) * u ** 2.2 + Math.sin(now / 120) * 2 * (1 - u);
          const ang = Math.atan2(hitY - sy, hitX - sx) * u * 0.6;
          // 날아온 길 잔상
          ctx.strokeStyle = "rgba(248,113,113,0.25)";
          ctx.setLineDash([3, 5]);
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(x, y);
          ctx.stroke();
          ctx.setLineDash([]);
          drawDrone(x, y, Math.max(10, W * 0.02), ang);
        } else {
          const sx = W + 60;
          const sy = horizon - 6;
          const x = sx + (hitX - sx) * u;
          const y = sy + (hitY - sy) * u + Math.sin(u * Math.PI) * -H * 0.04;
          // 연기 꼬리
          if (Math.random() < 0.9) emit(x + W * 0.012, y, "smoke", 1, 0.01, 0.005);
          drawMissile(x, y, Math.max(10, W * 0.016), 0);
        }
      }

      // 입자
      parts = parts.filter((p) => (p.life += dt) < p.max);
      for (const p of parts) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.kind === "spark" || p.kind === "spray") p.vy += 0.0009 * dt;
        if (p.kind === "smoke") p.vx += 0.00002 * dt;
        const k = p.life / p.max;
        if (p.kind === "spark") {
          ctx.fillStyle = `rgba(255,220,140,${1 - k})`;
          ctx.fillRect(p.x, p.y, p.r, p.r);
        } else if (p.kind === "fire") {
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * (1 + k));
          g.addColorStop(0, `rgba(255,240,180,${0.9 * (1 - k)})`);
          g.addColorStop(0.4, `rgba(255,140,40,${0.7 * (1 - k)})`);
          g.addColorStop(1, "rgba(255,60,10,0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * (1 + k), 0, Math.PI * 2);
          ctx.fill();
        } else if (p.kind === "spray") {
          ctx.fillStyle = `rgba(220,235,245,${0.85 * (1 - k)})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = `rgba(70,74,80,${0.32 * (1 - k)})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * (1 + k * 3), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // 충격파
      if (ring) {
        const k = (now - ring.at) / 700;
        if (k < 1) {
          ctx.strokeStyle = `rgba(255,220,160,${0.8 * (1 - k)})`;
          ctx.lineWidth = 3 * (1 - k) + 0.5;
          ctx.beginPath();
          ctx.ellipse(ring.x, ring.y, 10 + k * W * 0.16, 4 + k * W * 0.05, 0, 0, Math.PI * 2);
          ctx.stroke();
        } else ring = null;
      }
      ctx.restore();

      // 번쩍
      if (flash > 0.02) {
        ctx.fillStyle = `rgba(255,230,180,${flash * 0.35})`;
        ctx.fillRect(0, 0, W, H);
      }
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  const th = THREATS[idx];
  return (
    <figure className="m-0">
      <div ref={wrapRef} className="relative overflow-hidden rounded-2xl border border-white/10">
        <canvas ref={canvasRef} role="img" aria-label={`연출 장면: 상선이 ${th.title}에 공격받는 모습`} className="block w-full" />
        <div className="pointer-events-none absolute left-4 top-4 flex flex-wrap gap-1.5">
          {THREATS.map((x, i) => (
            <span
              key={x.kind}
              className={`rounded-full border px-3 py-1 text-caption font-semibold backdrop-blur ${
                i === idx ? "border-[#f87171] bg-[#f87171]/20 text-[#fecaca]" : "border-white/15 bg-black/30 text-[#8fa3b1]"
              }`}
            >
              {x.title}
            </span>
          ))}
        </div>
        <span className="pointer-events-none absolute right-4 top-4 rounded bg-black/40 px-2 py-1 text-micro text-[#a3b3bf]">연출 장면 · 실제 영상 아님</span>
      </div>
      <figcaption key={th.kind} aria-live="polite" className="mt-5 max-w-[760px] motion-safe:animate-[landing-fade_0.5s_ease-out]">
        <span className="block text-xl font-bold text-white">{th.title}</span>
        <span className="mt-2 block text-[16px] leading-[1.75] text-[#a3b3bf]">{th.body}</span>
      </figcaption>
    </figure>
  );
}
