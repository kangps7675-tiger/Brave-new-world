import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import localFont from "next/font/local";
import { COMPACT_QUERY } from "@/hooks/compactQuery";
import { DEVICE_BOOT_SCRIPT } from "@/hooks/deviceQueries";
import { PwaInstallPrompt } from "@/components/PwaInstallPrompt";
import { PushOptInBanner } from "@/components/PushOptInBanner";
import { ServiceWorkerBoot } from "@/components/ServiceWorkerBoot";
import { UiFontBoot } from "@/components/UiFontBoot";
import { GameShellGuard } from "@/components/GameShellGuard";
import { UI_FONT_BOOT_SCRIPT } from "@/lib/fontPrefs";
import { SITE_URL, absoluteUrl } from "@/lib/siteUrl";
import "./globals.css";

/** Wanted Sans — 상황실 본문·헤드라인. 글자 범위로 쪼갠 woff2라 화면이 쓰는 글자만 받는다. */
const WANTED_SANS_CSS =
  "https://cdn.jsdelivr.net/gh/wanteddev/wanted-sans@v1.0.3/packages/wanted-sans/fonts/webfonts/variable/split/WantedSansVariable.min.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

/**
 * 영문 웹폰트 3역할
 * - Inter: UI·데이터 (메인)
 * - Merriweather: 양피지·긴 브리핑
 * - JetBrains Mono: 좌표·수치 터미널
 * 세 폰트는 빌드 때 Google Fonts 를 받지 않도록 woff2(OFL, @fontsource-variable)를 저장소에 둔다 —
 * Cloudflare 빌드에서 구글 응답이 깨지면 next/font 가 빌드를 죽였다.
 */
const inter = localFont({
  src: "./fonts/Inter-latin-wght.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
  preload: false,
});

const merriweather = localFont({
  src: [
    { path: "./fonts/Merriweather-latin-wght.woff2", style: "normal", weight: "300 900" },
    { path: "./fonts/Merriweather-latin-wght-italic.woff2", style: "italic", weight: "300 900" },
  ],
  variable: "--font-merriweather",
  display: "swap",
  preload: false,
});

const jetbrainsMono = localFont({
  src: "./fonts/JetBrainsMono-latin-wght.woff2",
  variable: "--font-jetbrains-mono",
  weight: "100 800",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "conflict-view — Geopolitical alerts, with the evidence, on a globe",
  description:
    "지정학 속보를 출처와 확인 상태와 함께 지구본 위에서 보는 서비스. A 3D globe that pins geopolitical alerts to where they happen, each with its sources and a check status.",
  alternates: { canonical: absoluteUrl("/") },
  openGraph: {
    type: "website",
    siteName: "conflict-view",
    title: "conflict-view — Geopolitical alerts, with the evidence, on a globe",
    description:
      "전쟁·외교·선거 소식을 출처와 확인 상태와 함께. Conflict, diplomacy, and election alerts with their sources and a check status, on one globe.",
    url: "/",
    locale: "ko_KR",
    // 영어권이 1차 타깃이므로 대체 로케일을 명시한다.
    // (스크레이퍼가 ko_KR 하나만 보고 한국어 전용으로 분류하는 걸 막는다.)
    alternateLocale: ["en_US"],
    images: [
      {
        url: "/brand/og-1200x630.png",
        width: 1200,
        height: 630,
        alt: "conflict-view — a 3D globe of geopolitical alerts with evidence",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "conflict-view — Geopolitical alerts, with the evidence, on a globe",
    description:
      "Geopolitical alerts with their sources and check status, on a single interactive 3D globe.",
    images: ["/brand/og-1200x630.png"],
  },
  icons: {
    icon: [{ url: "/brand/icon-512.png", sizes: "512x512", type: "image/png" }],
    apple: [{ url: "/brand/apple-icon-180.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "conflict-view",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#02040a" },
    { media: "(prefers-color-scheme: light)", color: "#02040a" },
  ],
  colorScheme: "dark",
};

/** 하이드레이션 전 matchMedia → html[data-compact] (useCompactUi와 동일 쿼리) */
const COMPACT_BOOT_SCRIPT = `(function(){try{var q=${JSON.stringify(COMPACT_QUERY)};if(window.matchMedia(q).matches){document.documentElement.setAttribute("data-compact","1");}else{document.documentElement.setAttribute("data-compact","0");}}catch(e){document.documentElement.setAttribute("data-compact","0");}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning style={{ background: "#02040a" }}>
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link rel="stylesheet" href={WANTED_SANS_CSS} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${merriweather.variable} ${jetbrainsMono.variable} antialiased`}
        style={{
          background: "#02040a",
          minHeight: "100dvh",
        }}
      >
        <Script id="cv-compact-boot" strategy="beforeInteractive">
          {COMPACT_BOOT_SCRIPT}
        </Script>
        <Script id="cv-device-boot" strategy="beforeInteractive">
          {DEVICE_BOOT_SCRIPT}
        </Script>
        <Script id="cv-ui-font-boot" strategy="beforeInteractive">
          {UI_FONT_BOOT_SCRIPT}
        </Script>
        <UiFontBoot />
        <GameShellGuard />
        {children}
        <ServiceWorkerBoot />
        <PushOptInBanner />
        <PwaInstallPrompt />
        <Analytics />
      </body>
    </html>
  );
}
