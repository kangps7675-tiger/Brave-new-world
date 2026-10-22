"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/hooks/useReducedMotion";
import { setLandingCurtainActive } from "@/lib/landingCurtainState";
import { useDialog } from "@/hooks/useDialog";
import { LandingContent, type EnterPlace } from "@/components/landing/LandingContent";

/**
 * 첫 화면 — 로딩 창 자리에 랜딩을 덮는다. 처음 온 사람뿐 아니라 매번 보인다:
 * 지구본만 봐서는 반짝이는 게 무슨 뜻인지 모르고 닫아 버리기 때문이다(2026-10-20 결정).
 *
 * 지구본(GlobeDashboard)은 이 막 아래에서 평소처럼 부팅한다. 사람이 랜딩을 읽는 동안
 * 로딩이 끝나고, "지구본 열기"를 누르면 안개가 걷히듯 막이 사라지면서 이미 떠 있는 지구본이 드러난다.
 * 준비 전에 누르면 예약해 두었다가 준비되는 즉시 걷는다.
 *
 * 안개는 WebGL이 아니라 저해상도 2D 캔버스다(약 200×110 픽셀을 CSS로 늘리고 blur).
 * 지구본이 GPU를 쓰는 순간에 셰이더를 하나 더 띄우면 저사양 기기에서 끊긴다.
 */

const LIFT_MS = 4600;
const REDUCED_LIFT_MS = 250;
const FOG_W = 260;

/**
 * 랜딩을 띄울지. 기본은 항상 띄운다. 공유된 장면 링크(?scene=1)도 마찬가지 — 링크를 받은 사람이
 * 가장 이 서비스를 모르는 사람이다. ?landing=0 은 개발·점검용으로만 끈다.
 */
export function shouldShowLandingCurtain(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return new URLSearchParams(window.location.search).get("landing") !== "0";
  } catch {
    return true;
  }
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** 타일 반복되는 값 노이즈(fbm). 한 번만 만든다. */
function buildNoise(w: number, h: number): Float32Array {
  const lattice = (cells: number) => {
    const g = new Float32Array((cells + 1) * (cells + 1));
    for (let i = 0; i < g.length; i++) g[i] = Math.random();
    return { g, cells };
  };
  const octaves = [lattice(4), lattice(8), lattice(16), lattice(32)];
  const weights = [0.46, 0.3, 0.16, 0.08];
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let v = 0;
      octaves.forEach(({ g, cells }, k) => {
        const fx = (x / w) * cells;
        const fy = (y / h) * cells;
        const x0 = Math.floor(fx);
        const y0 = Math.floor(fy);
        const tx = fx - x0;
        const ty = fy - y0;
        const sx = tx * tx * (3 - 2 * tx);
        const sy = ty * ty * (3 - 2 * ty);
        const row = cells + 1;
        const a = g[y0 * row + x0];
        const b = g[y0 * row + x0 + 1];
        const c = g[(y0 + 1) * row + x0];
        const d = g[(y0 + 1) * row + x0 + 1];
        v += weights[k] * (a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy);
      });
      out[y * w + x] = v;
    }
  }
  return out;
}

const ENTER_CLASS: Record<EnterPlace, string> = {
  nav: "rounded-md bg-[#f5c451] px-[18px] py-3 font-bold text-[#05080d] hover:bg-[#ffd772]",
  hero: "landing-cta-glow inline-flex h-[54px] items-center rounded-md bg-[#f5c451] px-7 text-[17px] font-bold text-[#05080d] hover:bg-[#ffd772]",
  footer: "inline-flex h-[54px] items-center rounded-md bg-[#f5c451] px-7 text-[17px] font-bold text-[#05080d] hover:bg-[#ffd772]",
};

