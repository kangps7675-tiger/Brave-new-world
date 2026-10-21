import type { ExtraScene } from "@/components/landing/extraData";

/**
 * 호외 지면에 실리는 '사진' — 실제 사진이 아니라 우리가 코드로 그린 그림에
 * 옛 신문 인쇄(흑백·망점·빛바랜 가장자리)를 입힌 것이다. 캡션에 "일러스트"라고 밝힌다.
 */

function Tanker({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill="#15130f">
      {/* 선체 */}
      <path d="M0 0 H150 L166 -10 L176 -10 L166 6 Q160 14 146 14 H10 Q2 14 -4 6 Z" />
      {/* 갑판 장비·배관 */}
      <rect x="22" y="-6" width="86" height="3" />
      <rect x="30" y="-10" width="2" height="4" />
      <rect x="60" y="-10" width="2" height="4" />
      <rect x="90" y="-10" width="2" height="4" />
      {/* 선미 갑판실과 굴뚝 */}
      <rect x="4" y="-26" width="24" height="20" />
      <rect x="8" y="-34" width="16" height="8" />
      <rect x="12" y="-42" width="7" height="8" />
      {/* 선수루 */}
      <rect x="138" y="-14" width="12" height="8" />
    </g>
  );
}

function Smoke({ x, y, n, w }: { x: number; y: number; n: number; w: number }) {
  return (
    <g fill="#2a2722" filter="url(#ex-soft)">
      {Array.from({ length: n }).map((_, i) => {
        const t = i / Math.max(1, n - 1);
        return <circle key={i} cx={x + t * w * 0.9 + Math.sin(i * 1.7) * 6} cy={y - t * 120} r={10 + t * 26} opacity={0.85 - t * 0.35} />;
      })}
    </g>
  );
}

export function ExtraPhoto({ scene }: { scene: ExtraScene }) {
  const night = scene === "night";
  return (
    <svg viewBox="0 0 400 270" role="img" aria-hidden="true" className="block h-auto w-full">
      <defs>
        <linearGradient id="ex-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={night ? "#1d1b17" : "#8c897f"} />
          <stop offset="1" stopColor={night ? "#4a463d" : "#e6e1d2"} />
        </linearGradient>
        <linearGradient id="ex-sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={night ? "#3a362f" : "#6e6b62"} />
          <stop offset="1" stopColor="#1f1d19" />
        </linearGradient>
        <filter id="ex-soft" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <radialGradient id="ex-sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fffdf2" />
          <stop offset="1" stopColor="#fffdf2" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="270" fill="url(#ex-sky)" />
      {/* 해 또는 달 */}
      {scene === "calm" || scene === "recover" ? <circle cx="300" cy="120" r="70" fill="url(#ex-sun)" /> : null}
      {night ? <circle cx="318" cy="52" r="15" fill="#f1ecda" opacity="0.9" /> : null}
      {/* 수평선과 바다 */}
      <rect y="150" width="400" height="120" fill="url(#ex-sea)" />
      {Array.from({ length: 9 }).map((_, i) => (
        <path key={i} d={`M${-20 + (i % 3) * 40} ${162 + i * 11} q 20 -5 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0`} fill="none" stroke="#e9e4d4" strokeOpacity={0.14 + (i % 3) * 0.05} strokeWidth="1.4" />
      ))}
      {/* 먼 배 */}
      {scene === "waiting" ? (
        <>
          <Tanker x={20} y={158} s={0.55} />
          <Tanker x={250} y={160} s={0.5} />
        </>
      ) : null}
      {/* 주인공 유조선 */}
      {scene !== "waiting" ? <Tanker x={scene === "alarm" ? 70 : 105} y={186} s={1.15} /> : <Tanker x={95} y={202} s={1.0} />}
      {/* 먼 수평선의 연기 */}
      {scene === "alarm" ? <Smoke x={330} y={150} n={6} w={30} /> : null}
      {/* 피격 선박의 불길과 연기 */}
      {scene === "hit" ? (
        <>
          <Smoke x={160} y={178} n={9} w={90} />
          <g filter="url(#ex-soft)">
            <ellipse cx={175} cy={182} rx="24" ry="12" fill="#f6f2e2" />
          </g>
        </>
      ) : null}
      {/* 밤의 탐조등 */}
      {night ? <path d="M30 270 L175 160 L200 175 Z" fill="#f1ecda" opacity="0.22" /> : null}
    </svg>
  );
}
