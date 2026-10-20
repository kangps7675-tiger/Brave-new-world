"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/hooks/useReducedMotion";
import { useDialog } from "@/hooks/useDialog";
import { LandingContent, type EnterPlace } from "@/components/landing/LandingContent";

/**
 * 첫 방문 화면 — 로딩 창 자리에 랜딩을 덮는다.
 *
 * 지구본(GlobeDashboard)은 이 막 아래에서 평소처럼 부팅한다. 사람이 랜딩을 읽는 동안
 * 로딩이 끝나고, "지구본 보기"를 누르면 안개가 걷히듯 막이 사라지면서 이미 떠 있는 지구본이 드러난다.
 * 준비 전에 누르면 예약해 두었다가 준비되는 즉시 걷는다.
 *
 * "바로 보기"는 기다리지 않는다. 블라인드가 왼쪽부터 촤르르 접히듯 0.65초 만에 열고,
 * 지구본이 아직이면 위쪽에 진행률 알약만 남겼다가 준비되면 치운다.
 *
 * 안개는 WebGL이 아니라 저해상도 2D 캔버스다(약 200×110 픽셀을 CSS로 늘리고 blur).
 * 지구본이 GPU를 쓰는 순간에 셰이더를 하나 더 띄우면 저사양 기기에서 끊긴다.
 */

const SEEN_KEY = "bnw.landing.seen";
const LIFT_MS = 1700;
const REDUCED_LIFT_MS = 250;
const SHUTTER_MS = 650;
const SHUTTER_SLATS = 12;
const SHUTTER_W = 288;
const FOG_W = 200;

/** 첫 방문인지. 공유된 장면 링크(?scene=1)로 들어온 사람은 바로 그 장면을 봐야 하므로 막을 띄우지 않는다. */
export function shouldShowLandingCurtain(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("landing") === "1") return true;
    if (params.get("landing") === "0") return false;
    if (params.has("scene")) return false;
    return window.localStorage.getItem(SEEN_KEY) !== "1";
  } catch {
    return false;
  }
}

