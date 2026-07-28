import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { Inter, JetBrains_Mono, Merriweather } from "next/font/google";
import localFont from "next/font/local";
import { COMPACT_QUERY } from "@/hooks/compactQuery";
import { DEVICE_BOOT_SCRIPT } from "@/hooks/deviceQueries";
import { PwaInstallPrompt } from "@/components/PwaInstallPrompt";
import { UiFontBoot } from "@/components/UiFontBoot";
import { GameShellGuard } from "@/components/GameShellGuard";
import { UI_FONT_BOOT_SCRIPT } from "@/lib/fontPrefs";
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

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://confilct-view.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "멋진 신세계",
  description:
    "Aldous Huxley 《Brave New World》를 모티브로—전쟁과 이익이 같은 지도를 공유하는 3D 지구본 관측대",
  openGraph: {
    type: "website",
    siteName: "멋진 신세계",
    title: "멋진 신세계 — 3D 지구본 관측대",
    description:
      "전쟁과 이익이 같은 지도를 공유한다. 지정학으로 축과 전선을, 지경학으로 돈과 물류를 보는 실시간 3D 지구본.",
    url: "/",
    locale: "ko_KR",
    images: [
      {
        url: "/brand/og-1200x630.png",
        width: 1200,
        height: 630,
        alt: "멋진 신세계 — 전쟁과 이익이 같은 지도를 공유하는 3D 지구본 관측대",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "멋진 신세계 — 3D 지구본 관측대",
    description:
      "지정학으로 축과 전선을, 지경학으로 돈과 물류를 보는 실시간 3D 지구본.",
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
        <PwaInstallPrompt />
        <Analytics />
      </body>
    </html>
  );
}
