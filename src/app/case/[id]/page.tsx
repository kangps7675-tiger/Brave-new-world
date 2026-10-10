import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CaseShareActions } from "@/components/case/CaseShareActions";
import { getDb } from "@/db";
import { brandName } from "@/lib/brand";
import { plainVerdictBlurb } from "@/lib/caseFile/investigatePublic";
import { evidenceSourceKind } from "@/lib/caseFile/sourceKind";
import { getCaseFile } from "@/lib/caseFile/store";
import { effectiveClaimVerdict, explainCaseVerdict } from "@/lib/caseFile/verdict";
import type { ClaimKind, Verdict } from "@/lib/caseFile/types";
import { absoluteUrl } from "@/lib/siteUrl";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CLAIM_KO: Record<ClaimKind, string> = {
  place: "장소",
  time: "시간",
  occurrence: "사건 발생",
  damage: "피해",
  means: "수단",
  actor: "주체",
};

const VERDICT_KO: Record<Verdict, string> = {
  confirmed: "확인됨",
  partial: "일부 확인",
  unconfirmed: "확인 못 함",
  refuted: "반박됨",
};

const ROLE_KO: Record<string, string> = {
  supports: "뒷받침",
  contradicts: "반박",
  context: "맥락",
};

const STRENGTH_KO: Record<string, string> = {
  strong: "강",
  medium: "중",
  weak: "약",
};

function verdictClass(v: Verdict): string {
  if (v === "confirmed") return "text-emerald-300";
  if (v === "partial") return "text-amber-200";
  if (v === "refuted") return "text-rose-300";
  return "text-slate-300";
}

function verdictBadgeClass(v: Verdict): string {
  if (v === "confirmed")
    return "border-emerald-400/40 bg-emerald-500/15 text-emerald-100";
  if (v === "partial")
    return "border-amber-400/40 bg-amber-500/15 text-amber-100";
  if (v === "refuted") return "border-rose-400/40 bg-rose-500/15 text-rose-100";
  return "border-white/20 bg-white/5 text-slate-200";
}

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ from?: string }>;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id: raw } = await params;
  const caseId = (raw || "").trim();
  try {
    const db = await getDb();
    const found = await getCaseFile(db, caseId);
    if (!found) return { title: `사건 · ${brandName("ko")}` };
    const title = found.caseFile.title || caseId;
    const verdict = VERDICT_KO[found.caseFile.verdict];
    return {
      title: `${verdict} · ${title}`,
      description: plainVerdictBlurb(found.caseFile.verdict),
      alternates: { canonical: absoluteUrl(`/case/${caseId}`) },
      openGraph: {
        title: `${verdict} · ${title}`,
        description: plainVerdictBlurb(found.caseFile.verdict),
        url: absoluteUrl(`/case/${caseId}`),
      },
    };
  } catch {
    return { title: `사건 · ${brandName("ko")}` };
  }
}

/**
 * 사건 결과 카드 — 일반 유저 공유·읽기용.
 * 쓰기는 관측 「사건」탭 + 편집 토큰.
 */