function markSeen() {
  try {
    window.localStorage.setItem(SEEN_KEY, "1");
  } catch {
    /* 저장이 막힌 브라우저 — 다음 방문에 랜딩이 다시 보일 뿐이다 */
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
  const weights = [0.5, 0.27, 0.15, 0.08];
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
  nav: "rounded-md bg-[#0E1A24] px-[18px] py-3 font-semibold text-white hover:bg-[#1B2C38]",
  hero: "inline-flex h-[52px] items-center rounded-md bg-[#C2410C] px-6 text-base font-semibold text-white hover:bg-[#A8380A]",
  footer:
    "mt-8 inline-flex h-[52px] items-center rounded-md bg-[#0E1A24] px-6 text-base font-semibold text-white hover:bg-[#1B2C38]",
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
  /** 걷히는 방식 — 안개(지구본 보기) 또는 블라인드(바로 보기). null이면 아직 덮여 있다. */
  const [lift, setLift] = useState<null | "fog" | "shutter">(null);
  const lifting = lift !== null;
  /** 바로 보기로 열었는데 지구본이 아직 — 진행률 알약만 남긴다 */
  const [openedEarly, setOpenedEarly] = useState(false);
  const originRef = useRef<{ x: number; y: number }>({ x: 0.5, y: 0.5 });
  const contentRef = useRef<HTMLDivElement>(null);
  const fogRef = useRef<HTMLCanvasElement>(null);
  /** 막이 떠 있는 동안 Tab이 아래 지구본 컨트롤로 새지 않게 가둔다. Esc로는 닫지 않는다. */
  const dialogRef = useDialog<HTMLDivElement>({ open: !lifting, closeOnEscape: false });
  const onLiftedRef = useRef(onLifted);
  onLiftedRef.current = onLifted;
  const readyRef = useRef(ready);
  readyRef.current = ready;

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

  const openNow = useCallback(() => setLift("shutter"), []);

  /** 블라인드가 다 접힌 뒤: 지구본이 준비됐으면 바로 내리고, 아니면 준비될 때까지 알약만 둔다 */
  const finish = useCallback(() => {
    if (readyRef.current) onLiftedRef.current();
    else setOpenedEarly(true);
  }, []);
  useEffect(() => {
    if (openedEarly && ready) onLiftedRef.current();
  }, [openedEarly, ready]);

  useEffect(() => {
    if (!lift) return;
    markSeen();
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

    if (lift === "shutter") {
      // 가로 288×1 마스크 한 줄을 매 프레임 다시 그려 화면 높이로 늘린다.
      // 슬랫마다 왼쪽부터 조금씩 늦게 시작해서 블라인드가 촤르르 접히는 것처럼 보인다.
      const host = dialogRef.current;
      const mask = document.createElement("canvas");
      mask.width = SHUTTER_W;
      mask.height = 1;
      const mctx = mask.getContext("2d");
      const row = mctx ? mctx.createImageData(SHUTTER_W, 1) : null;
      const slatW = SHUTTER_W / SHUTTER_SLATS;
      const setMask = (value: string) => {
        if (!host) return;
        host.style.setProperty("mask-image", value);
        host.style.setProperty("-webkit-mask-image", value);
      };
      if (host) {
        for (const prop of ["mask-size", "-webkit-mask-size"]) host.style.setProperty(prop, "100% 100%");
        for (const prop of ["mask-repeat", "-webkit-mask-repeat"]) host.style.setProperty(prop, "no-repeat");
      }
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / SHUTTER_MS);
        if (mctx && row) {
          for (let x = 0; x < SHUTTER_W; x++) {
            const k = Math.floor(x / slatW);
            const u = (x - k * slatW) / slatW;
            const delay = (k / SHUTTER_SLATS) * 0.5;
            const pk = smooth(delay, delay + 0.5, t);
            row.data[x * 4 + 3] = smooth(pk - 0.06, pk + 0.02, u) * 255;
          }
          mctx.putImageData(row, 0, 0);
          setMask(`url(${mask.toDataURL()})`);
        } else if (content) {
          content.style.opacity = String(1 - t);
        }
        if (t < 1) raf = requestAnimationFrame(tick);
        else {
          setMask("none");
          if (content) content.style.opacity = "0";
          finish();
        }
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    }

    const canvas = fogRef.current;
    const ctx = canvas?.getContext("2d");
    const w = FOG_W;
    const h = Math.max(60, Math.min(400, Math.round((FOG_W * window.innerHeight) / Math.max(1, window.innerWidth))));
    const pad = 40;
    const noise = buildNoise(w + pad, h);
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
        content.style.opacity = String(1 - smooth(0.06, 0.34, t));
        content.style.filter = `blur(${(smooth(0, 0.34, t) * 10).toFixed(1)}px)`;
        content.style.transform = `scale(${1 + smooth(0, 0.34, t) * 0.025})`;
      }
      if (ctx && img) {
        const cover = smooth(0, 0.3, t);
        const thr = smooth(0.24, 1, t) * 1.25 - 0.12;
        const drift = Math.floor(t * pad);
        const data = img.data;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const i = y * w + x;
            const n = noise[y * (w + pad) + x + drift];
            const s = n * 0.6 + dist[i] * 0.4;
            const a = cover * smooth(thr - 0.1, thr + 0.06, s);
            const p = i * 4;
            data[p] = 204 + n * 38;
            data[p + 1] = 212 + n * 32;
            data[p + 2] = 218 + n * 28;
            data[p + 3] = a * 248;
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
    if (ready || lifting) return "지구본 보기";
    if (queued) return place === "nav" ? `곧 열려요 ${pct}%` : `준비되면 바로 열려요 · ${pct}%`;
    return place === "nav" ? `지구본 ${pct}%` : `지구본 보기 · 준비 중 ${pct}%`;
  };

  return (
    <>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Brave New World 소개"
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
        {!lifting ? (
          <button
            type="button"
            onClick={openNow}
            className="fixed bottom-6 right-6 inline-flex h-[52px] cursor-pointer items-center gap-2 rounded-full border border-white/15 bg-[#0E1A24]/92 pl-6 pr-5 font-[inherit] text-base font-semibold text-white shadow-[0_8px_28px_rgba(14,26,36,0.35)] backdrop-blur hover:bg-[#1B2C38]"
          >
            바로 보기
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 4 L9 9 L4 14 M9 4 L14 9 L9 14" />
            </svg>
          </button>
        ) : null}
      </div>
      {openedEarly ? (
        <p
          role="status"
          className="fixed left-1/2 top-4 m-0 -translate-x-1/2 rounded-full bg-[#0E1A24]/90 px-4 py-2 text-body tabular-nums text-white"
          style={{ zIndex: 701 }}
        >
          지구본 불러오는 중 {pct}%
        </p>
      ) : null}
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
            filter: "blur(12px)",
          }}
        />
      ) : null}
    </>
  );
}
