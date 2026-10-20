/**
 * 랜딩 히어로의 지구본 그림 — 실제 지도가 아니라 "지구본에 뜨는 것들"을 번호로 짚어 주는 설명용 그림.
 * 지구본만 보면 뭔가 반짝이는데 무슨 뜻인지 모른다. 그래서 같은 모양을 그리고 번호를 붙여,
 * 옆(휴대폰에서는 아래) 목록에서 하나씩 뜻을 풀어 준다.
 */

export const GLOBE_MARKS = [
  { n: 1, title: "불꽃", body: "항구·정유소·배에 드론·미사일이 떨어진 곳" },
  { n: 2, title: "붉은 면", body: "전쟁 중인 땅, 지금 누가 차지했는지" },
  { n: 3, title: "배 표시", body: "공격받거나 붙잡힌 배, 항공모함 위치" },
  { n: 4, title: "비행기 표시", body: "지금 떠 있는 군용기" },
  { n: 5, title: "깜빡이는 점", body: "방금 들어온 해상·전선 속보" },
  { n: 6, title: "빛나는 선", body: "같은 편끼리의 무기·에너지 연결" },
] as const;

function Badge({ x, y, n }: { x: number; y: number; n: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r="11" fill="#05080d" stroke="#f5c451" strokeWidth="1.6" />
      <text textAnchor="middle" dy="4.2" fontSize="12" fontWeight="700" fill="#f5c451" fontFamily="system-ui, sans-serif">
        {n}
      </text>
    </g>
  );
}

const FLAME =
  "M0 -15 C1.4 -10 6.6 -6 6.6 1.2 C6.6 6.2 3.6 10 0 10 C-3.6 10 -6.6 6.2 -6.6 1.2 C-6.6 -3.2 -3.4 -5.8 -2 -9.6 C-1.3 -8 -0.7 -7.7 -0.2 -8.4 C0.3 -10.4 0 -12.6 0 -15 Z";

