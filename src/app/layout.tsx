import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { Inter, JetBrains_Mono, Merriweather } from "next/font/google";
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

/** Wanted Sans — jsDelivr 가변 동적 서브셋 (OFL) https://github.com/wanteddev/wanted-sans */
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

/** 모든 양피지 필체 — RIDI Batang */
const letterHand = localFont({
  src: "./fonts/RIDIBatang.otf",
  variable: "--font-letter-hand",
  display: "swap",
});

/** 지경학 nav — Pretendard Variable */
const pretendard = localFont({
  src: "./fonts/PretendardVariable.ttf",
  variable: "--font-pretendard",
  weight: "45 920",
  display: "swap",
});

/** 뉴스·속보 헤드라인 — Gmarket Sans */
const gmarket = localFont({
  src: [
    {
      path: "./fonts/GmarketSansLight.otf",
      weight: "300",
      style: "normal",
    },
    {
      path: "./fonts/GmarketSansMedium.otf",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/GmarketSansBold.otf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-gmarket",
  display: "swap",
});

/**
 * 영문 웹폰트 3역할
 * - Inter: UI·데이터 (메인)
 * - Merriweather: 양피지·긴 브리핑
 * - JetBrains Mono: 좌표·수치 터미널
 */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const merriweather = Merriweather({
  weight: ["400", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-merriweather",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

/** 전쟁구역 사상자 숫자 — SB 어그로 Bold */
const sbAgro = localFont({
  src: "./fonts/SBAgro-Bold.ttf",
  weight: "700",
  style: "normal",
  variable: "--font-sb-agro",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "멋진 신세계 — The war and the money, on one globe",
  description:
    "전쟁과 이익이 같은 지도를 공유하는 3D 지구본 관측대. A 3D globe that overlays live conflict data with the trade, shipping and energy routes it disrupts.",
  alternates: { canonical: absoluteUrl("/") },
  openGraph: {
    type: "website",
    siteName: "멋진 신세계 / Brave New World",
    title: "멋진 신세계 — The war and the money, on one globe",
    description:
      "지정학으로 축과 전선을, 지경학으로 돈과 물류를 보는 실시간 3D 지구본. Live conflict, shipping, energy and market layers on a single interactive globe.",
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
        alt: "Brave New World — a 3D globe overlaying war and trade",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "멋진 신세계 — The war and the money, on one globe",
    description:
      "Live conflict, shipping, energy and market layers on a single interactive 3D globe.",
    images: ["/brand/og-1200x630.png"],
  },
  icons: {
    icon: [{ url: "/brand/icon-512.png", sizes: "512x512", type: "image/png" }],
    apple: [{ url: "/brand/apple-icon-180.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "멋진 신세계",
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
        <link rel="preload" as="style" crossOrigin="anonymous" href={WANTED_SANS_CSS} />
        <link rel="stylesheet" href={WANTED_SANS_CSS} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${letterHand.variable} ${pretendard.variable} ${gmarket.variable} ${inter.variable} ${merriweather.variable} ${jetbrainsMono.variable} ${sbAgro.variable} antialiased`}
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