export default async function CaseFilePage({ params, searchParams }: PageProps) {
  const { id: raw } = await params;
  const sp = searchParams ? await searchParams : {};
  const fromInvestigate = sp.from === "investigate";
  const caseId = (raw || "").trim();
  if (!caseId) notFound();

  let found: Awaited<ReturnType<typeof getCaseFile>>;
  try {
    const db = await getDb();
    found = await getCaseFile(db, caseId);
  } catch {
    notFound();
  }
  if (!found) notFound();

  const { caseFile, revisions } = found;
  const explanation = explainCaseVerdict(caseFile);
  const evidenceCount = caseFile.claims.reduce(
    (n, c) => n + c.evidence.length,
    0,
  );
  const globeHref = `/?viewer=satellite&case=${encodeURIComponent(caseFile.id)}`;
  const shareUrl = absoluteUrl(`/case/${caseFile.id}`);
  const incident = caseFile.incident;

  return (
    <main className="relative min-h-screen overflow-hidden text-slate-100">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 45% at 40% -5%, rgba(244,63,94,0.12) 0%, transparent 55%), #070b12",
        }}
      />

      <div className="relative mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/investigate"
            className="text-lg font-semibold text-white"
            style={{ fontFamily: "var(--font-merriweather), Georgia, serif" }}
          >
            {brandName("ko")}
          </Link>
          <Link
            href="/investigate"
            className="text-sm text-rose-200/80 underline underline-offset-2"
          >
            다른 기사 확인
          </Link>
        </div>

        {fromInvestigate ? (
          <p
            className="mt-6 rounded-md border border-emerald-400/30 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-100"
            role="status"
          >
            초안 결과 카드를 만들었습니다. 아래 판정은 지금 붙은 근거 기준입니다.
          </p>
        ) : null}

        {evidenceCount === 0 ? (
          <p className="mt-4 rounded-md border border-amber-400/25 bg-amber-950/30 px-3 py-2 text-sm leading-relaxed text-amber-100/90">
            자동으로 뽑은 초안입니다. 열점·공습·위성 같은{" "}
            <strong className="font-medium">지도 근거는 아직 없습니다</strong>.
            그래서 전체가 「확인 못 함」인 경우가 많습니다.
          </p>
        ) : null}

        <header className="mt-8">
          <p className="text-xs uppercase tracking-[0.22em] text-rose-300/70">
            사건 확인 결과
          </p>
          <h1
            className="mt-2 text-2xl font-semibold leading-snug tracking-tight sm:text-3xl"
            style={{ fontFamily: "var(--font-merriweather), Georgia, serif" }}
          >
            {caseFile.title || caseFile.id}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex rounded-md border px-3 py-1.5 text-sm font-semibold ${verdictBadgeClass(caseFile.verdict)}`}
            >
              {VERDICT_KO[caseFile.verdict]}
            </span>
            <span className="text-sm text-slate-400">
              {caseFile.eventType === "strike"
                ? "공습·타격 유형"
                : caseFile.eventType === "maritime"
                  ? "해상 유형"
                  : "기타 유형"}
            </span>
          </div>
          <p className="mt-3 max-w-[46ch] text-base leading-relaxed text-slate-300">
            {plainVerdictBlurb(caseFile.verdict)}
          </p>
        </header>

        <div className="mt-6 flex flex-wrap gap-2">
          <CaseShareActions
            title={caseFile.title || brandName("ko")}
            shareUrl={shareUrl}
          />
          {caseFile.article.url ? (
            <a
              href={caseFile.article.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-white/15 px-3 py-2 text-sm text-slate-200 hover:bg-white/5"
            >
              원문 보기
            </a>
          ) : null}
          <Link
            href={globeHref}
            className="rounded-md border border-rose-400/40 bg-rose-500/15 px-3 py-2 text-sm text-rose-50 hover:bg-rose-500/25"
          >
            지도에서 위치 보기
          </Link>
        </div>

        <section className="mt-8 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-black/35 p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              뽑힌 장소
            </h2>
            <p className="mt-2 text-sm text-slate-100">
              {incident?.place
                ? `${incident.place.label}`
                : "위치를 자동으로 못 찾음"}
            </p>
            {incident?.place ? (
              <p className="mt-1 font-mono text-xs text-slate-500">
                {incident.place.lat.toFixed(3)}, {incident.place.lng.toFixed(3)} ·{" "}
                {incident.place.precision}
              </p>
            ) : null}
          </div>
          <div className="rounded-lg border border-white/10 bg-black/35 p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              뽑힌 시각
            </h2>
            <p className="mt-2 text-sm text-slate-100">
              {incident?.occurredAt
                ? incident.occurredAt.replace("T", " ").replace(/\.\d{3}Z$/, " UTC")
                : "시각을 자동으로 못 찾음"}
            </p>
            {incident?.occurredAtSource && incident.occurredAtSource !== "none" ? (
              <p className="mt-1 text-xs text-slate-500">
                출처:{" "}
                {incident.occurredAtSource === "body"
                  ? "본문"
                  : incident.occurredAtSource === "article"
                    ? "기사 발행 시각"
                    : "편집자"}
              </p>
            ) : null}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-white/10 bg-black/35 p-4">
          <h2 className="text-sm font-semibold text-slate-100">왜 이 판정인가</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
            {explanation.why}
          </p>
          {explanation.whatWouldChange.length ? (
            <>
              <h3 className="mt-4 text-sm font-semibold text-slate-100">
                무엇이 있으면 바뀌나
              </h3>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-400">
                {explanation.whatWouldChange.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </>
          ) : null}
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-sm font-semibold text-slate-100">세부 주장</h2>
          {caseFile.claims.map((claim) => {
            const shown = effectiveClaimVerdict(claim);
            return (
              <article
                key={claim.id}
                className="rounded-lg border border-white/10 bg-black/30 p-4"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-base font-medium text-slate-50">
                    {CLAIM_KO[claim.kind]}
                  </h3>
                  <span className={`shrink-0 text-sm ${verdictClass(shown)}`}>
                    {VERDICT_KO[shown]}
                    {claim.override ? " · 편집자 판단" : ""}
                  </span>
                </div>
                {claim.statement ? (
                  <p className="mt-1 text-sm text-slate-400">{claim.statement}</p>
                ) : null}
                {!claim.mapCheckable ? (
                  <p className="mt-1 text-xs text-amber-200/70">
                    지도로는 확인하기 어렵습니다
                  </p>
                ) : null}

                {claim.evidence.length === 0 ? (
                  <p className="mt-3 text-xs text-slate-600">붙은 근거 없음</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {claim.evidence.map((ev) => (
                      <li
                        key={ev.id}
                        className="rounded-md border border-white/8 bg-black/35 px-3 py-2 text-sm"
                      >
                        <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-slate-400">
                          <span className="font-semibold text-slate-200">
                            {evidenceSourceKind(ev.sourceKey)}
                          </span>
                          <span>{ROLE_KO[ev.role] ?? ev.role}</span>
                          <span>{STRENGTH_KO[ev.strength] ?? ev.strength}</span>
                        </div>
                        <p className="mt-1 text-slate-100">{ev.shows}</p>
                        {ev.relevance?.summary ? (
                          <p className="mt-1 text-xs text-cyan-200/70">
                            {ev.relevance.summary}
                          </p>
                        ) : null}
                        {ev.limits ? (
                          <p className="mt-1 text-xs text-slate-500">{ev.limits}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            );
          })}
        </section>

        {caseFile.article.text ? (
          <section className="mt-8">
            <h2 className="text-sm font-semibold text-slate-100">넣은 기사·본문</h2>
            {caseFile.article.outlet ? (
              <p className="mt-1 text-xs text-slate-500">{caseFile.article.outlet}</p>
            ) : null}
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-400">
              {caseFile.article.text.slice(0, 2800)}
              {caseFile.article.text.length > 2800 ? "…" : ""}
            </p>
          </section>
        ) : null}

        <details className="mt-10 rounded-lg border border-white/8 bg-black/20 p-3">
          <summary className="cursor-pointer text-xs text-slate-500">
            기술 정보 · 수정 기록 ({revisions.length})
          </summary>
          <p className="mt-2 font-mono text-xs text-slate-600">
            {caseFile.id} · rev {caseFile.rev}
          </p>
          <ol className="mt-2 space-y-1 text-xs text-slate-600">
            {revisions.map((r) => (
              <li key={`${r.caseId}-${r.rev}`} className="font-mono">
                rev {r.rev} · {r.op} · {r.at}
              </li>
            ))}
          </ol>
        </details>

        <footer className="mt-10 border-t border-white/10 pt-6 text-sm text-slate-500">
          <p>
            {brandName("ko")}의 자동 결과는 기사 텍스트에서 뽑은 초안입니다.
            확인됨으로 바뀌려면 관측 모드에서 지도 근거가 붙어야 합니다.
          </p>
          <p className="mt-3">
            <Link
              href="/investigate"
              className="text-rose-200/80 underline underline-offset-2"
            >
              새 기사 확인하기
            </Link>
          </p>
        </footer>
      </div>
    </main>
  );
}
