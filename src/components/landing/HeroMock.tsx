/**
 * 랜딩 히어로의 해역 화면 예시. 실제 데이터가 아니라 화면 구성을 보여 주는 정적 그림이다.
 * 수치 자리는 일부러 [N] 같은 빈칸으로 둔다 — 지어낸 숫자를 보여 주지 않는다.
 */
const MONO = "font-[family-name:var(--font-jetbrains-mono)]";

const CANDIDATES = [
  { name: "후보 1 · 유조선", note: "갑자기 속도를 줄이고 멈춤", tag: "유력", kind: "likely" },
  { name: "후보 2 · 벌크선", note: "평소대로 항해 중", tag: "가능성 낮음", kind: "low" },
  { name: "후보 3 · 선종 미상", note: "AIS 신호가 끊김", tag: "자료 없음", kind: "nodata" },
] as const;

const TAG_CLASS: Record<(typeof CANDIDATES)[number]["kind"], string> = {
  likely: "bg-[#F2B33D] font-bold text-[#0E1A24]",
  low: "border border-[#5C7280] text-[#C7D2D7]",
  nodata: "border border-dashed border-[#A9B7BE] text-[#C7D2D7]",
};

export function HeroMock() {
  return (
    <figure className="m-0 min-w-0 flex-[1_1_520px]">
      <div className="overflow-hidden rounded-xl border border-[#22323D] bg-[#0E1A24] text-[#E6ECEE]">
        <div className={`flex flex-wrap items-center justify-between gap-3 border-b border-[#22323D] px-[18px] py-3.5 text-caption ${MONO}`}>
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded bg-[#E6ECEE] px-2.5 py-1.5 font-semibold text-[#0E1A24]">호르무즈</span>
            {["홍해", "흑해", "말라카"].map((s) => (
              <span key={s} className="rounded px-2.5 py-1.5 text-[#A9B7BE]">{s}</span>
            ))}
          </div>
          <span className="text-[#A9B7BE]">화면 예시 · 실제 데이터 아님</span>
        </div>

        <div className="flex flex-wrap gap-[18px] p-[18px]">
          <svg
            viewBox="0 0 300 220"
            className="h-auto min-w-0 flex-[1_1_240px] rounded-lg bg-[#132430]"
            role="img"
            aria-label="해협 지도 예시: 보고 위치 범위와 위성 열점 범위가 겹치는 곳에 후보 선박 세 척"
          >
            <path d="M0 40 C60 30 90 70 140 60 C190 50 210 20 300 30 L300 0 L0 0 Z" fill="#22323D" />
            <path d="M0 220 L0 170 C70 180 110 150 170 160 C220 170 250 140 300 150 L300 220 Z" fill="#22323D" />
            <circle cx="150" cy="105" r="52" fill="none" stroke="#A9B7BE" strokeWidth="1.2" strokeDasharray="4 4" />
            <circle cx="168" cy="112" r="18" fill="none" stroke="#F2B33D" strokeWidth="1.6" />
            <path d="M60 120 L118 110" stroke="#5C7280" strokeWidth="1.5" strokeDasharray="2 3" />
            <path d="M120 90 L163 108" stroke="#E6ECEE" strokeWidth="1.8" />
            <rect x="160" y="104" width="8" height="8" fill="#E6ECEE" transform="rotate(45 164 108)" />
            <circle cx="140" cy="128" r="4" fill="#5C7280" />
            <circle cx="118" cy="110" r="4" fill="none" stroke="#A9B7BE" strokeWidth="1.5" />
            <text x="12" y="208" fill="#A9B7BE" fontFamily="monospace" fontSize="10">
              점선: 경보에 나온 위치 · 노란 원: 위성 화재 감지
            </text>
          </svg>

          <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-2.5">
            <p className={`m-0 text-xs text-[#A9B7BE] ${MONO}`}>UKMTO 경보 · 피격 후보</p>
            {CANDIDATES.map((c) => (
              <div key={c.name} className="flex items-center justify-between gap-2 rounded-lg bg-[#17293A] px-3.5 py-3">
                <div>
                  <div className="text-[15px] font-semibold">{c.name}</div>
                  <div className={`text-xs text-[#A9B7BE] ${MONO}`}>{c.note}</div>
                </div>
                <span className={`whitespace-nowrap rounded px-2 py-1 text-caption ${TAG_CLASS[c.kind]}`}>{c.tag}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 border-t border-[#22323D]">
          {[
            ["최근 30일 피격", "[N]건"],
            ["전쟁위험 보험료", "[요율] ↑"],
            ["24시간 최대 파고", "[m]"],
          ].map(([label, value], i) => (
            <div key={label} className={`px-[18px] py-3.5 ${i < 2 ? "border-r border-[#22323D]" : ""}`}>
              <div className={`text-xs text-[#A9B7BE] ${MONO}`}>{label}</div>
              <div className="mt-1 text-xl font-semibold">{value}</div>
            </div>
          ))}
        </div>
      </div>
      <figcaption className="mt-3 text-sm leading-relaxed text-[#55656D]">
        보도된 위치를 한 점이 아니라 범위로 표시하고, 그 안을 지나던 배를 피격 후보로 추립니다.
      </figcaption>
    </figure>
  );
}
