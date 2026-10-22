"use client";

import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/hooks/useReducedMotion";
import { useAnyScroll } from "@/components/landing/LandingHip";

/**
 * 상선이 드론·미사일·기뢰에 공격받는 장면(연출). 실제 사건 영상이 아니다(화면에 밝힌다).
 * 작은 화면 세 개를 가로로 놓고 드론 → 미사일 → 기뢰 순서로 하나씩 재생한다. 쉬는 화면은 멀쩡한 배 한 장.
 *
 * 한 바퀴(약 9.5초)는 늘 멀쩡한 배에서 시작한다:
 *   멀쩡히 항해 → 위협이 날아옴(또는 기뢰 위로 지나감) → 폭발 → 불기둥·검은 연기가 치솟음 → 어두워졌다가 다음 위협.
 *
 * 드론·미사일은 오른쪽 위에서 갑판으로 대각선으로 내리꽂히고(미사일은 0.3초 만에 운석처럼), 닿는 그 프레임에 터진다.
 * 폭발은 섬광(눈부신 핵 + 가로 빛줄기 + 화면 전체 번쩍임)과 재래식 폭발 버섯구름 위주.
 * 버섯은 검은 연기 덩어리 하나하나가 솟고 느려지며 옆으로 퍼지는 물리로 만든다(핵폭발식 고리 X).
 * 드론은 탄두가 작아 약한 버섯, 대함미사일은 큰 버섯 + 2차 폭발 + 현측 구멍 + 앞뒤로 번지는 불.
 * 불난 자리는 배에 붙어 함께 나아가고, 연기는 배 진행 반대쪽(뒤)으로 처진다.
 *
 * 폭발은 2D 캔버스 위의 작은 물리 시뮬레이션이다.
 *  - 불덩이: 미리 구운 부드러운 불 스프라이트를 더하기 합성(lighter)으로 겹치고, 나이에 따라 흰색→노랑→주황→암적색으로 식는다
 *  - 연기: 노이즈를 구운 연기 스프라이트가 부력으로 오르고, 바람에 밀리며 부풀고, 회전한다
 *  - 파편: 중력·공기저항을 받는 조각이 연기 꼬리를 끌고 날아가 바다에 떨어지며 물보라를 낸다
 *  - 섬광 순간 불붙은 파편이 튀어 불꼬리를 끌고 바다에 떨어진다(드론 몇 조각 / 미사일 수십 조각)
 *  - 기뢰: 수면 돔 → 굵은 흰 물기둥과 비스듬한 물줄기 → 중력으로 무너지며 수면을 타고 번지는 물안개
 *  - 게임처럼 보이지 않게 화면 흔들림·충격파 고리는 뺐다
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
/** 미사일은 충돌 0.32초 전에야 화면에 들어와 운석처럼 내리꽂힌다 */
const MISSILE_T = 320;

