"use client";

import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/hooks/useReducedMotion";

/**
 * 상선이 드론·미사일·기뢰에 공격받는 장면(연출). 실제 사건 영상이 아니다(화면에 밝힌다).
 * 작은 화면 세 개를 가로로 놓고 드론 → 미사일 → 기뢰 순서로 하나씩 재생한다. 쉬는 화면은 멀쩡한 배 한 장.
 *
 * 한 바퀴(약 9.5초)는 늘 멀쩡한 배에서 시작한다:
 *   멀쩡히 항해 → 위협이 날아옴(또는 기뢰 위로 지나감) → 폭발 → 불기둥·검은 연기가 치솟음 → 어두워졌다가 다음 위협.
 *
 * 폭발은 2D 캔버스 위의 작은 물리 시뮬레이션이다.
 *  - 불덩이: 미리 구운 부드러운 불 스프라이트를 더하기 합성(lighter)으로 겹치고, 나이에 따라 흰색→노랑→주황→암적색으로 식는다
 *  - 연기: 노이즈를 구운 연기 스프라이트가 부력으로 오르고, 바람에 밀리며 부풀고, 회전한다
 *  - 파편: 중력·공기저항을 받는 조각이 연기 꼬리를 끌고 날아가 바다에 떨어지며 물보라를 낸다
 *  - 불씨·옅은 섬광·충격파, 불빛이 배와 수면을 비춘다(게임처럼 보이지 않게 화면 흔들림은 뺐다)
 *  - 배: 롤·히브 스프링. 충격을 받으면 흔들리다 기울어진 채로 멈추고, 기뢰면 들렸다가 가라앉는다
 * Unity(C#) 같은 엔진은 수십 MB를 받아야 하고 아래에서 도는 실제 지구본과 GPU를 다퉈서 쓰지 않았다.
 * 화면 밖·탭 숨김이면 멈추고, 동작 줄이기 설정이면 폭발 직후 한 장면만 그린다.
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

const CYCLE = 9500;
const APPROACH = 1700;
const IMPACT = 3700;
const FADE_OUT = 650;
const FADE_IN = 500;
const MAX_PARTS = 950;

type PKind = "fire" | "smoke" | "ember" | "debris" | "spray" | "mist" | "flame";
type P = {
  k: PKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  r: number;
  grow: number;
  rot: number;
  vr: number;
  a: number;
  trail?: number;
};

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

/** 노이즈 섞인 연기 덩어리 스프라이트 (회색, 가장자리 부드럽게) */
function makeSmoke(size: number, tone: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const tmp = document.createElement("canvas");
  tmp.width = tmp.height = size;
  const t = tmp.getContext("2d")!;
  for (let i = 0; i < 26; i++) {
    const x = size / 2 + rnd(-0.14, 0.14) * size;
    const y = size / 2 + rnd(-0.14, 0.14) * size;
    const r = rnd(0.1, 0.24) * size;
    const v = Math.round(tone + rnd(-18, 18));
    const gr = t.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(${v},${v},${v + 4},0.55)`);
    gr.addColorStop(1, `rgba(${v},${v},${v + 4},0)`);
    t.fillStyle = gr;
    t.beginPath();
    t.arc(x, y, r, 0, Math.PI * 2);
    t.fill();
  }
  g.filter = `blur(${Math.round(size * 0.035)}px)`;
  g.drawImage(tmp, 0, 0);
  // 둥근 마스크로 사각 가장자리를 없앤다
  g.filter = "none";
  g.globalCompositeOperation = "destination-in";
  const m = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size * 0.48);
  m.addColorStop(0, "rgba(0,0,0,1)");
  m.addColorStop(0.55, "rgba(0,0,0,0.75)");
  m.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = m;
  g.fillRect(0, 0, size, size);
  return c;
}

/** 불 스프라이트 — stops: [위치, 색] */
function makeGlow(size: number, stops: [number, string][]): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([o, col]) => gr.addColorStop(o, col));
  g.fillStyle = gr;
  g.fillRect(0, 0, size, size);
  return c;
}

/**
 * 공격 한 종류를 보여주는 작은 화면 하나.
 * active일 때만 한 바퀴를 재생하고, 끝나면 onDone을 부른 뒤 멀쩡한 배 한 장으로 멈춰 있는다.
 */
function StrikePanel({ kind, active, onDone, reduced }: { kind: Kind; active: boolean; onDone: () => void; reduced: boolean }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(active);
  activeRef.current = active;
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.25);

    const SMOKE_DARK = [makeSmoke(128, 34), makeSmoke(128, 46), makeSmoke(128, 28)];
    const SMOKE_LIGHT = [makeSmoke(128, 150), makeSmoke(128, 175)];
    const FIRE_HOT = makeGlow(64, [[0, "rgba(255,255,240,1)"], [0.25, "rgba(255,230,150,0.95)"], [0.55, "rgba(255,150,40,0.55)"], [1, "rgba(255,80,10,0)"]]);
    const FIRE_MID = makeGlow(64, [[0, "rgba(255,200,90,0.95)"], [0.45, "rgba(255,110,25,0.6)"], [1, "rgba(200,40,5,0)"]]);
    const FIRE_COOL = makeGlow(64, [[0, "rgba(200,70,20,0.75)"], [0.5, "rgba(120,30,10,0.4)"], [1, "rgba(60,15,5,0)"]]);
    const SPRAY = makeGlow(32, [[0, "rgba(235,245,250,0.95)"], [0.6, "rgba(200,220,235,0.45)"], [1, "rgba(180,200,220,0)"]]);

    let W = 0;
    let H = 0;
    const resize = () => {
      W = Math.max(240, wrap.clientWidth);
      H = Math.round(W * 0.62);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e?.isIntersecting ?? true));
    io.observe(wrap);

    const stars = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random() * 0.42, a: Math.random() }));

    // ── 상태 ──
    let clock = 0; // 이번 바퀴 경과 ms
    let parts: P[] = [];
    let hit = false;
    let light = 0;
    let flash = 0;
    let ring = -1;
    let hitPt = { x: 0, y: 0 };
    let roll = 0;
    let vroll = 0;
    let heave = 0;
    let vheave = 0;
    let rollRest = 0;
    let sink = 0;
    let fireRate = 0;

    const geo = () => {
      const horizon = H * 0.5;
      const L = W * 0.6;
      const shipX = W * 0.36 + (clock / CYCLE) * W * 0.08;
      const seaY = horizon + H * 0.22;
      return { horizon, L, shipX, seaY };
    };

    const push = (p: P) => {
      if (parts.length < MAX_PARTS) parts.push(p);
    };
    const base = (k: PKind, x: number, y: number, o: Partial<P>): P => ({ k, x, y, vx: 0, vy: 0, age: 0, life: 1000, r: 4, grow: 1, rot: rnd(0, 6.28), vr: rnd(-0.0008, 0.0008), a: 1, ...o });

    const explode = (x: number, y: number, kind: Kind) => {
      const { L, seaY } = geo();
      hit = true;
      hitPt = { x, y };
      light = 1;
      flash = kind === "mine" ? 0.7 : 1;

      ring = 0;
      const s = L / 520;
      if (kind === "mine") {
        // 배 밑 물기둥 + 안개 + 작은 불덩이
        for (let i = 0; i < 190; i++) {
          push(base("spray", x + rnd(-L * 0.06, L * 0.06), seaY + rnd(-4, 6), { vx: rnd(-0.06, 0.06), vy: -rnd(0.32, 0.85) * s, life: rnd(1400, 2300), r: rnd(5, 15) * s }));
        }
        for (let i = 0; i < 34; i++) {
          push(base("mist", x + rnd(-L * 0.08, L * 0.08), seaY - rnd(0, 60) * s, { vx: rnd(-0.03, 0.03), vy: -rnd(0.03, 0.12), life: rnd(2200, 3600), r: rnd(22, 46) * s, grow: rnd(1.6, 2.6) }));
        }
        for (let i = 0; i < 10; i++) {
          push(base("fire", x + rnd(-14, 14), y + rnd(-6, 6), { vx: rnd(-0.08, 0.08), vy: -rnd(0.02, 0.12), life: rnd(500, 900), r: rnd(18, 34) * s, grow: 2 }));
        }
        vheave -= 0.075 * s; // 들썩
        vroll += 0.0006;
        rollRest = 0.03;
        sink = 7 * s;
      } else {
        const big = kind === "missile" ? 1.25 : 1;
        // 불덩이
        for (let i = 0; i < 34 * big; i++) {
          const a = rnd(0, Math.PI * 2);
          const sp = rnd(0.03, 0.2) * s * big;
          push(base("fire", x + rnd(-8, 8), y + rnd(-6, 6), { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.7 - rnd(0.02, 0.08), life: rnd(650, 1350), r: rnd(16, 40) * s * big, grow: rnd(2, 3.2) }));
        }
        // 불씨
        for (let i = 0; i < 110 * big; i++) {
          const a = rnd(-Math.PI, 0);
          const sp = rnd(0.15, 0.62) * s;
          push(base("ember", x, y, { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rnd(700, 1900), r: rnd(1, 2.4) }));
        }
        // 파편
        for (let i = 0; i < 16 * big; i++) {
          const a = rnd(-Math.PI * 0.95, -Math.PI * 0.05);
          const sp = rnd(0.14, 0.42) * s;
          push(base("debris", x, y, { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 4000, r: rnd(2, 5) * s, vr: rnd(-0.02, 0.02), trail: 0 }));
        }
        // 첫 연기
        for (let i = 0; i < 22; i++) {
          push(base("smoke", x + rnd(-20, 20), y + rnd(-10, 6), { vx: rnd(-0.04, 0.04), vy: -rnd(0.02, 0.07), life: rnd(2400, 4200), r: rnd(18, 34) * s, grow: rnd(2.2, 3.4), a: 0.9 }));
        }
        vroll += kind === "missile" ? -0.0007 : -0.0005;
        rollRest = kind === "missile" ? -0.022 : -0.014;
        sink = 2 * s;
      }
      fireRate = 1;
    };

    const reset = () => {
      clock = 0;
      parts = [];
      hit = false;
      light = flash = 0;
      ring = -1;
      roll = vroll = heave = vheave = rollRest = sink = fireRate = 0;
    };

    const update = (dt: number) => {
      clock += dt;
      const { L, shipX, seaY } = geo();
      const s = L / 520;
      const deckY = seaY - L * 0.075 + heave + sink;
      const hx = shipX + L * 0.1;

      if (!hit && clock >= IMPACT) {
        explode(hx, kind === "mine" ? seaY + 6 : deckY - 4, kind);
      }

      // 배 스프링(롤·히브)
      vroll += (-(roll - rollRest) * 0.00003 - vroll * 0.004) * dt;
      roll += vroll * dt;
      vheave += (-heave * 0.00005 - vheave * 0.006) * dt;
      heave += vheave * dt;

      light *= Math.pow(0.9965, dt);
      flash *= Math.pow(0.992, dt);
      if (ring >= 0) ring += dt;

      // 맞은 뒤: 불길과 검은 연기 기둥
      if (hit) {
        fireRate = Math.max(0.55, fireRate * Math.pow(0.9998, dt));
        const fx = hitPt.x + rnd(-L * 0.04, L * 0.04);
        const fy = kind === "mine" ? deckY - 2 : hitPt.y;
        const nFlame = (dt / 16) * 2.2 * fireRate;
        for (let i = 0; i < nFlame; i++) {
          push(base("flame", fx + rnd(-L * 0.02, L * 0.02), fy, { vx: rnd(-0.01, 0.01), vy: -rnd(0.06, 0.15) * s, life: rnd(380, 700), r: rnd(7, 15) * s, grow: 0.55 }));
        }
        const nSmoke = (dt / 16) * 1.9 * fireRate;
        for (let i = 0; i < nSmoke; i++) {
          push(base("smoke", fx, fy - 10 * s, { vx: rnd(-0.01, 0.015), vy: -rnd(0.04, 0.085) * s, life: rnd(4200, 6500), r: rnd(14, 24) * s, grow: rnd(3.5, 6), a: 0.9 }));
        }
      }

      const wind = 0.000012;
      for (const p of parts) {
        p.age += dt;
        p.rot += p.vr * dt;
        switch (p.k) {
          case "smoke":
          case "mist":
            p.vy -= 0.000006 * dt; // 부력
            p.vx += wind * dt;
            p.vx *= Math.pow(0.9995, dt);
            p.vy *= Math.pow(0.9993, dt);
            break;
          case "fire":
            p.vy -= 0.00004 * dt;
            p.vx *= Math.pow(0.996, dt);
            p.vy *= Math.pow(0.996, dt);
            break;
          case "flame":
            p.vx += wind * 0.6 * dt;
            break;
          case "ember":
            p.vy += 0.0005 * dt;
            p.vx *= Math.pow(0.999, dt);
            break;
          case "spray":
            p.vy += 0.00085 * dt;
            p.vx *= Math.pow(0.999, dt);
            break;
          case "debris":
            p.vy += 0.0007 * dt;
            p.vx *= Math.pow(0.9995, dt);
            p.trail = (p.trail ?? 0) + dt;
            if (p.trail > 45) {
              p.trail = 0;
              push(base("smoke", p.x, p.y, { vx: 0, vy: -0.01, life: rnd(900, 1500), r: rnd(3, 6) * s, grow: 3, a: 0.6 }));
            }
            if (p.y > seaY + 6 && p.vy > 0) {
              p.age = p.life; // 바다에 떨어짐 → 작은 물보라
              for (let i = 0; i < 8; i++) push(base("spray", p.x, seaY, { vx: rnd(-0.05, 0.05), vy: -rnd(0.12, 0.3), life: rnd(500, 900), r: rnd(2, 5) * s }));
            }
            break;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.k === "spray" && p.y > seaY + 10) p.age = p.life;
      }
      parts = parts.filter((p) => p.age < p.life);
    };

    // ── 그리기 ──
    const drawShip = (x: number, y: number, L: number, burning: boolean) => {
      const h = L * 0.075;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(roll);
      // 선체 — 유조선 옆모습. 오른쪽이 선수.
      //  선미: 갑판 끝에서 수직으로 내려오다 물 위에서 안쪽으로 깎인 트랜섬(counter stern)
      //  갑판: 평평한 상갑판, 선수 쪽 1/10은 한 단 높은 선수루(forecastle)
      //  선수: 위가 앞으로 나온 직선 경사 선수재 + 물 밑의 구상선수(bulbous bow)
      const fc = h * 0.28; // 선수루 높이
      const bowX = L / 2;
      const hull = ctx.createLinearGradient(0, -h - fc, 0, h * 0.6);
      hull.addColorStop(0, "#2c3b48");
      hull.addColorStop(1, "#131b23");
      ctx.fillStyle = hull;
      ctx.beginPath();
      ctx.moveTo(-L / 2, -h); // 선미 갑판 끝
      ctx.lineTo(bowX - L * 0.13, -h); // 상갑판
      ctx.lineTo(bowX - L * 0.12, -h - fc); // 선수루 단
      ctx.lineTo(bowX, -h - fc * 1.15); // 선수루 갑판(살짝 올라감)
      ctx.lineTo(bowX - L * 0.045, h * 0.05); // 경사 선수재 → 흘수선
      ctx.quadraticCurveTo(bowX - L * 0.01, h * 0.12, bowX - L * 0.02, h * 0.4); // 구상선수
      ctx.quadraticCurveTo(bowX - L * 0.035, h * 0.55, bowX - L * 0.08, h * 0.55);
      ctx.lineTo(-L / 2 + L * 0.06, h * 0.55); // 용골
      ctx.lineTo(-L / 2 + L * 0.03, -h * 0.05); // 선미 아래 깎인 면
      ctx.lineTo(-L / 2, -h * 0.25); // 트랜섬
      ctx.closePath();
      ctx.fill();
      // 흘수선 아래 붉은 선저 도료(선수·선미 곡선을 따라가도록 선체 모양으로 잘라 칠함)
      ctx.save();
      ctx.clip();
      ctx.fillStyle = "#6e2626";
      ctx.fillRect(-L / 2, h * 0.18, L, h);
      ctx.restore();
      // 갑판 가장자리 밝은 선
      ctx.strokeStyle = "#5b6d7c";
      ctx.lineWidth = Math.max(1, L * 0.003);
      ctx.beginPath();
      ctx.moveTo(-L / 2, -h);
      ctx.lineTo(bowX - L * 0.13, -h);
      ctx.moveTo(bowX - L * 0.12, -h - fc);
      ctx.lineTo(bowX, -h - fc * 1.15);
      ctx.stroke();
      // 상갑판 장비: 화물 배관 + 캣워크(난간 통로), 중앙 매니폴드 크레인, 선수 마스트
      const dk = -h;
      ctx.strokeStyle = "#465867";
      ctx.lineWidth = Math.max(1, L * 0.0028);
      ctx.beginPath();
      ctx.moveTo(-L * 0.33, dk - L * 0.006);
      ctx.lineTo(bowX - L * 0.13, dk - L * 0.006);
      ctx.moveTo(-L * 0.33, dk - L * 0.016);
      ctx.lineTo(bowX - L * 0.13, dk - L * 0.016);
      for (let i = 0; i <= 14; i++) {
        const px = -L * 0.33 + (i / 14) * (bowX - L * 0.13 + L * 0.33);
        ctx.moveTo(px, dk);
        ctx.lineTo(px, dk - L * 0.016);
      }
      // 매니폴드 크레인
      ctx.moveTo(L * 0.02, dk);
      ctx.lineTo(L * 0.02, dk - L * 0.045);
      ctx.lineTo(L * 0.07, dk - L * 0.02);
      // 선수 마스트
      ctx.moveTo(bowX - L * 0.06, dk - fc);
      ctx.lineTo(bowX - L * 0.06, dk - fc - L * 0.05);
      ctx.stroke();
      // 선미 거주구역(브리지) — 층이 진 흰 블록 + 양옆으로 튀어나온 브리지 윙
      const ax = -L * 0.45;
      ctx.fillStyle = "#dfe6ec";
      ctx.fillRect(ax, dk - L * 0.1, L * 0.1, L * 0.1);
      ctx.fillStyle = "#cfd7de";
      ctx.fillRect(ax + L * 0.008, dk - L * 0.125, L * 0.084, L * 0.026);
      ctx.fillStyle = "#bfc9d1";
      ctx.fillRect(ax - L * 0.015, dk - L * 0.128, L * 0.13, L * 0.012);
      // 굴뚝 — 거주구역 뒤쪽, 위가 뒤로 기운 사다리꼴
      ctx.fillStyle = "#2b3a46";
      ctx.beginPath();
      ctx.moveTo(ax - L * 0.005, dk - L * 0.1);
      ctx.lineTo(ax + L * 0.03, dk - L * 0.1);
      ctx.lineTo(ax + L * 0.025, dk - L * 0.165);
      ctx.lineTo(ax - L * 0.012, dk - L * 0.165);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#6e2626";
      ctx.fillRect(ax - L * 0.011, dk - L * 0.165, L * 0.036, L * 0.01);
      // 창문 불빛
      ctx.fillStyle = "#f5c451";
      for (let i = 0; i < 4; i++) ctx.fillRect(ax + L * 0.015 + i * L * 0.02, dk - L * 0.115, L * 0.01, L * 0.007);
      for (let r = 0; r < 3; r++)
        for (let i = 0; i < 4; i++) ctx.fillRect(ax + L * 0.015 + i * L * 0.02, dk - L * 0.085 + r * L * 0.025, L * 0.008, L * 0.006);
      // 구명정(거주구역 옆 주황색)
      ctx.fillStyle = "#e0702c";
      ctx.fillRect(ax + L * 0.1, dk - L * 0.05, L * 0.03, L * 0.012);
      // 탄 자국·구멍
      if (burning) {
        const lx = hitPt.x - x;
        const g = ctx.createRadialGradient(lx, -h * 0.5, 0, lx, -h * 0.5, L * 0.09);
        g.addColorStop(0, "rgba(5,5,5,0.9)");
        g.addColorStop(1, "rgba(5,5,5,0)");
        ctx.fillStyle = g;
        ctx.fillRect(lx - L * 0.1, -h * 1.6, L * 0.2, h * 2.2);
      }
      ctx.restore();
    };

    const drawDrone = (x: number, y: number, s: number, ang: number, now: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ang);
      ctx.fillStyle = "#c9d2d9";
      ctx.beginPath();
      ctx.moveTo(-s, 0);
      ctx.lineTo(s * 0.75, -s * 0.95);
      ctx.lineTo(s * 0.55, 0);
      ctx.lineTo(s * 0.75, s * 0.95);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#e9eef2";
      ctx.fillRect(-s * 0.95, -s * 0.12, s * 1.55, s * 0.24);
      // 뒤쪽 프로펠러 흐림
      ctx.strokeStyle = `rgba(230,237,242,${0.35 + 0.25 * Math.sin(now / 20)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(s * 0.62, 0, s * 0.06, s * 0.35, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    };

    const drawMissile = (x: number, y: number, s: number, ang: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ang);
      ctx.globalCompositeOperation = "lighter";
      ctx.drawImage(FIRE_HOT, s * 0.8, -s * 0.7, s * 2.2, s * 1.4);
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "#e6edf2";
      ctx.beginPath();
      ctx.moveTo(-s * 1.5, 0);
      ctx.quadraticCurveTo(-s * 1.1, -s * 0.22, -s * 0.8, -s * 0.2);
      ctx.lineTo(s, -s * 0.2);
      ctx.lineTo(s, s * 0.2);
      ctx.lineTo(-s * 0.8, s * 0.2);
      ctx.quadraticCurveTo(-s * 1.1, s * 0.22, -s * 1.5, 0);
      ctx.fill();
      ctx.fillStyle = "#98a6b1";
      ctx.beginPath();
      ctx.moveTo(s * 0.6, -s * 0.2);
      ctx.lineTo(s, -s * 0.55);
      ctx.lineTo(s, -s * 0.2);
      ctx.fill();
      ctx.restore();
    };

    const drawMine = (x: number, y: number, r: number) => {
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = "rgba(150,170,180,0.45)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y + r);
      ctx.lineTo(x, y + r * 7);
      ctx.stroke();
      const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
      g.addColorStop(0, "#4a5a64");
      g.addColorStop(1, "#1c252c");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#56697a";
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
        ctx.lineTo(x + Math.cos(a) * r * 1.45, y + Math.sin(a) * r * 1.45);
        ctx.stroke();
      }
      ctx.restore();
    };

    const sprite = (img: HTMLCanvasElement, x: number, y: number, r: number, alpha: number, rot = 0) => {
      if (alpha <= 0.003 || r <= 0.5) return;
      ctx.globalAlpha = Math.min(1, alpha);
      if (rot) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.drawImage(img, -r, -r, r * 2, r * 2);
        ctx.restore();
      } else ctx.drawImage(img, x - r, y - r, r * 2, r * 2);
    };

    const draw = (now: number, idle = false) => {
      const { horizon, L, shipX, seaY } = geo();
      const s = L / 520;
      const shipY = seaY + Math.sin(now / 950) * 1.6 + heave + sink;
      const deckY = shipY - L * 0.075;
      const hx = shipX + L * 0.1;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      ctx.save();

      // 하늘·별·수평선
      const sky = ctx.createLinearGradient(0, 0, 0, horizon);
      sky.addColorStop(0, "#04080f");
      sky.addColorStop(0.65, "#101e2f");
      sky.addColorStop(1, "#3b2a28");
      ctx.fillStyle = sky;
      ctx.fillRect(-20, -20, W + 40, horizon + 22);
      for (const st of stars) {
        ctx.fillStyle = `rgba(230,237,242,${0.2 + 0.35 * Math.abs(Math.sin(now / 1400 + st.a * 9))})`;
        ctx.fillRect(st.x * W, st.y * H, 1.2, 1.2);
      }
      const dusk = ctx.createRadialGradient(W * 0.85, horizon, 0, W * 0.85, horizon, W * 0.45);
      dusk.addColorStop(0, "rgba(255,140,60,0.26)");
      dusk.addColorStop(1, "rgba(255,140,60,0)");
      ctx.fillStyle = dusk;
      ctx.fillRect(0, 0, W, horizon + 40);

      // 바다
      const sea = ctx.createLinearGradient(0, horizon, 0, H);
      sea.addColorStop(0, "#0c2032");
      sea.addColorStop(1, "#03080f");
      ctx.fillStyle = sea;
      ctx.fillRect(-20, horizon, W + 40, H - horizon + 22);
      ctx.strokeStyle = "rgba(120,200,220,0.07)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 16; i++) {
        const y = horizon + ((i + 1) / 17) ** 1.7 * (H - horizon);
        ctx.beginPath();
        for (let x = -10; x <= W + 10; x += 14) {
          const yy = y + Math.sin(x * 0.018 + now / 650 + i * 1.3) * (0.8 + i * 0.28);
          if (x === -10) ctx.moveTo(x, yy);
          else ctx.lineTo(x, yy);
        }
        ctx.stroke();
      }
      // 뱃머리 물결
      ctx.strokeStyle = "rgba(220,235,245,0.18)";
      ctx.beginPath();
      ctx.moveTo(shipX + L / 2, shipY + L * 0.04);
      ctx.lineTo(shipX + L / 2 + 30, shipY + L * 0.05);
      ctx.stroke();

      // 불빛이 수면에 비침
      const glowI = light * 0.9 + (hit ? 0.35 * fireRate * (0.8 + 0.2 * Math.sin(now / 70)) : 0);
      if (glowI > 0.02) {
        ctx.globalCompositeOperation = "lighter";
        ctx.save();
        ctx.translate(hitPt.x, seaY + 4);
        ctx.scale(1, 0.32);
        const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, L * 0.6);
        rg.addColorStop(0, `rgba(255,150,60,${0.55 * glowI})`);
        rg.addColorStop(1, "rgba(255,120,40,0)");
        ctx.fillStyle = rg;
        ctx.fillRect(-L * 0.6, -L * 0.6, L * 1.2, L * 1.2);
        ctx.restore();
        ctx.globalCompositeOperation = "source-over";
      }

      // 기뢰(맞기 전, 수면 아래) — 배가 다가와 그 위를 지난다
      if (kind === "mine" && !hit) {
        const mx = hx + ((IMPACT - clock) * (W * 0.08)) / CYCLE;
        drawMine(mx, seaY + L * 0.085, Math.max(5, L * 0.017));
      }

      drawShip(shipX, shipY, L, hit);

      // 날아오는 위협
      if (!hit && clock > APPROACH && kind !== "mine") {
        const u = Math.min(1, (clock - APPROACH) / (IMPACT - APPROACH));
        if (kind === "drone") {
          const sx = W + 60;
          const sy = H * 0.1;
          const cruiseY = sy + H * 0.12 * u;
          const dive = Math.max(0, (u - 0.72) / 0.28);
          const x = sx + (hx - sx) * u;
          const y = cruiseY + (deckY - cruiseY) * dive ** 1.6 + Math.sin(now / 110) * 1.5 * (1 - dive);
          // 기수(왼쪽)를 아래로 숙이며 내리꽂는다
          const ang = 0.75 * dive;
          drawDrone(x, y, Math.max(8, W * 0.032), ang, now);
        } else {
          const sx = W + 80;
          const sy = deckY - 4;
          const x = sx + (hx - sx) * u;
          const pop = u > 0.8 ? Math.sin(((u - 0.8) / 0.2) * Math.PI) * -H * 0.05 : 0;
          const y = sy + pop;
          if (Math.random() < 0.95) push(base("smoke", x + W * 0.02, y, { vx: rnd(0.005, 0.02), vy: -rnd(0.002, 0.01), life: rnd(1400, 2200), r: rnd(4, 7) * s, grow: 3, a: 0.5 }));
          drawMissile(x, y, Math.max(8, W * 0.028), u > 0.8 ? Math.cos(((u - 0.8) / 0.2) * Math.PI) * -0.25 : 0);
        }
      }

      // 연기·안개 (보통 합성)
      for (const p of parts) {
        if (p.k !== "smoke" && p.k !== "mist") continue;
        const k = p.age / p.life;
        const r = p.r * (1 + (p.grow - 1) * Math.sqrt(k));
        const fadeIn = Math.min(1, p.age / 220);
        const alpha = p.a * fadeIn * (1 - k) ** 1.3;
        const img = p.k === "mist" ? SMOKE_LIGHT[(p.r | 0) % 2] : SMOKE_DARK[(p.r | 0) % 3];
        sprite(img, p.x, p.y, r, alpha * (p.k === "mist" ? 0.7 : 1), p.rot);
      }
      // 물보라
      for (const p of parts) {
        if (p.k !== "spray") continue;
        const k = p.age / p.life;
        sprite(SPRAY, p.x, p.y, p.r * (1 + k * 0.8), 0.9 * (1 - k));
      }
      // 파편
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#151a1f";
      for (const p of parts) {
        if (p.k !== "debris") continue;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillRect(-p.r, -p.r * 0.5, p.r * 2, p.r);
        ctx.restore();
      }

      // 불·불씨 (더하기 합성)
      ctx.globalCompositeOperation = "lighter";
      for (const p of parts) {
        const k = p.age / p.life;
        if (p.k === "fire") {
          const r = p.r * (1 + (p.grow - 1) * Math.sqrt(k));
          const img = k < 0.22 ? FIRE_HOT : k < 0.6 ? FIRE_MID : FIRE_COOL;
          sprite(img, p.x, p.y, r, (1 - k) ** 0.8);
        } else if (p.k === "flame") {
          const r = p.r * (1 - k * 0.45) * (0.85 + 0.3 * Math.random());
          sprite(k < 0.35 ? FIRE_HOT : FIRE_MID, p.x, p.y, r, 0.85 * (1 - k));
        } else if (p.k === "ember") {
          sprite(FIRE_HOT, p.x, p.y, p.r * 2.4, (1 - k) * 0.95);
        }
      }
      // 폭발 불빛이 배를 비춤
      if (light > 0.02) {
        const lg = ctx.createRadialGradient(hitPt.x, hitPt.y, 0, hitPt.x, hitPt.y, L * 0.7);
        lg.addColorStop(0, `rgba(255,190,110,${0.5 * light})`);
        lg.addColorStop(1, "rgba(255,120,40,0)");
        ctx.globalAlpha = 1;
        ctx.fillStyle = lg;
        ctx.fillRect(hitPt.x - L * 0.7, hitPt.y - L * 0.7, L * 1.4, L * 1.4);
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;

      // 충격파
      if (ring >= 0 && ring < 800) {
        const k = ring / 800;
        ctx.strokeStyle = `rgba(255,225,170,${0.75 * (1 - k)})`;
        ctx.lineWidth = 3 * (1 - k) + 0.6;
        ctx.beginPath();
        ctx.ellipse(hitPt.x, kind === "mine" ? seaY : hitPt.y, 12 + k * L * 0.5, 4 + k * L * 0.13, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      // 섬광
      if (flash > 0.01) {
        ctx.fillStyle = `rgba(255,236,200,${flash * 0.18})`;
        ctx.fillRect(0, 0, W, H);
      }
      // 바퀴 사이 암전
      let dark = 0;
      if (clock < FADE_IN) dark = 1 - clock / FADE_IN;
      if (clock > CYCLE - FADE_OUT) dark = (clock - (CYCLE - FADE_OUT)) / FADE_OUT;
      if (!reduced && !idle && dark > 0) {
        ctx.fillStyle = `rgba(3,6,10,${Math.min(1, dark)})`;
        ctx.fillRect(0, 0, W, H);
      }
    };

    if (reduced) {
      // 폭발 1.6초 뒤까지 미리 돌려 두고 한 장만 그린다
      for (let t = 0; t < IMPACT + 1600; t += 16) update(16);
      draw(performance.now());
      return () => {
        ro.disconnect();
        io.disconnect();
      };
    }

    // 쉬는 화면: 멀쩡한 배 한 장
    const drawIdle = () => {
      reset();
      draw(performance.now(), true);
    };
    drawIdle();
    let playing = false;
    let waiting = false; // 한 바퀴를 끝내고 부모가 다음 화면으로 넘길 때까지
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const act = activeRef.current;
      if (!act) {
        waiting = false;
        if (playing) {
          playing = false;
          drawIdle();
        }
        last = now;
        return;
      }
      if (waiting) {
        last = now;
        return;
      }
      if (!playing) {
        playing = true;
        reset();
        last = now;
      }
      if (!visible || document.hidden) {
        last = now;
        return;
      }
      let dt = Math.min(48, now - last);
      last = now;
      while (dt > 0) {
        const step = Math.min(16, dt);
        update(step);
        dt -= step;
      }
      if (clock >= CYCLE) {
        playing = false;
        waiting = true;
        drawIdle();
        doneRef.current();
        return;
      }
      draw(now);
    };
    const onResize = () => {
      if (!playing) draw(performance.now(), true);
    };
    ro.disconnect();
    const ro2 = new ResizeObserver(() => {
      resize();
      onResize();
    });
    ro2.observe(wrap);
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro2.disconnect();
      io.disconnect();
    };
  }, [kind, reduced]);

  const th = THREATS.find((t) => t.kind === kind)!;
  const on = active || reduced;
  return (
    <figure className="m-0">
      <div
        ref={wrapRef}
        className={`relative overflow-hidden rounded-xl border bg-[#03060a] transition-[border-color,opacity] duration-500 ${
          on ? "border-[#f87171]/60 opacity-100" : "border-white/10 opacity-55"
        }`}
      >
        <canvas ref={canvasRef} role="img" aria-label={`연출 장면: 상선이 ${th.title}에 공격받는 모습`} className="block w-full" />
      </div>
      <figcaption className="mt-4">
        <span className={`block text-[17px] font-bold transition-colors ${on ? "text-white" : "text-[#8fa3b1]"}`}>{th.title}</span>
        <span className="mt-1.5 block text-[15px] leading-[1.7] text-[#a3b3bf]">{th.body}</span>
      </figcaption>
    </figure>
  );
}

/** 드론·미사일·기뢰 세 화면을 가로로 놓고, 하나씩 차례로 재생한다 */
export function ShipStrikeScene() {
  const [idx, setIdx] = useState(0);
  const [reduced, setReduced] = useState(false);
  useEffect(() => setReduced(prefersReducedMotion()), []);
  return (
    <div>
      <div className="grid gap-6 md:grid-cols-3">
        {THREATS.map((t, i) => (
          <StrikePanel key={t.kind} kind={t.kind} active={!reduced && i === idx} reduced={reduced} onDone={() => setIdx((i + 1) % THREATS.length)} />
        ))}
      </div>
      <p className="mt-4 text-micro text-[#8fa3b1]">연출 장면이며 실제 사건 영상이 아닙니다.</p>
    </div>
  );
}
