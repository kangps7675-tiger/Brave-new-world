import { safeJsonLd } from "@/lib/svgSafe";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CHOKEPOINTS,
  FLOW_SOURCE,
  chokepointSceneHref,
  getChokepoint,
} from "@/data/chokepoints";
import { absoluteUrl } from "@/lib/siteUrl";

/**
 * 초크포인트 상세 — 검색·LLM이 읽는 정적 텍스트 페이지.
 *
 * 지구본으로 유입시키는 게 목적이지 지구본을 대체하려는 게 아니다.
 * 크롤러가 읽을 문장을 주고, 사람에게는 "지구본에서 열기"를 준다.
 *
 * 영어를 먼저 쓰고 한국어를 아래 붙인다 — 이 페이지의 목표 독자는
 * 영어권 검색·AI 인용이다. 지구본 본체의 한국어 UI와는 역할이 다르다.
 */

export const dynamic = "force-static";

export function generateStaticParams() {
  return CHOKEPOINTS.map((c) => ({ slug: c.slug }));
}

export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const cp = getChokepoint(params.slug);
  if (!cp) return {};

  const title = `${cp.name.en} — live conflict and trade map`;
  const description = cp.flow
    ? `${cp.summary.en} ${cp.flow.oilMbd} million barrels per day (${cp.flow.period}). Live shipping, energy and conflict layers on one globe.`
    : `${cp.summary.en} Live shipping, energy and conflict layers on one globe.`;
  const path = `/chokepoints/${cp.slug}`;

  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(path) },
    openGraph: {
      type: "article",
      title,
      description,
      url: absoluteUrl(path),
      locale: "en_US",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3">
      {/* 임의 px 금지 — tailwind.config.ts의 의미 단위 스케일(micro/meta/caption/body) 사용 */}
      <div className="text-micro uppercase tracking-wider text-white/45">{label}</div>
      <div className="mt-1 text-lg font-medium text-white/90">{value}</div>
    </div>
  );
}

export default function ChokepointPage({ params }: { params: { slug: string } }) {
  const cp = getChokepoint(params.slug);
  if (!cp) notFound();

  const path = `/chokepoints/${cp.slug}`;

  // JSON-LD — LLM·검색엔진이 "이 페이지가 무엇에 관한 것인지" 확실히 알게 한다.
  // Place로 좌표를, Article로 저작을 선언한다.
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Place",
        "@id": `${absoluteUrl(path)}#place`,
        name: cp.name.en,
        alternateName: cp.aliases,
        description: cp.summary.en,
        geo: {
          "@type": "GeoCoordinates",
          latitude: cp.lat,
          longitude: cp.lng,
        },
      },
      {
        "@type": "Article",
        headline: `${cp.name.en} — live conflict and trade map`,
        description: cp.summary.en,
        about: { "@id": `${absoluteUrl(path)}#place` },
        inLanguage: "en",
        isAccessibleForFree: true,
        mainEntityOfPage: absoluteUrl(path),
        ...(cp.flow
          ? {
              citation: {
                "@type": "CreativeWork",
                name: FLOW_SOURCE.label,
                url: FLOW_SOURCE.url,
              },
            }
          : {}),
      },
    ],
  };

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-5 py-14 text-white/80">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />

      <nav className="mb-8 text-xs text-white/40">
        <Link href="/chokepoints" className="underline underline-offset-4 hover:text-white/70">
          Chokepoints
        </Link>
        <span className="mx-2">/</span>
        <span>{cp.name.en}</span>
      </nav>

      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {cp.name.en}
        </h1>
        <p className="mt-1 text-sm text-white/40">
          {cp.name.ko} · {cp.lat.toFixed(2)}°, {cp.lng.toFixed(2)}°
        </p>
        <p className="mt-5 text-lg leading-relaxed text-white/75">{cp.summary.en}</p>
      </header>

      <div className="mt-8">
        <Link
          href={chokepointSceneHref(cp)}
          className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/20"
        >
          Open this scene on the globe →
        </Link>
      </div>

      {cp.flow ? (
        <section className="mt-10 grid gap-3 sm:grid-cols-2">
          <Figure
            label="Oil transit"
            value={`${cp.flow.oilMbd} million bbl/day`}
          />
          <Figure label="Period" value={cp.flow.period} />
          <div className="sm:col-span-2">
            <Figure label="Share" value={cp.flow.share.en} />
          </div>
        </section>
      ) : (
        <p className="mt-10 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/50">
          The EIA does not publish a separate oil-transit figure for this strait. We leave it
          blank rather than estimate one.
        </p>
      )}

      <section className="mt-12 space-y-10">
        <article>
          <h2 className="text-xl font-semibold text-white">Why it matters</h2>
          <p className="mt-3 leading-relaxed">{cp.whyItMatters.en}</p>
          <p className="mt-3 text-sm leading-relaxed text-white/45">{cp.whyItMatters.ko}</p>
        </article>

        <article>
          <h2 className="text-xl font-semibold text-white">If it is disrupted</h2>
          <p className="mt-3 leading-relaxed">{cp.ifDisrupted.en}</p>
          <p className="mt-3 text-sm leading-relaxed text-white/45">{cp.ifDisrupted.ko}</p>
        </article>
      </section>

      <footer className="mt-14 border-t border-white/10 pt-6 text-xs leading-relaxed text-white/40">
        {cp.flow ? (
          <p>
            Transit figures:{" "}
            <a
              href={FLOW_SOURCE.url}
              className="underline underline-offset-4 hover:text-white/70"
              rel="noopener noreferrer"
              target="_blank"
            >
              {FLOW_SOURCE.label}
            </a>
            .
          </p>
        ) : null}
        <p className="mt-2">
          Live layers on the globe are drawn from public sources listed in the app&apos;s Sources
          panel. This page is not an official navigational or safety advisory.
        </p>
        <p className="mt-4">
          <Link href="/chokepoints" className="underline underline-offset-4 hover:text-white/70">
            All chokepoints
          </Link>
        </p>
      </footer>
    </main>
  );
}
