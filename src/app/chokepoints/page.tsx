import { safeJsonLd } from "@/lib/svgSafe";
import type { Metadata } from "next";
import Link from "next/link";
import { CHOKEPOINTS, FLOW_SOURCE, chokepointSceneHref } from "@/data/chokepoints";
import { absoluteUrl } from "@/lib/siteUrl";

/**
 * 초크포인트 인덱스 — `/chokepoints`
 *
 * 이 사이트에서 유일하게 "검색으로 들어오는 문"이다. 지구본은 입구가 아니라
 * 목적지고, 이 페이지가 입구다.
 */

export const dynamic = "force-static";

const TITLE = "Maritime chokepoints — where war and trade meet";
const DESCRIPTION =
  "Hormuz, Malacca, Bab el-Mandeb, Suez and the Taiwan Strait: oil transit volumes, why each matters, and what happens when they close — with live conflict, shipping and energy layers on one 3D globe.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: absoluteUrl("/chokepoints") },
  openGraph: {
    type: "website",
    title: TITLE,
    description: DESCRIPTION,
    url: absoluteUrl("/chokepoints"),
    locale: "en_US",
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default function ChokepointsIndex() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: TITLE,
    description: DESCRIPTION,
    itemListElement: CHOKEPOINTS.map((cp, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: cp.name.en,
      url: absoluteUrl(`/chokepoints/${cp.slug}`),
    })),
  };

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-5 py-14 text-white/80">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />

      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Maritime chokepoints
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-white/70">
          Five narrow places decide what the rest of the map costs. These are the only
          coordinates where the war and the money are the same coordinates.
        </p>
        <p className="mt-2 text-sm text-white/40">
          해상 초크포인트 — 전쟁과 돈이 같은 좌표에서 만나는 다섯 지점.
        </p>
      </header>

      <ul className="mt-12 space-y-4">
        {CHOKEPOINTS.map((cp) => (
          <li
            key={cp.slug}
            className="rounded-xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-white/25"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <Link
                href={`/chokepoints/${cp.slug}`}
                className="text-xl font-medium text-white underline-offset-4 hover:underline"
              >
                {cp.name.en}
              </Link>
              {cp.flow ? (
                <span className="text-sm tabular-nums text-white/50">
                  {cp.flow.oilMbd} M bbl/day
                </span>
              ) : (
                <span className="text-sm text-white/35">not oil-rated</span>
              )}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-white/60">{cp.summary.en}</p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/40">
              <Link
                href={`/chokepoints/${cp.slug}`}
                className="underline underline-offset-4 hover:text-white/70"
              >
                Read
              </Link>
              <Link
                href={chokepointSceneHref(cp)}
                className="underline underline-offset-4 hover:text-white/70"
              >
                Open on the globe →
              </Link>
            </div>
          </li>
        ))}
      </ul>

      <footer className="mt-14 border-t border-white/10 pt-6 text-xs leading-relaxed text-white/40">
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
          . Where the EIA publishes no figure, we leave it blank rather than estimate one.
        </p>
        <p className="mt-3">
          <Link href="/" className="underline underline-offset-4 hover:text-white/70">
            Open the globe →
          </Link>
        </p>
      </footer>
    </main>
  );
}