export function HeroGlobe() {
  return (
    <svg
      viewBox="0 0 520 520"
      className="h-auto w-full"
      role="img"
      aria-label="지구본 그림. 번호 1부터 6까지 불꽃, 붉은 면, 배, 비행기, 깜빡이는 점, 빛나는 선이 표시돼 있다."
    >
      <defs>
        <radialGradient id="lg-sea" cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor="#123049" />
          <stop offset="60%" stopColor="#0a1a2a" />
          <stop offset="100%" stopColor="#040a12" />
        </radialGradient>
        <radialGradient id="lg-atmo" cx="50%" cy="50%" r="50%">
          <stop offset="86%" stopColor="#2dd4bf" stopOpacity="0" />
          <stop offset="95%" stopColor="#2dd4bf" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="lg-fire" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffd25a" stopOpacity="0.9" />
          <stop offset="45%" stopColor="#ff6a00" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#ff5a0a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="lg-flame" x1="50%" y1="100%" x2="50%" y2="0%">
          <stop offset="0%" stopColor="#ff7417" />
          <stop offset="55%" stopColor="#ffb02a" />
          <stop offset="100%" stopColor="#ffe066" />
        </linearGradient>
        <pattern id="lg-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="7" height="7" fill="#e5484d" fillOpacity="0.28" />
          <line x1="0" y1="0" x2="0" y2="7" stroke="#ff6b6f" strokeWidth="2" strokeOpacity="0.6" />
        </pattern>
        <clipPath id="lg-clip">
          <circle cx="260" cy="260" r="220" />
        </clipPath>
      </defs>

      <circle cx="260" cy="260" r="246" fill="url(#lg-atmo)" />
      <circle cx="260" cy="260" r="220" fill="url(#lg-sea)" />

      <g clipPath="url(#lg-clip)">
        {/* 경위선 */}
        <g fill="none" stroke="#5eead4" strokeOpacity="0.09" strokeWidth="1">
          <ellipse cx="260" cy="260" rx="220" ry="70" />
          <ellipse cx="260" cy="260" rx="220" ry="150" />
          <line x1="40" y1="260" x2="480" y2="260" />
          <ellipse cx="260" cy="260" rx="70" ry="220" />
          <ellipse cx="260" cy="260" rx="150" ry="220" />
          <line x1="260" y1="40" x2="260" y2="480" />
        </g>
        {/* 대륙 — 유라시아·아프리카를 단순화한 덩어리 */}
        <g fill="#1d3a4f" stroke="#3b6378" strokeWidth="1">
          <path d="M70 150 C120 110 200 96 270 104 C340 96 420 112 470 150 L470 230 C430 236 400 250 372 272 C352 290 330 296 312 286 C296 276 282 284 270 300 C254 318 230 314 216 296 C204 280 186 276 170 284 C150 294 126 286 110 266 C92 244 70 236 50 236 L50 168 Z" />
          <path d="M176 300 C196 296 224 312 238 336 C252 362 250 396 236 426 C222 456 200 474 186 470 C172 464 168 438 160 412 C150 380 140 352 146 330 C152 312 162 302 176 300 Z" />
          <path d="M300 298 C318 296 340 304 352 318 C362 332 356 348 340 352 C322 356 306 346 298 332 C292 320 292 304 300 298 Z" />
        </g>

        {/* ② 붉은 면 — 점령·통제 지역 */}
        <path d="M222 168 C246 160 270 164 284 178 C292 192 284 206 266 210 C246 214 226 206 218 192 C214 182 214 172 222 168 Z" fill="url(#lg-hatch)" stroke="#ff6b6f" strokeWidth="1.4" />

        {/* ⑥ 빛나는 선 — 진영 연결 */}
        <path d="M140 140 C200 80 330 70 410 150" fill="none" stroke="#a78bfa" strokeOpacity="0.35" strokeWidth="6" />
        <path d="M140 140 C200 80 330 70 410 150" fill="none" stroke="#c4b5fd" strokeWidth="1.8" strokeDasharray="6 5" />
        <circle cx="140" cy="140" r="4" fill="#c4b5fd" />
        <circle cx="410" cy="150" r="4" fill="#c4b5fd" />

        {/* ① 불꽃 — 드론·미사일 타격 */}
        {[
          [262, 186],
          [300, 250],
          [244, 232],
        ].map(([x, y]) => (
          <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
            <circle r="18" fill="url(#lg-fire)" />
            <path d={FLAME} fill="url(#lg-flame)" />
            <path d="M0 -3 C0.7 -1 2 0.4 2 2.4 C2 4 1.1 5 0 5 C-1.1 5 -2 4 -2 2.4 C-2 0.6 -0.6 -0.8 0 -3 Z" fill="#fff" />
          </g>
        ))}

        {/* ③ 배 — 피격 선박·항공모함 */}
        <g transform="translate(330 326)">
          <circle r="16" fill="none" stroke="#f87171" strokeWidth="1.6" strokeDasharray="3 3" />
          <path d="M-9 2 L9 2 L6 7 L-6 7 Z M-4 2 L-4 -4 L3 -4 L5 2" fill="#e2e8f0" />
        </g>
        <g transform="translate(386 300)">
          <path d="M-12 0 L12 0 L9 5 L-9 5 Z M-2 0 L-2 -5 L4 -5 L4 0" fill="#93c5fd" />
        </g>

        {/* ④ 비행기 — 군용기 */}
        <g transform="translate(196 150) rotate(-35)" fill="#e2e8f0">
          <path d="M0 -12 L2 -4 L11 1 L11 4 L2 1 L1.5 8 L5 11 L5 13 L0 11.6 L-5 13 L-5 11 L-1.5 8 L-2 1 L-11 4 L-11 1 L-2 -4 Z" />
        </g>

        {/* ⑤ 깜빡이는 점 — 속보 */}
        <g transform="translate(352 210)">
          <circle
            r="8"
            fill="none"
            stroke="#2dd4bf"
            strokeWidth="1.6"
            className="motion-safe:animate-ping"
            style={{ transformBox: "fill-box", transformOrigin: "center" }}
          />
          <circle r="4.5" fill="#2dd4bf" />
        </g>
      </g>

      {/* 번호 */}
      <Badge x={282} y={150} n={1} />
      <Badge x={206} y={182} n={2} />
      <Badge x={330} y={356} n={3} />
      <Badge x={174} y={124} n={4} />
      <Badge x={374} y={194} n={5} />
      <Badge x={296} y={74} n={6} />
    </svg>
  );
}