export function LandingCurtain({
  progress,
  ready,
  onLifted,
}: {
  /** 지구본 부팅 진행률 0–100 */
  progress: number;
  /** 지구본이 다 떴는지 (onBootReady) */
  ready: boolean;
  /** 막이 완전히 사라진 뒤 — 부모가 언마운트한다 */
  onLifted: () => void;
}) {
  const [queued, setQueued] = useState(false);
  /** 걷히는 방식 — 안개(지구본 열기). null이면 아직 덮여 있다. */
  const [lift, setLift] = useState<null | "fog">(null);
  const lifting = lift !== null;
  const originRef = useRef<{ x: number; y: number }>({ x: 0.5, y: 0.5 });
  const contentRef = useRef<HTMLDivElement>(null);
  const fogRef = useRef<HTMLCanvasElement>(null);
  /** 막이 떠 있는 동안 Tab이 아래 지구본 컨트롤로 새지 않게 가둔다. Esc로는 닫지 않는다. */
  const dialogRef = useDialog<HTMLDivElement>({ open: !lifting, closeOnEscape: false });
  // 막이 떠 있는 동안 속보 팝업·타전음을 막는다 (막이 언마운트되면 풀린다)
  useEffect(() => {
    setLandingCurtainActive(true);
    return () => setLandingCurtainActive(false);
  }, []);
  const onLiftedRef = useRef(onLifted);
  onLiftedRef.current = onLifted;

  const pct = Math.min(100, Math.max(0, Math.round(progress)));

  const requestLift = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      const r = event.currentTarget.getBoundingClientRect();
      originRef.current = {
        x: (r.left + r.width / 2) / window.innerWidth,
        y: (r.top + r.height / 2) / window.innerHeight,
      };
      if (ready) setLift("fog");
      else setQueued(true);
    },
    [ready],
  );

  useEffect(() => {
    if (queued && ready) setLift((cur) => cur ?? "fog");
  }, [queued, ready]);

  const finish = useCallback(() => onLiftedRef.current(), []);

  useEffect(() => {
    if (!lift) return;
    const content = contentRef.current;
    const reduced = prefersReducedMotion();
    const start = performance.now();
    let raf = 0;

    if (reduced) {
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / REDUCED_LIFT_MS);
        if (content) content.style.opacity = String(1 - t);
        if (t < 1) raf = requestAnimationFrame(tick);
        else finish();
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    }

    const canvas = fogRef.current;
    const ctx = canvas?.getContext("2d");
    const w = FOG_W;
    const h = Math.max(60, Math.min(400, Math.round((FOG_W * window.innerHeight) / Math.max(1, window.innerWidth))));
    const pad = 40;
    // 결이 다른 노이즈 두 겹을 반대 방향으로 흘려 솜뭉치가 서로 스치며 풀리는 느낌을 낸다
    const noise = buildNoise(w + pad, h);
    const noise2 = buildNoise(w + pad, h);
    const img = ctx ? ctx.createImageData(w, h) : null;
    if (canvas) {
      canvas.width = w;
      canvas.height = h;
    }
    const { x: ox, y: oy } = originRef.current;
    const maxD = Math.hypot(Math.max(ox, 1 - ox), Math.max(oy, 1 - oy));
    const dist = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        dist[y * w + x] = Math.hypot(x / w - ox, y / h - oy) / maxD;
      }
    }

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / LIFT_MS);
      // 랜딩은 안개에 먼저 잠기고, 그 다음 안개가 버튼 쪽부터 바깥으로 흩어진다.
      if (content) {
        content.style.opacity = String(1 - smooth(0.1, 0.55, t));
        content.style.filter = `blur(${(smooth(0, 0.55, t) * 12).toFixed(1)}px)`;
        content.style.transform = `scale(${1 + smooth(0, 0.55, t) * 0.03})`;
      }
      if (ctx && img) {
        const cover = smooth(0, 0.35, t) * (1 - smooth(0.85, 1, t));
        const thr = smooth(0.12, 0.98, t) * 1.9 - 0.45;
        const drift = Math.floor(t * pad);
        const data = img.data;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const i = y * w + x;
            const row = y * (w + pad);
            const raw = noise[row + x + drift] * 0.62 + noise2[row + x + (pad - drift)] * 0.38;
            // 중간값을 부풀려 덩어리(솜뭉치)는 도톰하게, 가장자리는 올이 풀리듯 옅게
            const n = smooth(0.2, 0.8, raw);
            const s = n * 0.72 + dist[i] * 0.28;
            const a = cover * smooth(thr - 0.45, thr + 0.25, s);
            const p = i * 4;
            // 뭉친 곳은 하얗고 얇은 곳은 살짝 푸른 회색 — 솜털의 명암
            data[p] = 214 + n * 36;
            data[p + 1] = 222 + n * 29;
            data[p + 2] = 230 + n * 23;
            data[p + 3] = a * 244;
          }
        }
        ctx.putImageData(img, 0, 0);
      }
      if (t < 1) raf = requestAnimationFrame(tick);
      else finish();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [lift, finish, dialogRef]);

  const label = (place: EnterPlace) => {
    if (ready || lifting) return "지구본 열기";
    if (queued) return place === "nav" ? `곧 열려요 ${pct}%` : `준비되면 바로 열려요 · ${pct}%`;
    return place === "nav" ? `지구본 ${pct}%` : `지구본 열기 · 준비 중 ${pct}%`;
  };

  return (
    <>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Strait Desk 소개"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 700,
          overflowX: "hidden",
          overflowY: lifting ? "hidden" : "auto",
          pointerEvents: lifting ? "none" : "auto",
          overscrollBehavior: "contain",
        }}
      >
        <div ref={contentRef} style={{ transformOrigin: "50% 30%", willChange: lifting ? "opacity, filter, transform" : undefined }}>
          <LandingContent
            renderEnter={(place) => (
              <button
                type="button"
                onClick={requestLift}
                aria-busy={!ready}
                className={`${ENTER_CLASS[place]} cursor-pointer border-0 font-[inherit] tabular-nums`}
              >
                {label(place)}
              </button>
            )}
          />
        </div>
      </div>
      {lift === "fog" ? (
        <canvas
          ref={fogRef}
          aria-hidden
          style={{
            position: "fixed",
            left: "-3%",
            top: "-3%",
            width: "106%",
            height: "106%",
            zIndex: 701,
            pointerEvents: "none",
            filter: "blur(18px)",
          }}
        />
      ) : null}
    </>
  );
}