type PKind = "fire" | "smoke" | "ember" | "debris" | "spray" | "mist" | "flame" | "brand";
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
  /** 개별 중력(px/ms²). 없으면 종류별 기본값 */
  g?: number;
  /** 불붙은 파편 중 흰 연기를 다는 것 */
  w?: boolean;
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
    // 버섯구름은 불빛을 받아 일반 검은 연기보다 밝은 회갈색
    const SMOKE_MUSH = [makeSmoke(128, 78), makeSmoke(128, 92), makeSmoke(128, 66)];
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
    let hitPt = { x: 0, y: 0 };
    let roll = 0;
    let vroll = 0;
    let heave = 0;
    let vheave = 0;
    let rollRest = 0;
    let sink = 0;
    let fireRate = 0;
    // 재래식 폭발 버섯구름: 불덩이가 솟구치며 검은 연기 덩어리들이 위에서 옆으로 퍼진다.
    // 핵폭발처럼 반듯한 고리가 아니라 덩어리마다 제각각 솟고, 바람(배 진행 반대쪽)에 밀려 기운다.
    type MP = { x: number; y: number; vx: number; vy: number; age: number; delay: number; r0: number; grow: number; v: number; cap: boolean };
    let mpuffs: MP[] = [];
    let mushT = -1;
    let hitOff = 0; // 맞은 지점의 선체 기준 위치 — 불은 배와 함께 움직인다
    let extraFires: { off: number; at: number }[] = [];
    let secondary = -1;
    let surge = -1; // 기뢰: 물기둥이 무너질 때 수면을 타고 번지는 물안개(base surge) 시각
    let mineX = 0;

    const geo = () => {
      const horizon = H * 0.5;
      const L = W * 0.6;
      const shipX = W * 0.36 + (clock / CYCLE) * W * 0.08;
      const seaY = horizon + H * 0.22;
      return { horizon, L, shipX, seaY };
    };

    // 배의 출렁임은 시계(clock) 기준 — 그리기와 판정이 같은 위치를 쓰게 한다
    const shipYAt = () => geo().seaY + Math.sin(clock / 950) * 1.6 + heave + sink;
    /** 드론·미사일이 닿는 갑판 위 한 점. 날아오는 경로의 끝점이자 폭발 지점이다 */
    const impactPt = () => {
      const { L, shipX } = geo();
      return { x: shipX + L * 0.1, y: shipYAt() - L * 0.075 - 2 };
    };
    /** 날아오는 위협의 위치·각도·진행도. 화면에 없으면 null */
    const threatPos = () => {
      if (kind === "mine") return null;
      const t0 = kind === "missile" ? IMPACT - MISSILE_T : APPROACH;
      if (clock < t0 || clock >= IMPACT) return null;
      const u = (clock - t0) / (IMPACT - t0);
      const end = impactPt();
      const sx = kind === "missile" ? W * 0.98 : W * 1.08;
      const sy = kind === "missile" ? -H * 0.35 : -H * 0.08;
      const e = kind === "missile" ? u : u ** 1.25; // 드론은 내리꽂으며 조금씩 빨라진다
      const dx = end.x - sx;
      const dy = end.y - sy;
      return { x: sx + dx * e, y: sy + dy * e, ang: Math.atan2(-dy, -dx), u, dx, dy };
    };

    const push = (p: P) => {
      if (parts.length < MAX_PARTS) parts.push(p);
    };
    const base = (k: PKind, x: number, y: number, o: Partial<P>): P => ({ k, x, y, vx: 0, vy: 0, age: 0, life: 1000, r: 4, grow: 1, rot: rnd(0, 6.28), vr: rnd(-0.0008, 0.0008), a: 1, ...o });

    /** 불붙은 파편 — 섬광 순간 사방으로 튀어 불꼬리와 연기를 끌고 날다가 바다에 떨어져 김을 낸다 */
    const brands = (x: number, y: number, n: number, sp0: number, sp1: number, size: number) => {
      const s = geo().L / 520;
      for (let i = 0; i < n; i++) {
        // 약 40%는 흰 연기를 달고 옆·아래까지 사방으로, 나머지는 검은 연기를 달고 위쪽으로
        const w = Math.random() < 0.4;
        const a = w ? rnd(-Math.PI - 0.35, 0.35) : rnd(-Math.PI * 0.92, -Math.PI * 0.08);
        const sp = rnd(sp0, sp1) * s * (w ? 1.15 : 1);
        push(base("brand", x + rnd(-4, 4), y + rnd(-3, 3), { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rnd(1600, 3200), r: rnd(1.6, 3.2) * size * s, trail: 0, vr: rnd(-0.03, 0.03), w }));
      }
    };

    const explode = (x: number, y: number, kind: Kind) => {
      const { L, seaY } = geo();
      hit = true;
      hitPt = { x, y };
      hitOff = x - geo().shipX;
      light = 1;
      flash = kind === "mine" ? 0.25 : 1; // 물속 폭발은 섬광이 물에 묻힌다

      const s = L / 520;
      if (kind === "mine") {
        // 수중 폭발: ① 수면이 하얗게 부풀어 오르는 돔 → ② 가운데로 치솟는 물기둥과 왕관처럼 퍼지는 물줄기
        // → ③ 중력으로 무너져 내리며 수면을 타고 번지는 물안개. 물속이라 불덩이는 거의 안 보인다.
        mushT = 0;
        surge = 1900;
        mineX = x;
        // 물기둥은 화면에 비해 수십 m 크기라 천천히 솟고 천천히 무너진다(꼭대기까지 약 1.1초)
        const g = (2 * H * 0.6) / (1100 * 1100);
        const up = (h: number) => Math.sqrt(2 * g * h); // 높이 h까지 올라가는 초속
        // 물기둥 본체: 배 길이의 1/4쯤 되는 굵은 흰 기둥. 가운데일수록 높게 치솟는다
        for (let i = 0; i < 340; i++) {
          const q = rnd(-1, 1);
          const off = q * L * 0.07;
          const hgt = H * (0.6 - Math.abs(q) ** 1.5 * 0.3) * rnd(0.7, 1.05);
          push(base("spray", x + off, seaY + rnd(-3, 4), { vx: off * 0.0011 + rnd(-0.01, 0.01), vy: -up(hgt), life: 4200, g, r: rnd(5, 14) * s * (1.25 - Math.abs(q) * 0.45) }));
        }
        // 부피감: 큰 물 덩어리(같은 물리로 솟았다가 떨어진다)
        for (let i = 0; i < 50; i++) {
          const q = rnd(-1, 1);
          const off = q * L * 0.05;
          push(base("spray", x + off, seaY, { vx: off * 0.0009, vy: -up(H * rnd(0.18, 0.42)), life: 4200, g, r: rnd(14, 26) * s, a: 0.5 }));
        }
        // 비스듬히 뻗는 물줄기(왕관)
        for (let i = 0; i < 40; i++) {
          const a = -Math.PI / 2 + (Math.random() < 0.5 ? -1 : 1) * rnd(0.3, 0.8);
          const v = up(H * rnd(0.15, 0.35));
          push(base("spray", x + rnd(-L * 0.03, L * 0.03), seaY, { vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 3800, g, r: rnd(4, 9) * s }));
        }
        // 기둥 꼭대기에 걸리는 옅은 물안개
        for (let i = 0; i < 18; i++) {
          push(base("mist", x + rnd(-L * 0.06, L * 0.06), seaY - H * rnd(0.25, 0.55), { vx: rnd(-0.015, 0.0), vy: -rnd(0, 0.015), life: rnd(1800, 2800), r: rnd(14, 26) * s, grow: rnd(1.6, 2.2), a: 0.45 }));
        }
        vheave -= 0.065 * s; // 물이 부풀며 배를 들어 올린다
        vroll += 0.0006;
        rollRest = 0.03;
        sink = 7 * s;
      } else {
        // 드론은 탄두가 작아 약한 버섯, 대함미사일은 탄두가 커서 크게 부서지고 버섯도 크다
        const big = kind === "missile" ? 1.45 : 0.6;
        const hs = H / 400;
        mushT = 0;
        const nCap = Math.round(46 * big);
        for (let i = 0; i < nCap; i++) {
          mpuffs.push({
            x: x + rnd(-L * 0.025, L * 0.025),
            y: y - rnd(0, 6),
            vx: rnd(-0.05, 0.05) * Math.sqrt(big),
            vy: -rnd(0.2, 0.3) * Math.sqrt(big) * hs,
            age: 0,
            delay: rnd(0, 140),
            r0: rnd(9, 16) * s * big,
            grow: rnd(2.2, 3.6),
            v: (Math.random() * 3) | 0,
            cap: true,
          });
        }
        const nStem = Math.round(40 * big);
        for (let i = 0; i < nStem; i++) {
          mpuffs.push({
            x: x + rnd(-L * 0.015, L * 0.015),
            y: y - rnd(0, 4),
            vx: rnd(-0.015, 0.015),
            vy: -rnd(0.04, 0.14) * Math.sqrt(big) * hs,
            age: 0,
            delay: rnd(80, 1400),
            r0: rnd(8, 13) * s * big,
            grow: rnd(1.8, 2.6),
            v: (Math.random() * 3) | 0,
            cap: false,
          });
        }
        // 섬광과 함께 불붙은 파편: 드론은 몇 조각, 대함미사일은 사방으로 크게
        if (kind === "missile") brands(x, y, 28, 0.5, 1.25, 2.2);
        else brands(x, y, 7, 0.3, 0.7, 1.4);
        if (kind === "missile") {
          // 큰 탄두: 0.4초 뒤 선체 안에서 2차 폭발, 불이 갑판 앞뒤로 번진다
          secondary = 420;
          extraFires = [
            { off: L * 0.07, at: 650 },
            { off: -L * 0.06, at: 1300 },
          ];
        }
        // 불덩이(버섯구름의 밑동)
        for (let i = 0; i < 34 * big; i++) {
          const a = rnd(0, Math.PI * 2);
          const sp = rnd(0.03, 0.2) * s * big;
          push(base("fire", x + rnd(-8, 8), y + rnd(-6, 6), { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.7 - rnd(0.02, 0.08), life: rnd(650, 1350), r: rnd(16, 40) * s * big, grow: rnd(2, 3.2) }));
        }
        // 불씨
        for (let i = 0; i < 45 * big; i++) {
          const a = rnd(-Math.PI, 0);
          const sp = rnd(0.15, 0.62) * s;
          push(base("ember", x, y, { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rnd(700, 1900), r: rnd(1, 2.4) }));
        }
        // 파편
        for (let i = 0; i < (kind === "missile" ? 26 : 6); i++) {
          const a = rnd(-Math.PI * 0.95, -Math.PI * 0.05);
          const sp = rnd(0.14, 0.42) * s;
          push(base("debris", x, y, { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 4000, r: rnd(2, 5) * s, vr: rnd(-0.02, 0.02), trail: 0 }));
        }
        // 첫 연기
        for (let i = 0; i < 10; i++) {
          push(base("smoke", x + rnd(-20, 20), y + rnd(-10, 6), { vx: rnd(-0.04, 0.04), vy: -rnd(0.02, 0.07), life: rnd(2400, 4200), r: rnd(18, 34) * s, grow: rnd(2.2, 3.4), a: 0.9 }));
        }
        vroll += kind === "missile" ? -0.0011 : -0.0004;
        rollRest = kind === "missile" ? -0.035 : -0.01;
        sink = 2 * s;
      }
      fireRate = 1;
    };

    const reset = () => {
      clock = 0;
      parts = [];
      hit = false;
      light = flash = 0;
      roll = vroll = heave = vheave = rollRest = sink = fireRate = 0;
      mpuffs = [];
      mushT = -1;
      extraFires = [];
      secondary = -1;
      surge = -1;
    };

    const update = (dt: number) => {
      clock += dt;
      const { L, shipX, seaY } = geo();
      const s = L / 520;
      const deckY = seaY - L * 0.075 + heave + sink;

      // 닿는 그 순간 터진다 — 폭발 지점 = 날아온 경로의 끝점
      if (!hit && clock >= IMPACT) {
        if (kind === "mine") explode(shipX + L * 0.1, seaY + 6, kind);
        else {
          const ip = impactPt();
          explode(ip.x, ip.y, kind);
        }
      }
      // 기뢰: 물기둥 속에서도 찢긴 선체에서 작은 검은 연기가 올라와 맞바람에 뒤로 처진다
      if (kind === "mine" && mushT >= 60 && mushT < 2600) {
        const n = (dt / 16) * 1.3;
        for (let i = 0; i < n; i++) {
          push(base("smoke", hitPt.x + rnd(-L * 0.03, L * 0.03), deckY - rnd(0, 4), { vx: rnd(-0.045, -0.02), vy: -rnd(0.04, 0.09) * s, life: rnd(2000, 3000), r: rnd(6, 10) * s, grow: rnd(2.4, 3.4), a: 0.85 }));
        }
      }
      if (surge >= 0 && mushT >= surge) {
        surge = -1;
        for (let i = 0; i < 46; i++) {
          const dir = Math.random() < 0.5 ? -1 : 1;
          push(base("mist", mineX + rnd(-L * 0.05, L * 0.05), seaY - rnd(0, 10) * s, { vx: dir * rnd(0.03, 0.12), vy: -rnd(0.0, 0.02), life: rnd(2600, 4000), r: rnd(12, 24) * s, grow: rnd(2.2, 3.4), a: 0.7 }));
        }
      }
      // 불난 자리는 배에 붙어 함께 나아간다. 거기서 나온 연기는 뒤(왼쪽)로 처진다
      if (hit) hitPt.x = shipX + hitOff;
      if (mushT >= 0) {
        mushT += dt;
        const hs = H / 400;
        for (const m of mpuffs) {
          if (mushT < m.delay) continue;
          m.age += dt;
          // 부력으로 솟다가 공기저항에 느려지고, 느려진 갓 덩어리는 옆으로 퍼진다
          m.vy *= Math.pow(m.cap ? 0.9978 : 0.999, dt);
          m.vy -= 0.0000015 * dt * hs;
          m.vx *= Math.pow(0.998, dt);
          if (m.cap && m.age > 250 && m.age < 1200) m.vx += Math.sign(m.vx || rnd(-1, 1)) * (kind === "missile" ? 0.000015 : 0.000008) * dt;
          // 바람: 배가 오른쪽으로 가니 연기는 왼쪽으로, 높을수록 더 밀린다
          const height = Math.max(0, (hitPt.y - m.y) / H);
          m.vx -= (0.000006 + height * 0.000022) * dt;
          m.x += m.vx * dt;
          m.y += m.vy * dt;
        }
      }
      if (secondary >= 0 && mushT >= secondary) {
        secondary = -1;
        flash = Math.max(flash, 0.45);
        light = Math.max(light, 0.7);
        const sx = hitPt.x + L * 0.04;
        for (let i = 0; i < 18; i++) {
          const a = rnd(0, Math.PI * 2);
          const sp = rnd(0.03, 0.14) * s;
          push(base("fire", sx + rnd(-6, 6), hitPt.y + rnd(-4, 4), { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6 - 0.05, life: rnd(500, 1000), r: rnd(14, 28) * s, grow: 2.4 }));
        }
        brands(sx, hitPt.y, 10, 0.4, 0.9, 1.6);
        for (let i = 0; i < 10; i++) {
          const a = rnd(-Math.PI * 0.9, -Math.PI * 0.1);
          const sp = rnd(0.12, 0.36) * s;
          push(base("debris", sx, hitPt.y, { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 4000, r: rnd(2, 4) * s, vr: rnd(-0.02, 0.02), trail: 0 }));
        }
      }

      // 배 스프링(롤·히브)
      vroll += (-(roll - rollRest) * 0.00003 - vroll * 0.004) * dt;
      roll += vroll * dt;
      vheave += (-heave * 0.00005 - vheave * 0.006) * dt;
      heave += vheave * dt;

      light *= Math.pow(0.9965, dt);
      flash *= Math.pow(0.986, dt); // 섬광은 짧고 세게

      // 맞은 뒤: 불길과 검은 연기 기둥
      if (hit && (kind !== "mine" || mushT > 2600)) {
        fireRate = Math.max(0.55, fireRate * Math.pow(0.9998, dt));
        const spots = [0, ...extraFires.filter((e) => mushT >= e.at).map((e) => e.off)];
        const fx = hitPt.x + spots[(Math.random() * spots.length) | 0] + rnd(-L * 0.04, L * 0.04);
        const fy = kind === "mine" ? deckY - 2 : hitPt.y;
        const nFlame = (dt / 16) * 2.2 * fireRate;
        for (let i = 0; i < nFlame; i++) {
          push(base("flame", fx + rnd(-L * 0.02, L * 0.02), fy, { vx: rnd(-0.01, 0.01), vy: -rnd(0.06, 0.15) * s, life: rnd(380, 700), r: rnd(7, 15) * s, grow: 0.55 }));
        }
        const nSmoke = (dt / 16) * 1.9 * fireRate * (mushT >= 0 ? Math.min(1, mushT / 3500) : 1);
        for (let i = 0; i < nSmoke; i++) {
          push(base("smoke", fx, fy - 10 * s, { vx: rnd(-0.01, 0.015), vy: -rnd(0.04, 0.085) * s, life: rnd(4200, 6500), r: rnd(14, 24) * s, grow: rnd(3.5, 6), a: 0.9 }));
        }
      }

      const wind = -0.000014; // 배 진행(오른쪽) 반대로 부는 맞바람
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
            p.vy += (p.g ?? 0.00085) * dt;
            if (p.g) p.vx -= 0.000005 * dt; // 물보라도 맞바람에 조금씩 뒤로
            if (p.g && p.vy > 0) p.vx *= Math.pow(1.0004, dt); // 무너지는 물은 커튼처럼 옆으로 벌어진다
            p.vx *= Math.pow(0.999, dt);
            break;
          case "brand": {
            p.vy += 0.00045 * dt;
            p.vx *= Math.pow(0.9994, dt);
            p.trail = (p.trail ?? 0) + dt;
            const burn = 1 - p.age / p.life;
            if (p.trail > 18) {
              p.trail = 0;
              if (burn > 0.15) push(base("flame", p.x, p.y, { vx: p.vx * 0.1, vy: -0.01, life: rnd(180, 320), r: p.r * rnd(1.6, 2.4), grow: 0.5 }));
              if (p.w) {
                // 흰 연기 꼬리: 지나온 길을 따라 조금씩 겹쳐 이어지게 두 덩어리씩
                for (let j = 0; j < 2; j++) push(base("mist", p.x - p.vx * 9 * j, p.y - p.vy * 9 * j, { vx: 0, vy: -0.008, life: rnd(1100, 1800), r: p.r * 2.4, grow: 2.6, a: 0.55 }));
              }
              else push(base("smoke", p.x, p.y, { vx: 0, vy: -0.012, life: rnd(800, 1400), r: p.r * 1.4, grow: 3, a: 0.45 }));
            }
            if (p.y > seaY + 6 && p.vy > 0) {
              p.age = p.life; // 바다에 떨어져 치익 — 물보라와 김
              for (let i = 0; i < 6; i++) push(base("spray", p.x, seaY, { vx: rnd(-0.04, 0.04), vy: -rnd(0.1, 0.25), life: rnd(400, 800), r: rnd(2, 4) * s }));
              push(base("mist", p.x, seaY - 4, { vx: 0, vy: -0.02, life: 1200, r: 6 * s, grow: 2.5, a: 0.4 }));
            }
            break;
          }
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
        if (p.k === "spray" && p.y > seaY + 10 && p.vy > 0) {
          p.age = p.life;
          // 무너지는 물이 수면을 때리며 하얀 거품을 남긴다
          if (p.k === "spray" && Math.random() < 0.06) push(base("mist", p.x, seaY - 2, { vx: rnd(-0.03, 0.03), vy: -0.005, life: rnd(1200, 2200), r: rnd(6, 12) * s, grow: 2.2, a: 0.5 }));
        }
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
        const big = kind === "missile";
        const br = L * (big ? 0.15 : 0.07);
        const g = ctx.createRadialGradient(lx, -h * 0.5, 0, lx, -h * 0.5, br);
        g.addColorStop(0, "rgba(5,5,5,0.92)");
        g.addColorStop(1, "rgba(5,5,5,0)");
        ctx.fillStyle = g;
        ctx.fillRect(lx - br * 1.1, -h * 1.8, br * 2.2, h * 2.4);
        if (big) {
          // 대함미사일: 현측이 찢겨 나간 구멍과 안쪽 불빛
          ctx.fillStyle = "#050607";
          ctx.beginPath();
          ctx.moveTo(lx - L * 0.05, -h);
          ctx.lineTo(lx - L * 0.035, -h * 0.35);
          ctx.lineTo(lx - L * 0.012, -h * 0.05);
          ctx.lineTo(lx + L * 0.02, -h * 0.25);
          ctx.lineTo(lx + L * 0.045, -h * 0.1);
          ctx.lineTo(lx + L * 0.055, -h * 0.6);
          ctx.lineTo(lx + L * 0.04, -h);
          ctx.closePath();
          ctx.fill();
          ctx.globalCompositeOperation = "lighter";
          ctx.drawImage(FIRE_MID, lx - L * 0.035, -h * 0.85, L * 0.07, h * 0.7);
          ctx.globalCompositeOperation = "source-over";
        }
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
      const shipY = shipYAt();
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

      // 날아오는 위협 — 둘 다 오른쪽 위에서 갑판으로 대각선으로 내리꽂힌다
      const tp = !hit ? threatPos() : null;
      if (tp && kind === "drone") {
        drawDrone(tp.x, tp.y + Math.sin(now / 90) * 0.8, Math.max(8, W * 0.032), tp.ang, now);
      } else if (tp && kind === "missile") {
        // 운석처럼: 머리는 하얗게 달아오르고 뒤로 긴 불꼬리
        const len = Math.hypot(tp.dx, tp.dy);
        const ux = tp.dx / len;
        const uy = tp.dy / len;
        const tail = Math.min(len * tp.u, H * 0.75);
        const gx = tp.x - ux * tail;
        const gy = tp.y - uy * tail;
        ctx.globalCompositeOperation = "lighter";
        const tg = ctx.createLinearGradient(tp.x, tp.y, gx, gy);
        tg.addColorStop(0, "rgba(255,250,230,0.95)");
        tg.addColorStop(0.15, "rgba(255,190,90,0.7)");
        tg.addColorStop(1, "rgba(255,90,20,0)");
        ctx.strokeStyle = tg;
        ctx.lineCap = "round";
        ctx.lineWidth = Math.max(2.5, W * 0.009);
        ctx.beginPath();
        ctx.moveTo(tp.x, tp.y);
        ctx.lineTo(gx, gy);
        ctx.stroke();
        ctx.lineWidth = Math.max(6, W * 0.024);
        ctx.globalAlpha = 0.25;
        ctx.stroke();
        ctx.globalAlpha = 1;
        sprite(FIRE_HOT, tp.x, tp.y, Math.max(10, W * 0.04), 1);
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 1;
        drawMissile(tp.x, tp.y, Math.max(6, W * 0.022), tp.ang);
        for (let i = 0; i < 3; i++) {
          const k = Math.random() * 0.9;
          push(base("smoke", tp.x - ux * tail * k, tp.y - uy * tail * k, { vx: rnd(-0.005, 0.01), vy: -rnd(0.002, 0.01), life: rnd(900, 1600), r: rnd(3, 6) * s, grow: 3, a: 0.4 }));
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
      // 버섯구름 계산(연기층은 여기서, 불빛층은 아래 더하기 합성에서)
      const mush: { x: number; y: number; r: number; heat: number; a: number; v: number }[] = [];
      for (const m of mpuffs) {
        if (mushT < m.delay) continue;
        const T = m.age;
        const r = m.r0 * (1 + (m.grow - 1) * (1 - Math.exp(-T / 900)));
        const fade = T < 3600 ? 1 : Math.max(0, 1 - (T - 3600) / 2600);
        const appear = Math.min(1, T / 120);
        const heat = Math.max(0, 1 - T / (m.cap ? 1000 : 700));
        // 재래식 폭발 연기는 검다. 불빛을 받는 덩어리만 조금 밝게
        const img = m.v === 0 ? SMOKE_MUSH[1] : SMOKE_DARK[m.v];
        const a = (m.cap ? 0.92 : 0.8) * fade * appear;
        mush.push({ x: m.x, y: m.y, r, heat, a, v: m.v });
        sprite(img, m.x, m.y, r, a * (1 - heat * 0.6));
      }

      // 기뢰: 터진 직후 배 밑 수면이 하얗게 부풀어 오르는 돔
      if (kind === "mine" && mushT >= 0 && mushT < 450) {
        const k = mushT / 450;
        const rx = L * 0.13 * Math.min(1, mushT / 160);
        ctx.save();
        ctx.globalAlpha = 0.85 * (1 - k);
        ctx.translate(mineX, seaY + 2);
        ctx.scale(1, 0.5);
        const dg = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
        dg.addColorStop(0, "rgba(240,248,252,1)");
        dg.addColorStop(0.7, "rgba(200,222,235,0.7)");
        dg.addColorStop(1, "rgba(180,205,222,0)");
        ctx.fillStyle = dg;
        ctx.beginPath();
        ctx.arc(0, 0, rx, Math.PI, 0);
        ctx.fill();
        ctx.restore();
        ctx.globalAlpha = 1;
      }
      // 물보라
      for (const p of parts) {
        if (p.k !== "spray") continue;
        const k = p.age / p.life;
        // 올라가는 동안은 촘촘한 흰 물, 떨어지며 흩어진다
        const falling = p.vy > 0 ? 1 : 0;
        sprite(SPRAY, p.x, p.y, p.r * (1 + k * 0.8 + falling * 0.4), 0.9 * p.a * (1 - k) * (falling ? 0.75 : 1));
      }
      // 파편
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#151a1f";
      for (const p of parts) {
        if (p.k !== "debris" && p.k !== "brand") continue;
        const dr = p.k === "brand" ? p.r * 0.7 : p.r;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillRect(-dr, -dr * 0.5, dr * 2, dr);
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
        } else if (p.k === "brand") {
          // 타는 파편: 밝은 불덩이가 점점 작아지며 꺼진다
          const burn = Math.max(0, 1 - k * 1.1);
          sprite(FIRE_MID, p.x, p.y, p.r * (3 + 2 * burn), 0.9 * burn);
          sprite(FIRE_HOT, p.x, p.y, p.r * 1.6 * burn, burn);
        }
      }
      // 버섯구름 속 불빛: 처음엔 하얗게 달아오른 불덩이, 식으며 주황→검붉은색
      for (const m of mush) {
        if (m.heat <= 0.02) continue;
        const img = m.heat > 0.7 ? FIRE_HOT : m.heat > 0.35 ? FIRE_MID : FIRE_COOL;
        sprite(img, m.x, m.y, m.r * 0.95, m.heat * m.a * 1.1);
      }
      // 섬광: 맞은 지점의 눈부신 핵 + 가로로 번지는 빛줄기
      if (flash > 0.02 && kind !== "mine") {
        sprite(FIRE_HOT, hitPt.x, hitPt.y, L * 0.5 * (0.6 + flash * 0.6), flash);
        ctx.globalAlpha = flash * 0.8;
        ctx.drawImage(FIRE_HOT, hitPt.x - W * 0.6, hitPt.y - Math.max(3, H * 0.012), W * 1.2, Math.max(6, H * 0.024));
        ctx.globalAlpha = 1;
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

            ctx.restore();

      // 섬광
      if (flash > 0.01) {
        ctx.fillStyle = `rgba(255,244,225,${flash * 0.55})`;
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

/** 고정 모드에서 한 장면에 주는 스크롤 길이(vh) */
const PIN_STEP_VH = 70;

/**
 * 드론·미사일·기뢰 세 화면.
 * 넓은 화면에서는 화면에 고정해 두고 스크롤로 한 장면씩 넘긴다 — 칸에 들어가면 그 장면이 처음부터 한 번 재생된다.
 * (스크롤에 재생 시간을 묶지 않는다: 빨리 내리면 폭발이 휙 지나가고 천천히 내리면 끊긴다.)
 * 좁은 화면·낮은 화면·움직임 줄이기에서는 예전처럼 세 장을 늘어놓고 차례로 재생한다.
 */
export function ShipStrikeScene() {
  const [idx, setIdx] = useState(0);
  const [reduced, setReduced] = useState(false);
  const [pin, setPin] = useState(false);
  const [step, setStep] = useState(0);
  const outerRef = useRef<HTMLDivElement>(null);
  const sentinels = useRef<(HTMLSpanElement | null)[]>([]);
  useEffect(() => {
    const r = prefersReducedMotion();
    setReduced(r);
    const mq = window.matchMedia("(min-width: 1024px) and (min-height: 700px)");
    const sync = () => setPin(!r && mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const N = THREATS.length;
  useAnyScroll(() => {
    if (!pin) return;
    const el = outerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight || 1;
    const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - vh)));
    const next = Math.min(N - 1, Math.floor(p * N));
    setStep((prev) => (prev === next ? prev : next));
  });

  if (pin) {
    const go = (i: number) => sentinels.current[i]?.scrollIntoView({ block: "start", behavior: "smooth" });
    const t = THREATS[step]!;
    return (
      <div>
        <div ref={outerRef} className="relative" style={{ height: `${100 + (N - 1) * PIN_STEP_VH}vh` }}>
          {THREATS.map((_, i) => (
            <span
              key={i}
              ref={(el) => {
                sentinels.current[i] = el;
              }}
              aria-hidden="true"
              className="pointer-events-none absolute left-0 h-px w-px"
              style={{ top: `calc(${(i + 0.5) / N} * (100% - 100vh))` }}
            />
          ))}
          <div className="sticky top-0 flex h-screen flex-col items-center justify-center">
            <div className="w-full" style={{ maxWidth: "min(100%, calc((100vh - 250px) / 0.62))" }}>
              <StrikePanel key={t.kind} kind={t.kind} active reduced={false} onDone={() => {}} />
            </div>
            <div className="mt-5 flex items-center gap-3" role="tablist" aria-label="장면 선택">
              {THREATS.map((x, i) => (
                <button
                  key={x.kind}
                  type="button"
                  role="tab"
                  aria-selected={i === step}
                  aria-label={`${i + 1}번째 장면: ${x.title}`}
                  onClick={() => go(i)}
                  className={`h-2.5 cursor-pointer rounded-full border-0 p-0 transition-all ${i === step ? "w-8 bg-[#f87171]" : "w-2.5 bg-white/25 hover:bg-white/50"}`}
                />
              ))}
              <span className="ml-2 text-micro tabular-nums text-[#8fa3b1]">
                {step + 1} / {N}
                {step < N - 1 ? " · 스크롤하면 다음 장면" : ""}
              </span>
            </div>
            <p className="mb-0 mt-3 text-micro text-[#8fa3b1]">연출 장면이며 실제 사건 영상이 아닙니다.</p>
          </div>
        </div>
      </div>
    );
  }

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
