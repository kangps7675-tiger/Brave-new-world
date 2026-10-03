"use client";

import { historyArcSamples, type NkMissileHistoryCard } from "@/lib/nkMissileHistory";

const LNG0 = 123;
const LNG1 = 146;
const LAT0 = 33;
const LAT1 = 46;

function project(lng: number, lat: number, heightM: number, apexM: number) {
  const x = ((lng - LNG0) / (LNG1 - LNG0)) * 600 + 20;
  const groundY = ((LAT1 - lat) / (LAT1 - LAT0)) * 240 + 16;
  const lift = apexM > 0 ? (heightM / apexM) * 78 : 0;
  return { x, y: groundY - lift };
}

export function NkMissileArcGraphic({
  card,
  lang = "ko",
}: {
  card: NkMissileHistoryCard;
  lang?: "ko" | "en";
}) {
  const samples = historyArcSamples(card);
  const apexM = samples.reduce((max, sample) => Math.max(max, sample.heightM), 0);
  const points = samples.map((sample) => project(sample.lng, sample.lat, sample.heightM, apexM));
  const d = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(" ");
  const start = points[0];
  const end = points[points.length - 1];
  const apex = points[Math.floor(points.length / 2)];
  const ko = lang !== "en";
  const title = ko ? card.titleKo : card.titleEn;
  const body = ko ? card.bodyKo : card.bodyEn;

  return (
    <figure className="flex h-full min-h-[220px] w-full flex-col bg-[#0b1724] text-slate-100">
      <svg viewBox="0 0 640 280" className="h-full min-h-[200px] w-full" role="img" aria-label={title}>
        <rect width="640" height="280" fill="#0b1724" />
        <text x="36" y="168" fill="#7d8b99" fontSize="12">
          {ko ? "대한민국" : "ROK"}
        </text>
        <text x="78" y="118" fill="#d6dee6" fontSize="13">
          {ko ? "북한" : "DPRK"}
        </text>
        <text x="430" y="132" fill="#7d8b99" fontSize="12">
          {ko ? "일본" : "Japan"}
        </text>
        <text x="300" y="188" fill="#8aa0b3" fontSize="11">
          {ko ? "동해" : "East Sea"}
        </text>
        <path d={d} fill="none" stroke="#fb923c" strokeWidth="3" strokeLinecap="round" />
        <path
          d={d}
          fill="none"
          stroke="#fdba74"
          strokeWidth="1.5"
          strokeDasharray="7 8"
          strokeLinecap="round"
        >
          <animate attributeName="stroke-dashoffset" from="0" to="-60" dur="2.4s" repeatCount="indefinite" />
        </path>
        {start ? <circle cx={start.x} cy={start.y} r="5" fill="#f97316" stroke="#fff7ed" strokeWidth="1.5" /> : null}
        {end ? <circle cx={end.x} cy={end.y} r="4" fill="#fed7aa" stroke="#9a3412" strokeWidth="1" /> : null}
        {d ? (
          <circle r="5" fill="#fbbf24" stroke="#fff" strokeWidth="1.5">
            <animateMotion dur="9s" repeatCount="indefinite" path={d} />
          </circle>
        ) : null}
        {apex ? (
          <text x={apex.x + 8} y={Math.max(18, apex.y - 8)} fill="#fdba74" fontSize="11">
            {ko ? `정점 약 ${Math.round(apexM / 1000)} km` : `apex ~${Math.round(apexM / 1000)} km`}
          </text>
        ) : null}
      </svg>
      <figcaption className="space-y-1 px-3 pb-3">
        <p className="text-sm font-semibold leading-snug text-slate-50">{title}</p>
        <p className="text-xs leading-5 text-slate-300">
          {card.date ? `${card.date} · ` : ""}
          {body}
        </p>
        <p className="text-[11px] text-amber-200/80">
          {ko
            ? "추정 궤적 · 실제 레이더 궤적이 아닙니다."
            : "Illustrative arc · not a radar track."}
        </p>
      </figcaption>
    </figure>
  );
}
